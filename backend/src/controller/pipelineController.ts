import { Response } from "express";
import prisma from "../config/prismaclient";
import { AuthRequest } from "../middlewares/authMiddleware";

type PipelineStatus = "CONTACTED" | "NEGOTIATING" | "QUOTATION" | "CLOSED";

const toPipelineKey = (mainStatus: string): PipelineStatus | null => {
  // ✅ NEW โยนไป CONTACTED
  if (mainStatus === "NEW" || mainStatus === "CONTACTED") return "CONTACTED";
  if (mainStatus === "NEGOTIATING") return "NEGOTIATING";
  if (mainStatus === "QUOTATION") return "QUOTATION";
  if (mainStatus === "CLOSED") return "CLOSED";
  return null;
};


/**
 * GET /api/pipeline/board
 * - ดึงข้อมูล pipeline แบบแยกคอลัมน์ + count
 * - Source of truth = Customer.mainStatus
 */
export const getPipelineBoard = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const roleUpper = (me.role || "").toUpperCase();

    const whereBase: any = {};
    if (roleUpper === "SALE") {
      whereBase.saleId = me.id;
    } else if (roleUpper === "MANAGER") {
      whereBase.sale = { managerId: me.id };
    }

    // คอลัมน์ที่แสดงบน Pipeline (ตาม UI ของคุณ)
    const statuses = ["NEW", "CONTACTED", "NEGOTIATING", "QUOTATION", "CLOSED"] as const;


    const [customers, counts] = await Promise.all([
      prisma.customer.findMany({
        where: {
          ...whereBase,
          mainStatus: { in: statuses as any },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          sale: { select: { id: true, name: true } },

          // ✅ ถ้า schema มี relation นี้จริง จะผ่าน
          // ถ้าไม่มี ให้ลบ block นี้ออก
          interestedProperty: { select: { id: true, name: true, type: true } } as any,

          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              totalAmount: true,
              terms: true,
              endDate: true,
              status: true,
              createdAt: true,
              files: {
                select: { id: true, fileName: true, fileKey: true, fileMime: true, fileSize: true, uploadedAt: true },
                orderBy: { uploadedAt: "desc" },
              },
            },
            orderBy: { createdAt: "desc" },
            // ✅ ไม่จำกัด take เพื่อให้ card ซื้อซ้ำเห็นประวัติ quotation ครบทุกรอบ
          },

          negotiations: {
            select: { id: true, status: true, stateDate: true, endDate: true, note: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },

          closedDeals: {
            select: {
              id: true,
              result: true,
              finalValue: true,
              closingDate: true,
              createdAt: true,
            } as any,
            orderBy: { createdAt: "desc" },
            take: 50,
          },



          // ✅ schema ใหม่: ใช้ contactedLogs เท่านั้น (เป็น array)
          contactedLogs: {
            select: { id: true, status: true, stateDate: true, endDate: true, note: true, createdAt: true } as any,
            orderBy: { createdAt: "desc" },
            take: 1,
          } as any,

          // ✅ นับจำนวน closedDeals เพื่อให้ frontend รู้ว่าลูกค้าเคยซื้อกี่รอบ (purchaseCount)
          _count: {
            select: { closedDeals: true } as any,
          } as any,
        },
      }),

      prisma.customer.groupBy({
        by: ["mainStatus"],
        where: {
          ...whereBase,
          mainStatus: { in: statuses as any },
        },
        _count: { _all: true },
      }),
    ]);

    const countMap: Record<PipelineStatus, number> = {
      CONTACTED: 0,
      NEGOTIATING: 0,
      QUOTATION: 0,
      CLOSED: 0,
    };

    let totalClosedCount = 0;

    for (const c of counts) {
      const key = String(c.mainStatus) as PipelineStatus;
      if (countMap[key] !== undefined && key !== "CLOSED") {
        countMap[key] = c._count._all;
      }
    }

    const columns: Record<PipelineStatus, any[]> = {
      CONTACTED: [],
      NEGOTIATING: [],
      QUOTATION: [],
      CLOSED: [],
    };

    for (const _c of customers) {
      const c = _c as any;
      const isCurrentlyClosed = c.mainStatus === "CLOSED";
      const key = toPipelineKey(String(c.mainStatus));

      // 1. นำเข้าสเตจปัจจุบัน (ถ้าไม่ใช่ CLOSED)
      if (key && !isCurrentlyClosed) {
        columns[key].push(c);
      }

      // 2. นำลูกค้าไปไว้ใน CLOSED ทีละการ์ดตามจำนวนประวัติ closedDeals ที่มี
      const hasClosedDeals = c.closedDeals && c.closedDeals.length > 0;
      
      if (hasClosedDeals) {
        // เอาประวัติแต่ละรอบไปสร้างการ์ดใน CLOSED แยกกัน
        c.closedDeals.forEach((cd: any, index: number) => {
          // ถ้าปัจจุบันลูกค้าอยู่สเตจ CLOSED ดีลล่าสุด (index=0) คือดีลรอบปัจจุบันนี้เอง
          const isHistorical = !(isCurrentlyClosed && index === 0);
          
          // ✅ ส่ง quotations ทั้งหมดเพื่อให้ historical card เห็นข้อมูลสินค้าของรอบก่อน
          const quotationsForCard = c.quotations ?? [];
          
          columns.CLOSED.push({
            ...c,
            // ID ปลอมเพื่อให้หน้าบ้านมองเห็นเป็นคนละการ์ด
            dummyId: isHistorical ? `history_${c.id}_${cd.id}` : c.id,
            closedDeals: [cd], // ส่งไปแค่อันเดียวให้ Frontend รู้ว่าการ์ดนี้คือดีลนี้
            quotations: quotationsForCard, // ✅ ส่ง quotations ทั้งหมดเพื่อแสดงข้อมูลสินค้า
            isHistorical, // flag แจ้ง Frontend
            roundNumber: c.closedDeals.length - index, // ลำดับครั้งที่ซื้อ
          });
          
          if (cd.result === "WON" || cd.result === "LOST") {
            totalClosedCount++;
          }
        });
      } else if (isCurrentlyClosed) {
        // กรณีเพิ่งลากเข้า CLOSED แต่ยังสร้าง closedDeal ไม่เสร็จ (เผื่อมีจังหวะ delay)
        columns.CLOSED.push({
          ...c,
          dummyId: c.id,
          isHistorical: false,
          roundNumber: c.closedDeals ? c.closedDeals.length + 1 : 1,
        });
        totalClosedCount++;
      }
    }
    
    countMap.CLOSED = totalClosedCount;



    return res.json({ counts: countMap, columns });
  } catch (err) {
    console.error("getPipelineBoard error:", err);
    return res.status(500).json({ message: "Load pipeline board failed" });
  }
};

