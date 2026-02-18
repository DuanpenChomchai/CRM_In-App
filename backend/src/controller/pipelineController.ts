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
    const isSale = me.role === "SALE";

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
    if (me.role === "SALE") {
      const c = await prisma.customer.findUnique({
        where: { id },
        select: { saleId: true },
      });
      if (!c || c.saleId !== me.id) {
        return res.status(403).json({ message: "ไม่มีสิทธิ์" });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({
        where: { id },
        data: { mainStatus: toStatus },
      });

      // เขียนรายละเอียด stage แบบ “เสริม” (ใช้โชว์ badge/history)
      if (toStatus === "CONTACTED") {
        // ✅ schema ใหม่: Contacted เป็น log (many) -> create อย่างเดียวพอ
        await (tx as any).contacted.create({
          data: {
            customerId: id,
            status: contactedStatus || "FOLLOWING_UP",
            note: note || null,
          },
        });
      }

      if (toStatus === "NEGOTIATING") {
        await (tx as any).negotiation.create({
          data: {
            customerId: id,
            status: negotiationStatus || "NEGOTIATING",
            note: note || null,
          },
        });
      }

      if (toStatus === "CLOSED") {
        await (tx as any).closedDeal.create({
          data: {
            customerId: id,
            result: closedResult || "LOST",
            note: note || null,
            userId: me.role === "SALE" ? me.id : null,
            closingDate: new Date(),
          },
        });
      }

      return customer;
    });

    return res.json({ ok: true, customer: updated });
  } catch (err) {
    console.error("moveCustomerStage error:", err);
    return res.status(500).json({ message: "Move stage failed" });
  }
};
