import { Response } from "express";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";
import { randomUUID } from "crypto";
import s3Client, { BUCKET_NAME } from "../config/minioclient";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// กันพังเวลามี decimal/string
const toNumber = (v: any) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const canManagerEditCreator = async (managerId: number, creatorId: number) => {
  if (managerId === creatorId) return true;
  // team structure: user(manager) มี team[] โดย sale มี managerId ชี้มา
  const member = await prisma.user.findFirst({
    where: { id: creatorId, managerId },
    select: { id: true },
  });
  return !!member;
};

const assertCanAccessQuotation = async (req: AuthRequest, quotationId: number) => {
  const role = (req.user!.role || "GUEST").toUpperCase();
  const userId = req.user!.id;

  const q = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: true,
      customer: true,
      property: true,
      createdBy: { select: { id: true, name: true, role: true, managerId: true } },
      approvedBy: { select: { id: true, name: true, role: true } },
    },
  });

  if (!q) return { ok: false as const, status: 404, message: "ไม่พบใบเสนอราคา", quotation: null };

  if (role === "ADMIN") return { ok: true as const, quotation: q };

  if (role === "SALE") {
    if (q.createdById !== userId) {
      return { ok: false as const, status: 403, message: "Sale ดูได้เฉพาะใบเสนอราคาของตัวเอง", quotation: null };
    }
    return { ok: true as const, quotation: q };
  }

  if (role === "MANAGER") {
    const ok = await canManagerEditCreator(userId, q.createdById);
    if (!ok) {
      return { ok: false as const, status: 403, message: "Manager ดูได้เฉพาะของตัวเอง/ของทีม", quotation: null };
    }
    return { ok: true as const, quotation: q };
  }

  return { ok: false as const, status: 403, message: "ไม่มีสิทธิ์เข้าถึง", quotation: null };
};

/** GET /api/quotations */
export const listQuotations = async (req: AuthRequest, res: Response) => {
  try {
    const role = (req.user!.role || "GUEST").toUpperCase();
    const userId = req.user!.id;

    const where: any = {};

    if (role === "SALE") {
      where.createdById = userId;
    } else if (role === "MANAGER") {
      // manager: ของตัวเอง + ของทีม
      where.OR = [{ createdById: userId }, { createdBy: { managerId: userId } }];
    } else if (role === "ADMIN") {
      // เห็นหมด
    } else {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ใช้งาน" });
    }

    const items = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true, tol: true, mainStatus: true } },
        property: true,
        items: true,
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.json(items);
  } catch (err) {
    console.error("listQuotations error:", err);
    return res.status(500).json({ message: "ดึงรายการใบเสนอราคาล้มเหลว" });
  }
};

/** GET /api/quotations/:id */
export const getQuotationById = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    return res.json(access.quotation);
  } catch (err) {
    console.error("getQuotationById error:", err);
    return res.status(500).json({ message: "ดึงใบเสนอราคาล้มเหลว" });
  }
};

