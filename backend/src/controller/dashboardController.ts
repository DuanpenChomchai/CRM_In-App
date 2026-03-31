import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // 1. Total customers
    const totalCustomers = await prisma.customer.count();

    // 2. Active deals (customers not CLOSED and not NEW)
    const activeDeals = await prisma.customer.count({
      where: { mainStatus: { notIn: ["CLOSED", "NEW"] } },
    });

    // 3. Closed deals
    const closedDeals = await prisma.customer.count({
      where: { mainStatus: "CLOSED" },
    });

    // 4. Average deal value from approved quotations
    const avgResult = await prisma.quotation.aggregate({
      _avg: { totalAmount: true },
      where: { status: "APPROVED" },
    });
    const avgDealValue = Math.round(Number(avgResult._avg.totalAmount || 0));

    // 5. Top 5 sales by number of assigned customers
    const salesUsers = await prisma.user.findMany({
      where: { role: "SALE" },
      select: {
        id: true,
        name: true,
        tol: true,
        _count: { select: { salesCustomers: true } },
      },
      orderBy: { salesCustomers: { _count: "desc" } },
      take: 5,
    });

    const topSales = salesUsers.map((u: any, i: number) => ({
      rank: i + 1,
      name: u.name,
      phone: u.tol || "-",
      dealCount: u._count.salesCustomers,
    }));

    // 6. Top 5 properties by number of quotation items
    const topProps = await prisma.property.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        _count: { select: { quotationItems: true } },
      },
      orderBy: { quotationItems: { _count: "desc" } },
      take: 5,
    });

    const topProperties = topProps.map((p: any, i: number) => ({
      rank: i + 1,
      name: p.name,
      price: Number(p.price || 0),
      deals: p._count.quotationItems,
    }));

    // 7. Monthly closed deals (from closedDeal createdAt)
    const closedDealRecords = await prisma.closedDeal.findMany({
      select: { createdAt: true },
    });

    const monthNames = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ];

    const monthCounts: Record<number, number> = {};
    for (let m = 0; m < 12; m++) monthCounts[m] = 0;
    closedDealRecords.forEach((d: any) => {
      const m = new Date(d.createdAt).getMonth();
      monthCounts[m]++;
    });

    const dealChartData = monthNames.map((name, idx) => ({
      month: name,
      value: monthCounts[idx],
    }));

    res.json({
      totalCustomers,
      activeDeals,
      closedDeals,
      avgDealValue,
      topSales,
      topProperties,
      dealChartData,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "โหลดข้อมูล Dashboard ไม่สำเร็จ" });
  }
};
