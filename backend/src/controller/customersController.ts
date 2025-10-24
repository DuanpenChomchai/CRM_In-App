import { Request, Response } from "express";
import { prisma } from "../config/prismaclient";

/**
 * ดึงข้อมูลลูกค้าทั้งหมด
 */
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        quotations: true,
        closedDeals: true,
      },
    });
    res.json(customers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
};

/**
 * เพิ่มลูกค้าใหม่
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, tol, userId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const newCustomer = await prisma.customer.create({
      data: { name, email, password, tol, userId },
    });

    res.json({
      message: "✅ Customer created successfully",
      data: newCustomer,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
};

/**
 * แก้ไขข้อมูลลูกค้า
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, password, tol } = req.body;

    const existing = await prisma.customer.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const updated = await prisma.customer.update({
      where: { id: Number(id) },
      data: { name, email, password, tol },
    });

    res.json({
      message: "✅ Customer updated successfully",
      data: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
};

/**
 * ลบลูกค้า
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    await prisma.customer.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "🗑️ Customer deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
};