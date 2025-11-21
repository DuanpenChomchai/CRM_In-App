// src/controller/customersController.ts
import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import { Prisma } from "@prisma/client";

// ---------- Types สำหรับ req.user ----------
interface AuthUser {
  id: number;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * ดึงลูกค้าทั้งหมด
 * GET /api/customers
 */
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        // โปรไฟล์ user ที่สมัครผ่านแอป (ถ้ามี)
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
        // เซลล์ที่ดูแลลูกค้า (ถ้ามี)
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(customers);
  } catch (err) {
    console.error("getAllCustomers error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
};

/**
 * ดึงลูกค้าที่ "ยังไม่ถูก assign sale"
 * GET /api/customers/new
 */
export const getNewCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        saleId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(customers);
  } catch (err) {
    console.error("getNewCustomers error:", err);
    return res
      .status(500)
      .json({ message: "ดึงข้อมูลลูกค้าใหม่ที่ยังไม่ assign ล้มเหลว" });
  }
};

/**
 * ดึงลูกค้าตามเซลล์ + unreadCount (ฝั่งเซลล์ใช้กับ list แชท)
 * GET /api/customers/sale/:saleId
 * response: [{ id, name, email, unreadCount }, ...]
 */
export const getCustomersBySale = async (req: AuthRequest, res: Response) => {
  try {
    const saleId = Number(req.params.saleId);
    if (Number.isNaN(saleId)) {
      return res.status(400).json({ message: "saleId ไม่ถูกต้อง" });
    }

    console.log("getCustomersBySale saleId =", saleId);

    // ดึง list ลูกค้าที่ saleId นี้ดูแล
    const customers = await prisma.customer.findMany({
      where: { saleId },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // เติม unreadCount (ข้อความที่ "เซลล์" ยังไม่อ่าน readBySaleAt = null)
    const enriched = await Promise.all(
      customers.map(async (c) => {
        const unreadCount = await prisma.chatMessage.count({
          where: {
            customerId: c.id,
            readBySaleAt: null,
          },
        });

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          unreadCount,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error("getCustomersBySale error:", err);
    return res
      .status(500)
      .json({ message: "ดึงข้อมูลลูกค้าตามเซลล์ล้มเหลว" });
  }
};

/**
 * ดึงข้อมูลลูกค้ารายคน
 * GET /api/customers/:id
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้า" });
    }

    return res.json(customer);
  } catch (err) {
    console.error("getCustomerById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
};

/**
 * เพิ่มลูกค้าใหม่จากฝั่งเว็บ (สร้างเฉพาะ Customer record)
 * POST /api/customers
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, img, productType, budget, saleId } = req.body;

    if (!name || !phone || !email) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกชื่อ เบอร์โทร และอีเมล" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        tol: phone,
        email,
        img: img ?? null,
        productType: productType ?? null,
        priceBudget:
          budget !== undefined && budget !== null && budget !== ""
            ? new Prisma.Decimal(budget)
            : null,
        saleId: saleId ? Number(saleId) : null,
      },
      include: {
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error("createCustomer error:", error);
    return res.status(500).json({ message: "สร้างลูกค้าไม่สำเร็จ" });
  }
};

/**
 * อัปเดทข้อมูลลูกค้า
 * PUT /api/customers/:id
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const { name, phone, email, img, productType, budget, saleId } = req.body;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name,
        tol: phone,
        email,
        img,
        productType,
        priceBudget:
          budget !== undefined && budget !== null && budget !== ""
            ? new Prisma.Decimal(budget)
            : undefined,
        saleId: saleId !== undefined ? Number(saleId) : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("updateCustomer error:", error);
    return res.status(500).json({ message: "อัปเดทข้อมูลไม่สำเร็จ" });
  }
};

/**
 * มอบหมายพนักงานขายให้ลูกค้า
 * PATCH /api/customers/:id/assign-sale
 */
export const assignSales = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const { saleId } = req.body;

    if (!saleId) {
      return res.status(400).json({ message: "กรุณาระบุ saleId" });
    }

    const saleUserId = Number(saleId);
    if (Number.isNaN(saleUserId)) {
      return res.status(400).json({ message: "saleId ไม่ถูกต้อง" });
    }

    const saleUser = await prisma.user.findFirst({
      where: { id: saleUserId, role: "SALE" },
    });

    if (!saleUser) {
      return res.status(400).json({ message: "ไม่พบพนักงานขายที่เลือก" });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { saleId: saleUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            tol: true,
            img: true,
            role: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error("assignSales error:", error);
    return res.status(500).json({ message: "มอบหมายไม่สำเร็จ" });
  }
};

/**
 * ลบลูกค้า
 * DELETE /api/customers/:id
 */
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.json({ message: "ลบลูกค้าสำเร็จ" });
  } catch (error) {
    console.error("deleteCustomer error:", error);
    return res.status(500).json({ message: "ลบลูกค้าไม่สำเร็จ" });
  }
};

/**
 * ดึง "เซลล์ที่ดูแลลูกค้าที่ล็อกอิน" + unreadCount ฝั่งลูกค้า
 * GET /api/customers/my-sale
 * ใช้ในแอป role=CUSTOMER (หน้า ChatsScreen)
 */
export const getMyAssignedSale = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const userId = Number(authUser.id);
    console.log("getMyAssignedSale userId =", userId);

    const customer = await prisma.customer.findFirst({
      where: { userId },
      select: {
        id: true,
        name: true,
        sale: {
          select: {
            id: true,
            name: true,
            img: true,
            email: true,
            tol: true,
          },
        },
      },
    });

    if (!customer) {
      return res
        .status(404)
        .json({ message: "ไม่พบ Customer ที่ผูกกับ user นี้" });
    }

    // นับจำนวนข้อความที่ "ลูกค้า" ยังไม่อ่าน (readByCustomerAt = null)
    const unreadCount = await prisma.chatMessage.count({
      where: {
        customerId: customer.id,
        readByCustomerAt: null,
      },
    });

    return res.json({
      customerId: customer.id,
      customerName: customer.name,
      sale: customer.sale,
      unreadCount, // 👈 ตัวนี้แหละที่จะไปโชว์ badge
    });
  } catch (error) {
    console.error("getMyAssignedSale error:", error);
    return res.status(500).json({ message: "ดึงข้อมูลเซลล์ไม่สำเร็จ" });
  }
};
