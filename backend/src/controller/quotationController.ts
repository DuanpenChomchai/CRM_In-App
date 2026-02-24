import { Response } from "express";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";

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
  const role = req.user!.role;
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
    const role = req.user!.role;
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
        customer: true,
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

    const totalAmount = computed.reduce((sum: any, x: { lineTotal: any; }) => sum + x.lineTotal, 0);

    // ทำเลขใบเสนอราคาแบบง่าย (ของจริงค่อยทำ generator)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const prefix = `QUE-${y}${m}${d}`;

    const countToday = await prisma.quotation.count({
      where: { quotationNumber: { startsWith: prefix } },
    });

    const quotationNumber = `${prefix}-${String(countToday + 1).padStart(3, "0")}`;

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

    const fontRegular = path.join(__dirname, "../assets/fonts/Sarabun-Regular.ttf");
    const fontBold = path.join(__dirname, "../assets/fonts/Sarabun-Bold.ttf");

    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Register Thai fonts
    doc.registerFont("Regular", fontRegular);
    doc.registerFont("Bold", fontBold);

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

    // Column widths
    const col = {
      no: 30,
      desc: W - 30 - 70 - 80 - 80 - 80,
      qty: 70,
      unit: 80,
      disc: 80,
      total: 80,
    };

    let cx = L;
    const thY = tableTop + 6;

    const th = (text: string, width: number, align: "left" | "right" | "center" = "left") => {
      doc.font("Bold").fontSize(9).fillColor(GRAY).text(text, cx + 4, thY, { width: width - 8, align });
      cx += width;
    };

    th("#", col.no, "center");
    th("รายการ", col.desc, "left");
    th("จำนวน", col.qty, "center");
    th("ราคา/หน่วย", col.unit, "right");
    th("ส่วนลด", col.disc, "right");
    th("ยอดรวม", col.total, "right");

    // Table rows
    let rowY = tableTop + 22;
    const fmt = (n: number) =>
      new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    q.items.forEach((it: any, idx: number) => {
      const bg = idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA";
      doc.rect(L, rowY, W, 22).fill(bg);

      const unitPrice = Number(it.unitPrice ?? 0);
      const qty = Number(it.quantity ?? 1);
      const disc = Number(it.discount ?? 0);
      const lineTotal = Number(it.lineTotal ?? unitPrice * qty * (1 - disc / 100));

      let rx = L;
      const td = (text: string, width: number, align: "left" | "right" | "center" = "left", bold = false) => {
        doc.font(bold ? "Bold" : "Regular").fontSize(9).fillColor(BLACK)
          .text(text, rx + 4, rowY + 6, { width: width - 8, align });
        rx += width;
      };

      td(String(idx + 1), col.no, "center");
      td(it.name ?? "-", col.desc, "left");
      td(String(qty), col.qty, "center");
      td(fmt(unitPrice), col.unit, "right");
      td(disc > 0 ? `${disc}%` : "-", col.disc, "right");
      td(fmt(lineTotal), col.total, "right", true);

      rowY += 22;
    });

    // Bottom border of table
    doc.moveTo(L, rowY).lineTo(R, rowY).strokeColor(DIVIDER).lineWidth(0.5).stroke();

    // ─── TOTALS ─────────────────────────────────────────────────────────────────
    rowY += 10;
    const totalAmount = Number(q.totalAmount ?? 0);

    const totalRow = (label: string, value: string, bold = false, color = BLACK) => {
      doc.font(bold ? "Bold" : "Regular").fontSize(10).fillColor(ORANGE)
        .text(label, L + W - 200, rowY, { width: 110, align: "right" });
      doc.font(bold ? "Bold" : "Regular").fontSize(10).fillColor(color)
        .text(value, L + W - 85, rowY, { width: 85, align: "right" });
      rowY += 18;
    };

    totalRow("ยอดรวม", `${fmt(totalAmount)} บาท`);
    totalRow("ยอดสุทธิ", `${fmt(totalAmount)} บาท`, true, ORANGE);

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
