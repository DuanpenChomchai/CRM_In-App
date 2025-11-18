import { Request, Response } from "express";
import prisma from "../config/prismaclient";

// ดึงลูกค้าทั้งหมด
// ดึงลูกค้าทั้งหมด (ที่ role = CUSTOMER)
// GET /api/customers
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
      }
    });

    return res.json(customers);
  } catch (err) {
    console.error("getAllCustomers error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
};


// เพิ่มลูกค้าใหม่ (ถ้าต้องการ)
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email } = req.body;

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        tol: phone,
        email,
        password: "TEMP1234", // ถ้าเว็บไม่ได้ใช้ password ก็ใส่ dummy
      },
    });

    res.json(newCustomer);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "สร้างลูกค้าไม่สำเร็จ" });
  }
};

// อัปเดทข้อมูลลูกค้า
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, email, propertyType, budget, assignedTo } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name,
        tol: phone,
        email,
        // propertyType,
        // budget,
        userId: assignedTo ? Number(assignedTo) : null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "อัปเดทข้อมูลไม่สำเร็จ" });
  }
};

// มอบหมายพนักงานขาย
export const assignSales = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { saleId } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: { userId: saleId },
    });

    res.json(updated);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "มอบหมายไม่สำเร็จ" });
  }
};