/** POST /api/quotations  (Sale/Manager/Admin) */
export const createQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const body: any = req.body || {};
    const customerId = Number(body.customerId);
    const propertyId = body.propertyId ? Number(body.propertyId) : undefined;
    const terms = body.terms ?? null;
    const note = body.note ?? null;

    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerId) {
      return res.status(400).json({ message: "กรุณาส่ง customerId" });
    }
    if (!items.length) {
      return res.status(400).json({ message: "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ" });
    }

    // ✅ ล็อค: ถ้าลูกค้าปิดดีลไปแล้ว ห้ามสร้างใบเสนอราคาใหม่ในรอบที่ยังไม่ได้ repeat
    const customerCheck = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { mainStatus: true },
    });
    if (customerCheck?.mainStatus === "CLOSED") {
      return res.status(403).json({ message: "ลูกค้านี้ปิดดีลแล้ว ไม่สามารถสร้างใบเสนอราคาได้ กรุณากดซื้อซ้ำก่อน" });
    }

    // ✅ เช็ค maxDiscount ของ Sale คนนี้
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { maxDiscount: true, role: true },
    });
    const maxDiscount = creator?.maxDiscount ? Number(creator.maxDiscount) : null;

    // คำนวณ lineTotal + total
    const computed = items.map((it: any) => {
      const qty = Math.max(1, Number(it.quantity ?? 1));
      const unitPrice = toNumber(it.unitPrice ?? it.price);
      const discount = toNumber(it.discount ?? 0); // %
      const lineTotal = unitPrice * qty * (1 - discount / 100);
      return {
        name: String(it.name ?? it.productName ?? "").trim(),
        quantity: qty,
        unitPrice,
        discount,
        lineTotal,
      };
    });

    if (computed.some((x: { name: any; }) => !x.name)) {
      return res.status(400).json({ message: "ชื่อสินค้าในรายการห้ามว่าง" });
    }

    // u2705 เช็ค maxDiscount u2014 ถ้า Sale มีการกำหนดเพดานส่วนลด
    if (maxDiscount !== null) {
      const overLimit = computed.find((x: any) => x.discount > maxDiscount);
      if (overLimit) {
        return res.status(403).json({ message: `ส่วนลดเกินที่ได้รับอนุญาต สูงสุดที่ใช้ได้คือ ${maxDiscount}%` });
      }
    }


    const totalAmount = computed.reduce((sum: any, x: { lineTotal: any; }) => sum + x.lineTotal, 0);

    // ทำเลขใบเสนอราคาแบบง่าย (ของจริงค่อยทำ generator)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `QUE-${y}${m}${d}`;

    // หาลำดับใบเสนอราคาล่าสุดของวันนี้ โดยดึงตัวที่มีเลขท้ายสุดมาบวกหนึ่ง
    const latestQuotationToday = await prisma.quotation.findFirst({
      where: { quotationNumber: { startsWith: prefix } },
      orderBy: { quotationNumber: 'desc' },
    });

    let nextSeq = 1;
    if (latestQuotationToday) {
      const parts = latestQuotationToday.quotationNumber.split("-");
      const lastPart = parts[parts.length - 1];
      const currentSeq = parseInt(lastPart, 10);
      if (!isNaN(currentSeq)) {
        nextSeq = currentSeq + 1;
      }
    }

    const quotationNumber = `${prefix}-${String(nextSeq).padStart(3, "0")}`;

    const created = await prisma.quotation.create({
      data: {
        quotationNumber,
        status: "DRAFT",
        terms,
        note,
        totalAmount: totalAmount as any,
        customerId,
        ...(propertyId ? { propertyId } : {}),
        createdById: userId,
        items: { create: computed as any },
      } as any,
      include: {
        customer: true,
        property: true,
        items: true,
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createQuotation error:", err);
    return res.status(500).json({ message: "สร้างใบเสนอราคาล้มเหลว" });
  }
};

/** PATCH /api/quotations/:id (Sale/Manager/Admin) */
export const updateQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const role = req.user!.role;
    const userId = req.user!.id;

    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const quotation = access.quotation!;

    // ✅ ล็อค: ถ้าลูกค้าปิดดีลแล้ว ห้ามแก้ใบเสนอราคา
    const customerCheck = await prisma.customer.findUnique({
      where: { id: quotation.customerId },
      select: { mainStatus: true },
    });
    if (customerCheck?.mainStatus === "CLOSED") {
      return res.status(403).json({ message: "ลูกค้านี้ปิดดีลแล้ว ไม่สามารถแก้ไขใบเสนอราคาได้" });
    }

    // Rule การแก้ตาม role
    if (role === "SALE") {
      if (quotation.createdById !== userId) {
        return res.status(403).json({ message: "Sale แก้ได้เฉพาะใบเสนอราคาของตัวเอง" });
      }
      if (!["DRAFT", "REJECTED"].includes(quotation.status)) {
        return res.status(403).json({ message: "Sale แก้ได้เฉพาะสถานะ DRAFT หรือ REJECTED" });
      }
    }

    if (role === "MANAGER") {
      const ok = await canManagerEditCreator(userId, quotation.createdById);
      if (!ok) return res.status(403).json({ message: "Manager แก้ได้เฉพาะของตัวเอง/ของทีม" });
    }

    // ADMIN แก้ได้ทุกสถานะ

    const body: any = req.body || {};
    const data: any = {};

    if (body.terms !== undefined) data.terms = body.terms ?? null;
    if (body.note !== undefined) data.note = body.note ?? null;
    if (body.status !== undefined) data.status = body.status; // ถ้าจะให้ส่งแล้ว/รออนุมัติ ก็ทำที่ FE ส่งมา

    // อัปเดตรายการสินค้า (ถ้าส่ง items มาให้ replace ทั้งชุด)
    let itemsReplace = false;
    let computedItems: any[] = [];
    if (Array.isArray(body.items)) {
      itemsReplace = true;
      computedItems = body.items.map((it: any) => {
        const qty = Math.max(1, Number(it.quantity ?? 1));
        const unitPrice = toNumber(it.unitPrice ?? it.price);
        const discount = toNumber(it.discount ?? 0);
        const lineTotal = unitPrice * qty * (1 - discount / 100);
        return {
          name: String(it.name ?? it.productName ?? "").trim(),
          quantity: qty,
          unitPrice,
          discount,
          lineTotal,
        };
      });

      if (computedItems.some((x) => !x.name)) {
        return res.status(400).json({ message: "ชื่อสินค้าในรายการห้ามว่าง" });
      }

      // ✅ เช็ค maxDiscount ของ Sale
      if (role === "SALE") {
        const creator = await prisma.user.findUnique({
          where: { id: userId },
          select: { maxDiscount: true },
        });
        const maxDiscount = creator?.maxDiscount ? Number(creator.maxDiscount) : null;
        if (maxDiscount !== null) {
          const overLimit = computedItems.find((x) => x.discount > maxDiscount);
          if (overLimit) {
            return res.status(403).json({ message: `ส่วนลดเกินที่ได้รับอนุญาต สูงสุดที่ใช้ได้คือ ${maxDiscount}%` });
          }
        }
      }

      const totalAmount = computedItems.reduce((sum, x) => sum + x.lineTotal, 0);
      data.totalAmount = totalAmount as any;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (itemsReplace) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      }

      const q = await tx.quotation.update({
        where: { id },
        data: {
          ...data,
          ...(itemsReplace ? { items: { create: computedItems as any } } : {}),
        },
        include: {
          customer: true,
          property: true,
          items: true,
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
      });

      return q;
    });

    return res.json(updated);
  } catch (err) {
    console.error("updateQuotation error:", err);
    return res.status(500).json({ message: "แก้ไขใบเสนอราคาล้มเหลว" });
  }
};

