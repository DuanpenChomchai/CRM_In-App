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
    const isSale = (me.role || "").toUpperCase() === "SALE";

    const whereBase: any = {};
    if (isSale) whereBase.saleId = me.id;

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
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },

          negotiations: {
            select: { id: true, status: true, stateDate: true, createdAt: true },
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
            take: 1,
          },

          // ✅ schema ใหม่: ใช้ contactedLogs เท่านั้น (เป็น array)
          contactedLogs: {
            select: { id: true, status: true, stateDate: true, createdAt: true } as any,
            orderBy: { createdAt: "desc" },
            take: 1,
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

    for (const c of counts) {
      const key = String(c.mainStatus) as PipelineStatus;
      if (countMap[key] !== undefined) countMap[key] = c._count._all;
    }

    const columns: Record<PipelineStatus, any[]> = {
  CONTACTED: [],
  NEGOTIATING: [],
  QUOTATION: [],
  CLOSED: [],
};

for (const c of customers) {
  const key = toPipelineKey(String(c.mainStatus));
  if (key) columns[key].push(c);
}



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
      if (toStatus === "CONTACTED") {
        const existing = await (tx as any).contacted.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });
        if (existing) {
          await (tx as any).contacted.update({
            where: { id: existing.id },
            data: { status: contactedStatus || existing.status, note: note !== undefined ? note : existing.note },
          });
        } else {
          await (tx as any).contacted.create({
            data: { customerId: id, status: contactedStatus || "FOLLOWING_UP", note: note || null },
          });
        }
      }

      if (toStatus === "NEGOTIATING") {
        const existing = await (tx as any).negotiation.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });
        if (existing) {
          await (tx as any).negotiation.update({
             where: { id: existing.id },
             data: { status: negotiationStatus || existing.status, note: note !== undefined ? note : existing.note },
          });
        } else {
          await (tx as any).negotiation.create({
            data: { customerId: id, status: negotiationStatus || "NEGOTIATING", note: note || null },
          });
        }
      }

      if (toStatus === "CLOSED") {
        const existing = await (tx as any).closedDeal.findFirst({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });
        if (existing) {
           await (tx as any).closedDeal.update({
             where: { id: existing.id },
             data: { 
               result: closedResult || existing.result, 
               note: note !== undefined ? note : existing.note,
               finalValue: req.body.finalValue !== undefined ? req.body.finalValue : existing.finalValue
             },
           });
        } else {
          await (tx as any).closedDeal.create({
            data: {
              customerId: id,
              result: closedResult || "LOST",
              note: note || null,
              finalValue: req.body.finalValue || null,
              userId: me.role === "SALE" ? me.id : null,
              closingDate: new Date(),
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