/**
 * PATCH /api/pipeline/move
 * body:
 * {
 *   customerId: number,
 *   toStatus: "CONTACTED" | "NEGOTIATING" | "QUOTATION" | "CLOSED",
 *   note?: string,
 *   contactedStatus?: ContactedStatus,
 *   negotiationStatus?: NegotiationStatus,
 *   closedResult?: DealResult
 * }
 */
export const moveCustomerStage = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const { customerId, toStatus, note, contactedStatus, negotiationStatus, closedResult } = req.body;

    const id = Number(customerId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });
    }

    const allowed: PipelineStatus[] = ["CONTACTED", "NEGOTIATING", "QUOTATION", "CLOSED"];
    if (!allowed.includes(toStatus)) {
      return res.status(400).json({ message: "toStatus ไม่ถูกต้อง" });
    }

    // SALE ทำได้เฉพาะลูกค้าของตัวเอง
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { saleId: true, mainStatus: true },
    });

    if (!currentCustomer) {
      return res.status(404).json({ message: "ไม่พบลูกค้า" });
    }

    if (me.role === "SALE") {
      if (currentCustomer.saleId !== me.id) {
        return res.status(403).json({ message: "ไม่มีสิทธิ์" });
      }
    }

    // ✅ ย้ายได้เฉพาะไปข้างหน้า (หรืออยู่สเตจเดิมเพื่อบันทึกข้อมูล)
    const stageOrder: PipelineStatus[] = ["CONTACTED", "NEGOTIATING", "QUOTATION", "CLOSED"];
    const currentStatus = currentCustomer.mainStatus === "NEW" ? "CONTACTED" : currentCustomer.mainStatus;
    const fromIdx = stageOrder.indexOf(currentStatus as PipelineStatus);
    const toIdx = stageOrder.indexOf(toStatus);
    if (toIdx < fromIdx) {
      return res.status(400).json({ message: "ไม่สามารถย้ายย้อนกลับได้ ย้ายไปข้างหน้าหรืออัปเดตสเตจเดิมเท่านั้น" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: { mainStatus: toStatus },
      });

      // เขียนรายละเอียด stage แบบ “เสริม” (ใช้โชว์ badge/history)
      const isSameStage = currentCustomer.mainStatus === toStatus;

      if (toStatus === "CONTACTED") {
        const validContactedStatuses = ["FOLLOWING_UP", "WAITING_REPLY", "APPOINTED", "NOT_INTERESTED"];
        const safeContactedStatus = validContactedStatuses.includes(contactedStatus) ? contactedStatus : "FOLLOWING_UP";
        const existing = isSameStage ? await (tx as any).contacted.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }) : null;
        if (existing) {
          await (tx as any).contacted.update({
            where: { id: existing.id },
            data: {
              status: validContactedStatuses.includes(contactedStatus) ? contactedStatus : existing.status,
              note: note !== undefined ? note : existing.note,
              endDate: req.body.endDate ? new Date(req.body.endDate) : existing.endDate,
            },
          });
        } else {
          await (tx as any).contacted.create({
            data: {
              customerId: id,
              status: safeContactedStatus,
              note: note || null,
              endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            },
          });
        }
      }

      if (toStatus === "NEGOTIATING") {
        const validNegotiationStatuses = ["NEGOTIATING", "WAITING_CONFIRM", "COUNTER_OFFER", "PAUSED"];
        const safeNegotiationStatus = validNegotiationStatuses.includes(negotiationStatus) ? negotiationStatus : "NEGOTIATING";
        const existing = isSameStage ? await (tx as any).negotiation.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }) : null;
        if (existing) {
          await (tx as any).negotiation.update({
            where: { id: existing.id },
            data: {
              status: validNegotiationStatuses.includes(negotiationStatus) ? negotiationStatus : existing.status,
              note: note !== undefined ? note : existing.note,
              endDate: req.body.endDate ? new Date(req.body.endDate) : existing.endDate,
            },
          });
        } else {
          await (tx as any).negotiation.create({
            data: {
              customerId: id,
              status: safeNegotiationStatus,
              note: note || null,
              endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            },
          });
        }
      }

      if (toStatus === "QUOTATION") {
        const { quotationPrice, terms, endDate } = req.body;

        const existing = isSameStage
          ? await (tx as any).quotation.findFirst({
              where: { customerId: id },
              orderBy: { createdAt: "desc" },
            })
          : null;

        if (existing) {
          await (tx as any).quotation.update({
            where: { id: existing.id },
            data: {
              totalAmount:
                quotationPrice !== undefined
                  ? Number(quotationPrice)
                  : existing.totalAmount,
              terms: terms !== undefined ? terms : existing.terms,
              endDate: endDate ? new Date(endDate) : existing.endDate,
              note: note !== undefined ? note : existing.note,
            },
          });
        } else {
          const cust = await (tx as any).customer.findUnique({
            where: { id },
            select: { interestedPropertyId: true },
          });

          const now = new Date();
          const y = now.getFullYear();
          const mo = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          const prefix = `QUE-${y}${mo}${d}`;
          const countToday = await (tx as any).quotation.count({
            where: { quotationNumber: { startsWith: prefix } },
          });
          const quotationNumber = `${prefix}-${String(countToday + 1).padStart(3, "0")}`;

          if (cust?.interestedPropertyId) {
            await (tx as any).quotation.create({
              data: {
                quotationNumber,
                customerId: id,
                propertyId: cust.interestedPropertyId,
                createdById: me.id,
                totalAmount: Number(quotationPrice) || 0,
                terms: terms || null,
                endDate: endDate ? new Date(endDate) : null,
                note: note || null,
                status: "DRAFT",
              },
            });
          } else {
            // ถ้าไม่มี interestedProperty ให้หา property แรกที่มีใน DB มาใช้แทน
            const firstProperty = await (tx as any).property.findFirst({
              select: { id: true },
            });
            if (firstProperty) {
              await (tx as any).quotation.create({
                data: {
                  quotationNumber,
                  customerId: id,
                  propertyId: firstProperty.id,
                  createdById: me.id,
                  totalAmount: Number(quotationPrice) || 0,
                  terms: terms || null,
                  endDate: endDate ? new Date(endDate) : null,
                  note: note || null,
                  status: "DRAFT",
                },
              });
            }
          }
        }
      }

      if (toStatus === "CLOSED") {
        const validDealResults = ["WON", "LOST"];
        const safeResult = validDealResults.includes(closedResult) ? closedResult : "WON";
        // ป้องกัน numeric overflow — Decimal(12,2) รับสูงสุด 9,999,999,999.99
        const MAX_VALUE = 9999999999.99;
        const rawFinalValue = req.body.finalValue !== undefined ? Number(req.body.finalValue) : null;
        const safeFinalValue = rawFinalValue !== null && rawFinalValue <= MAX_VALUE ? rawFinalValue : null;
        const existing = isSameStage ? await (tx as any).closedDeal.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }) : null;
        if (existing) {
          await (tx as any).closedDeal.update({
            where: { id: existing.id },
            data: {
              result: validDealResults.includes(closedResult) ? closedResult : existing.result,
              note: note !== undefined ? note : existing.note,
              finalValue: safeFinalValue !== null ? safeFinalValue : existing.finalValue,
              closingDate: req.body.closingDate ? new Date(req.body.closingDate) : existing.closingDate,
              endDate: req.body.endDate ? new Date(req.body.endDate) : existing.endDate,
            },
          });
        } else {
          await (tx as any).closedDeal.create({
            data: {
              customerId: id,
              result: safeResult,
              note: note || null,
              finalValue: safeFinalValue,
              userId: me.role === "SALE" ? me.id : null,
              closingDate: req.body.closingDate ? new Date(req.body.closingDate) : new Date(),
              endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            },
          });
        }

        // ✅ อัปเดต quotation ล่าสุดด้วย (ราคาที่เสนอ + terms) เพื่อให้ค่าคงอยู่เมื่อเปิด dialog อีกครั้ง
        const { quotationPrice, terms } = req.body;
        const latestQuotation = await (tx as any).quotation.findFirst({
          where: { customerId: id },
          orderBy: { createdAt: "desc" },
        });
        if (latestQuotation) {
          await (tx as any).quotation.update({
            where: { id: latestQuotation.id },
            data: {
              totalAmount: quotationPrice !== undefined ? Number(quotationPrice) : latestQuotation.totalAmount,
              terms: terms !== undefined ? terms : latestQuotation.terms,
            },
          });
        }
      }

      return customer;
    });

    return res.json({ ok: true, customer: updated });
  } catch (err) {
    console.error("moveCustomerStage error:", err);
    return res.status(500).json({ message: "Move stage failed" });
  }
};