/** POST /api/quotations/:id/approve (Manager/Admin) */
export const approveQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const role = req.user!.role;
    const userId = req.user!.id;

    if (!["MANAGER", "ADMIN"].includes(role)) {
      return res.status(403).json({ message: "มีสิทธิ์เฉพาะ Manager/Admin" });
    }

    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    // manager ต้องเป็น owner/team เท่านั้น
    if (role === "MANAGER") {
      const ok = await canManagerEditCreator(userId, access.quotation!.createdById);
      if (!ok) return res.status(403).json({ message: "Manager อนุมัติได้เฉพาะของตัวเอง/ของทีม" });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: {
        customer: true,
        property: true,
        items: true,
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error("approveQuotation error:", err);
    return res.status(500).json({ message: "อนุมัติใบเสนอราคาล้มเหลว" });
  }
};

/** GET /api/quotations/:id/pdf (Sale/Manager/Admin) */
export const generateQuotationPDF = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require("pdfkit");
    const path = require("path");
    const fs = require("fs");

    // หา font path รองรับทั้ง dev (src/) และ production (dist/ + src/assets copy)
    const possibleRoots = [
      path.join(__dirname, "../assets/fonts"),          // dev: src/controller → src/assets/fonts
      path.join(__dirname, "../../src/assets/fonts"),   // production: dist/controller → src/assets/fonts
      path.join(process.cwd(), "src/assets/fonts"),     // fallback จาก working dir
    ];

    let fontsDir = possibleRoots.find((p) => fs.existsSync(path.join(p, "Sarabun-Regular.ttf")));
    const fontRegular = fontsDir ? path.join(fontsDir, "Sarabun-Regular.ttf") : null;
    const fontBold    = fontsDir ? path.join(fontsDir, "Sarabun-Bold.ttf")    : null;

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Register Thai fonts (ถ้ามี) หรือใช้ default
    if (fontRegular && fontBold) {
      doc.registerFont("Regular", fontRegular);
      doc.registerFont("Bold", fontBold);
    } else {
      console.warn("[PDF] Thai fonts not found, falling back to Helvetica");
      doc.registerFont("Regular", "Helvetica");
      doc.registerFont("Bold", "Helvetica-Bold");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quotation-${access.quotation!.quotationNumber}.pdf"`
    );
    doc.pipe(res);

    const q = access.quotation!;
    const W = doc.page.width - 100; // usable width (margin 50 each side)
    const L = 50;                   // left margin
    const R = L + W;                // right edge

    const ORANGE = "#C8860A";
    const GRAY = "#666666";
    const BLACK = "#1A1A1A";
    const DIVIDER = "#DDDDDD";

    // ─── HEADER ────────────────────────────────────────────────────────────────
    // Left: Company name
    doc.font("Bold").fontSize(22).fillColor(ORANGE).text("CRM SYSTEM", L, 50);
    doc.font("Regular").fontSize(10).fillColor(GRAY).text("ระบบจัดการลูกค้าสัมพันธ์", L, 76);

    // Right: Title "ใบเสนอราคา"
    doc.font("Bold").fontSize(20).fillColor(ORANGE).text("ใบเสนอราคา", L, 50, { align: "right", width: W });

    // Divider line
    doc.moveTo(L, 100).lineTo(R, 100).strokeColor(DIVIDER).lineWidth(1).stroke();

    // ─── QUOTATION META (right column) ─────────────────────────────────────────
    const metaX = L + W * 0.55;
    const metaLabelW = 90;
    let metaY = 112;

    const metaRow = (label: string, value: string) => {
      doc.font("Regular").fontSize(10).fillColor(ORANGE).text(label, metaX, metaY, { width: metaLabelW });
      doc.font("Regular").fontSize(10).fillColor(BLACK).text(value, metaX + metaLabelW, metaY, { width: W - W * 0.55 - metaLabelW });
      metaY += 16;
    };

    const dateStr = new Date(q.createdAt).toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });

    metaRow("เลขที่เอกสาร", q.quotationNumber);
    metaRow("วันที่", dateStr);
    metaRow("สถานะ", q.status);
    if (q.createdBy?.name) metaRow("ผู้จัดทำ", q.createdBy.name);

    // ─── CLIENT SECTION (left column) ──────────────────────────────────────────
    let clientY = 112;
    doc.font("Bold").fontSize(10).fillColor(ORANGE).text("ลูกค้า", L, clientY);
    clientY += 16;

    const c = q.customer;
    if (c?.name) { doc.font("Regular").fontSize(10).fillColor(BLACK).text(c.name, L, clientY); clientY += 14; }
    if (c?.email) { doc.font("Regular").fontSize(10).fillColor(GRAY).text(c.email, L, clientY); clientY += 14; }
    const cPhone = (c as any)?.tel ?? (c as any)?.tol ?? null;
    if (cPhone) { doc.font("Regular").fontSize(10).fillColor(GRAY).text(`โทร: ${cPhone}`, L, clientY); clientY += 14; }

    // ─── TABLE ─────────────────────────────────────────────────────────────────
    const tableTop = Math.max(metaY, clientY) + 20;

    // Table header background
    doc.rect(L, tableTop, W, 22).fill("#F5F5F5");

    // Column widths — เพิ่มคอลัมน์ ยอดรวม / ส่วนลด(บาท) / ยอดสุทธิ
    const col = {
      no:       28,
      desc:     W - 28 - 55 - 90 - 70 - 90 - 90,
      qty:      55,
      unit:     90,
      discPct:  70,  // ส่วนลด %
      discAmt:  90,  // มูลค่าส่วนลด (บาท)
      net:      90,  // ยอดสุทธิ
    };

    let cx = L;
    const thY = tableTop + 6;

    const th = (text: string, width: number, align: "left" | "right" | "center" = "left") => {
      doc.font("Bold").fontSize(8).fillColor(GRAY).text(text, cx + 3, thY, { width: width - 6, align });
      cx += width;
    };

    th("#",           col.no,      "center");
    th("รายการ",      col.desc,    "left");
    th("จำนวน",       col.qty,     "center");
    th("ราคา/หน่วย",  col.unit,    "right");
    th("ส่วนลด %",    col.discPct, "right");
    th("มูลค่าส่วนลด",col.discAmt, "right");
    th("ยอดสุทธิ",    col.net,     "right");

    // Table rows
    let rowY = tableTop + 22;
    const fmt = (n: number) =>
      new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    let grandSubtotal = 0;  // ราคาเต็มรวม
    let grandDiscount = 0;  // ส่วนลดรวม
    let grandNet      = 0;  // ยอดสุทธิรวม

    q.items.forEach((it: any, idx: number) => {
      const bg = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
      doc.rect(L, rowY, W, 22).fill(bg);

      const unitPrice = Number(it.unitPrice ?? 0);
      const qty       = Number(it.quantity ?? 1);
      const discPct   = Number(it.discount ?? 0);
      const subtotal  = unitPrice * qty;                        // ราคาเต็ม
      const discAmt   = subtotal * discPct / 100;               // มูลค่าส่วนลด
      const net       = Number(it.lineTotal ?? subtotal - discAmt); // ยอดสุทธิ

      grandSubtotal += subtotal;
      grandDiscount += discAmt;
      grandNet      += net;

      let rx = L;
      const td = (text: string, width: number, align: "left" | "right" | "center" = "left", bold = false, color = BLACK) => {
        doc.font(bold ? "Bold" : "Regular").fontSize(8).fillColor(color)
          .text(text, rx + 3, rowY + 6, { width: width - 6, align });
        rx += width;
      };

      td(String(idx + 1),                   col.no,      "center");
      td(it.name ?? "-",                    col.desc,    "left");
      td(String(qty),                       col.qty,     "center");
      td(fmt(unitPrice),                    col.unit,    "right");
      td(discPct > 0 ? `${discPct}%` : "-",col.discPct, "right");
      td(discAmt > 0 ? fmt(discAmt) : "-",  col.discAmt, "right", false, "#CC3333");
      td(fmt(net),                          col.net,     "right", true);

      rowY += 22;
    });

    // Bottom border of table
    doc.moveTo(L, rowY).lineTo(R, rowY).strokeColor(DIVIDER).lineWidth(0.5).stroke();

    // ─── TOTALS ─────────────────────────────────────────────────────────────────
    rowY += 10;
    const totalAmount = Number(q.totalAmount ?? grandNet);

    const totalRow = (label: string, value: string, bold = false, color = BLACK) => {
      doc.font(bold ? "Bold" : "Regular").fontSize(10).fillColor(ORANGE)
        .text(label, L + W - 210, rowY, { width: 120, align: "right" });
      doc.font(bold ? "Bold" : "Regular").fontSize(10).fillColor(color)
        .text(value, L + W - 85, rowY, { width: 85, align: "right" });
      rowY += 18;
    };

    totalRow("ยอดรวม",      `${fmt(grandSubtotal)} บาท`);
    totalRow("ส่วนลด",      `- ${fmt(grandDiscount)} บาท`, false, "#CC3333");
    totalRow("ยอดสุทธิ",    `${fmt(totalAmount)} บาท`, true, ORANGE);

    // ─── TERMS / NOTE ───────────────────────────────────────────────────────────
    if (q.terms || q.note) {
      rowY += 10;
      doc.moveTo(L, rowY).lineTo(R, rowY).strokeColor(DIVIDER).lineWidth(0.5).stroke();
      rowY += 10;
    }
    if (q.terms) {
      doc.font("Bold").fontSize(10).fillColor(GRAY).text("เงื่อนไข:", L, rowY);
      rowY += 14;
      doc.font("Regular").fontSize(10).fillColor(BLACK).text(q.terms, L, rowY, { width: W });
      rowY += doc.heightOfString(q.terms, { width: W }) + 8;
    }
    if (q.note) {
      doc.font("Bold").fontSize(10).fillColor(GRAY).text("หมายเหตุ:", L, rowY);
      rowY += 14;
      doc.font("Regular").fontSize(10).fillColor(BLACK).text(q.note, L, rowY, { width: W });
    }

    // ─── APPROVED ───────────────────────────────────────────────────────────────
    if (q.approvedById) {
      doc.moveDown();
      doc.font("Regular").fontSize(10).fillColor(GRAY)
        .text(`อนุมัติโดย: ${q.approvedBy?.name ?? q.approvedById}  |  วันที่: ${q.approvedAt ? new Date(q.approvedAt).toLocaleDateString("th-TH") : "-"}`, { align: "center" });
    }

    doc.end();
  } catch (err) {
    console.error("generateQuotationPDF error:", err);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้าง PDF" });
  }
};

