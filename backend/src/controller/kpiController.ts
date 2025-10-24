import { Request, Response } from "express";
import { prisma } from "../config/prismaclient";
import { Decimal } from "@prisma/client/runtime/library";

// 🧩 Types
type SalesRank = { name: string; totalSales: number };
type DealItem = { finalValue: Decimal | number | null };
type SaleUser = { name: string; closedDeals: DealItem[] };
type MonthlyDeal = { stateDate: Date; _sum: { finalValue: Decimal | number | null } };
type CustomerItem = { createdAt: Date | string };

/**
 * ✅ 1. ดึงข้อมูล KPI ทั้งหมด (สำหรับหน้าแสดงรายการ KPI)
 */
export const getAllKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const kpis = await prisma.kPI.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({
      message: "✅ All KPI records fetched successfully",
      data: kpis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
};

/**
 * ✅ 2. เพิ่ม KPI ใหม่ (จากฟอร์มหรือระบบอัตโนมัติ)
 */
export const createKpi = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, target, actual, period } = req.body;

    if (!name || !target || !actual || !period) {
      res.status(400).json({ error: "⚠️ Missing required fields" });
      return;
    }

    const newKpi = await prisma.kPI.create({
      data: {
        name,
        target: Number(target),
        actual: Number(actual),
        period,
      },
    });

    res.json({
      message: "✅ KPI created successfully",
      data: newKpi,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
};

/**
 * ✅ 3. ดึงข้อมูลสรุป KPI สำหรับ Dashboard
 */
export const getKpiSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1️⃣ Stage Counts
    const [contactedCount, negotiationCount, quotationCount, closedDealCount] =
      await Promise.all([
        prisma.contacted.count(),
        prisma.negotiation.count(),
        prisma.quotation.count(),
        prisma.closedDeal.count(),
      ]);

    // 2️⃣ Monthly Deals
    const monthlyDeals = await prisma.closedDeal.groupBy({
      by: ["stateDate"],
      _sum: { finalValue: true },
      orderBy: { stateDate: "asc" },
    });

    // 3️⃣ Top Sales
    const topSales = await prisma.user.findMany({
      where: { role: "SALE" },
      include: { closedDeals: { select: { finalValue: true } } },
    });

    const salesRanking: SalesRank[] = topSales
      .map((s: SaleUser) => {
        const totalSales = s.closedDeals.reduce((sum: number, deal: DealItem) => {
          const value =
            deal.finalValue instanceof Decimal
              ? deal.finalValue.toNumber()
              : Number(deal.finalValue || 0);
          return sum + value;
        }, 0);
        return { name: s.name, totalSales };
      })
      .sort((a: SalesRank, b: SalesRank) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // 4️⃣ Customer Ratio
    const allCustomers: CustomerItem[] = await prisma.customer.findMany({
      select: { createdAt: true },
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    const newCustomers = allCustomers.filter((c: CustomerItem) => {
      const date =
        c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
      return date.getFullYear() === currentYear;
    }).length;

    const oldCustomers = allCustomers.length - newCustomers;

    const newRatio =
      allCustomers.length > 0
        ? Math.round((newCustomers / allCustomers.length) * 100)
        : 0;
    const oldRatio = 100 - newRatio;

    // 5️⃣ Monthly Summary
    const monthlySummary = monthlyDeals.map((m: MonthlyDeal) => ({
      month: new Date(m.stateDate).toLocaleString("th-TH", { month: "short" }),
      total:
        m._sum.finalValue instanceof Decimal
          ? m._sum.finalValue.toNumber()
          : Number(m._sum.finalValue || 0),
    }));

    // ✅ Response
    res.json({
      message: "✅ KPI Dashboard summary fetched successfully",
      data: {
        counts: {
          contacted: contactedCount,
          negotiation: negotiationCount,
          quotation: quotationCount,
          closedDeal: closedDealCount,
        },
        monthlyDeals: monthlySummary,
        topSales: salesRanking,
        customerRatio: {
          newCustomerPercent: newRatio,
          oldCustomerPercent: oldRatio,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
};