/**
 * POST /api/pipeline/repeat
 * Reset ลูกค้าที่ปิดการขายแล้วกลับไป CONTACTED เพื่อเริ่มซื้อซ้ำ
 */
export const repeatPurchase = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!;
    const { customerId } = req.body;

    const id = Number(customerId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { saleId: true, mainStatus: true, sale: { select: { managerId: true } } },
    });

    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้า" });
    }

    // ✅ เพิ่มความเป๊ะ: ต้องเป็นลูกค้าที่ CLOSED แล้วเท่านั้นถึงจะเริ่มดีลใหม่ได้
    if (customer.mainStatus !== "CLOSED") {
      return res.status(400).json({ message: "เฉพาะลูกค้าที่ปิดการขายแล้วเท่านั้นที่สามารถเริ่มดีลซื้อซ้ำได้" });
    }

    // ตรวจสิทธิ์: SALE ต้องเป็นเซลล์ของลูกค้านั้น, MANAGER ต้องอยู่ในทีม
    const roleUpper = (me.role || "").toUpperCase();
    if (roleUpper === "SALE") {
      if (customer.saleId !== me.id) {
        return res.status(403).json({ message: "ไม่มีสิทธิ์" });
      }
    } else if (roleUpper === "MANAGER") {
      if ((customer.sale as any)?.managerId !== me.id) {
        return res.status(403).json({ message: "ไม่มีสิทธิ์" });
      }
    }

    // Reset กลับไปเป็น NEW เพื่อเริ่มรอบใหม่
    // ✅ คงไว้ซึ่ง saleId เดิม เพื่อให้ข้อมูลการดูแลยังอยู่ และข้อมูล quotations/products ของรอบก่อนยังเข้าถึงได้
    await prisma.customer.update({
      where: { id },
      data: {
        mainStatus: "NEW",
        // ไม่ล้าง saleId — ให้ admin reassign เองจากหน้าลูกค้าถ้าต้องการ
      },
    });

    return res.json({ ok: true, message: "เตรียมการซื้อซ้ำเรียบร้อย สินค้ารอการจัดสรรเซลล์ใหม่ที่เมนูลูกค้า" });
  } catch (err) {
    console.error("repeatPurchase error:", err);
    return res.status(500).json({ message: "Repeat purchase failed" });
  }
};