/** DELETE /api/quotations/:id */
export const deleteQuotation = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    // ตรวจสิทธิ์เพิ่มเติม: Sale ลบได้เฉพาะของตัวเอง (ซึ่ง assertCanAccessQuotation เช็คให้แล้วว่าถ้าเป็น Sale ต้องเป็นเจ้าของ)
    // Manager/Admin ลบได้ตามขอบเขต (ซึ่ง assertCanAccessQuotation เช็คให้แล้ว)

    await prisma.quotation.delete({
      where: { id },
    });

    return res.json({ message: "ลบใบเสนอราคาเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("deleteQuotation error:", err);
    return res.status(500).json({ message: "ลบใบเสนอราคาล้มเหลว" });
  }
};

/** POST /api/quotations/:id/files */
export const uploadQuotationFile = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "ไม่พบไฟล์" });

    const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
    const key = `quotations/${id}/${randomUUID()}.${ext}`;

    // ✅ decode originalname เผื่อ multer encode มาแล้ว แล้ว normalize เป็น UTF-8
    let safeOriginalName = file.originalname;
    try {
      // multer บางครั้ง encode ชื่อมาเป็น latin1 ต้อง decode กลับ
      safeOriginalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    } catch {
      safeOriginalName = file.originalname;
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME as string,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const saved = await (prisma as any).quotationFile.create({
      data: {
        quotationId: id,
        fileName: safeOriginalName, // ✅ ชื่อภาษาไทยถูกต้อง
        fileKey: key,
        fileMime: file.mimetype,
        fileSize: file.size,
      },
    });

    return res.status(201).json(saved);
  } catch (err) {
    console.error("uploadQuotationFile error:", err);
    return res.status(500).json({ message: "อัปโหลดไฟล์ไม่สำเร็จ" });
  }
};

/** DELETE /api/quotations/:id/files/:fileId */
export const deleteQuotationFile = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const fileId = Number(req.params.fileId);

    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const file = await (prisma as any).quotationFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: "ไม่พบไฟล์" });

    await s3Client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME as string, Key: file.fileKey }),
    );
    await (prisma as any).quotationFile.delete({ where: { id: fileId } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteQuotationFile error:", err);
    return res.status(500).json({ message: "ลบไฟล์ไม่สำเร็จ" });
  }
};

/** GET /api/quotations/:id/files/:fileId/download */
export const downloadQuotationFile = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const fileId = Number(req.params.fileId);

    const access = await assertCanAccessQuotation(req, id);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const file = await (prisma as any).quotationFile.findUnique({ where: { id: fileId } });
    if (!file) return res.status(404).json({ message: "ไม่พบไฟล์" });

    const obj = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME as string, Key: file.fileKey }),
    );

    res.setHeader("Content-Type", file.fileMime || "application/octet-stream");
    // ✅ RFC 5987 — รองรับชื่อไฟล์ภาษาไทย/ภาษาอังกฤษ/อักขระพิเศษทุกชนิด
    const encodedName = encodeURIComponent(file.fileName).replace(/'/g, "%27");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.fileName.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodedName}`,
    );
    (obj.Body as any).pipe(res);
  } catch (err) {
    console.error("downloadQuotationFile error:", err);
    return res.status(500).json({ message: "ดาวน์โหลดไฟล์ไม่สำเร็จ" });
  }
};