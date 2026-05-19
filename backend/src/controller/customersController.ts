import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import { Prisma } from "@prisma/client";
import { getIO } from "../ws";
import { AuthRequest } from "../middlewares/authMiddleware";

const buildCustomerScope = (user?: { id: number; role: string }) => {
  const role = (user?.role || "").toUpperCase();
  const userId = user?.id;

  if (!userId) return null;

  if (role === "ADMIN") return {};

  if (role === "SALE") {
    return { saleId: userId };
  }

  if (role === "MANAGER") {
    return {
      OR: [{ saleId: userId }, { sale: { managerId: userId } }],
    };
  }

  return null;
};

const canAccessSaleId = async (
  user?: { id: number; role: string },
  targetSaleId?: number | null
) => {
  const role = (user?.role || "").toUpperCase();
  const userId = user?.id;

  if (!userId || !targetSaleId) return false;

  if (role === "ADMIN") return true;

  if (role === "SALE") {
    return Number(targetSaleId) === Number(userId);
  }

  if (role === "MANAGER") {
    const sale = await prisma.user.findFirst({
      where: {
        id: Number(targetSaleId),
        role: "SALE",
        OR: [{ id: userId }, { managerId: userId }],
      },
      select: { id: true },
    });

    return !!sale;
  }

  return false;
};

/**
 * ดึงลูกค้าทั้งหมด
 * GET /api/customers
 */
export const getAllCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const scope = buildCustomerScope(req.user);
    if (scope === null) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });
    }

    const customers = await prisma.customer.findMany({
      where: scope,
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
      orderBy: { createdAt: "desc" },
    });

    return res.json(customers);
  } catch (err) {
    console.error("getAllCustomers error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
};

/**
 * มอบหมายพนักงานขายให้ลูกค้า
 * PATCH /api/customers/:id/assign-sale
 */
export const assignSales = async (req: AuthRequest, res: Response) => {
  try {
    const role = (req.user?.role || "").toUpperCase();

    // ให้เฉพาะ ADMIN เปลี่ยนคนดูแลได้
    if (role !== "ADMIN") {
      return res.status(403).json({ message: "ไม่มีสิทธิ์มอบหมายพนักงานขาย" });
    }

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

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "ไม่พบลูกค้า" });
    }

    const saleUser = await prisma.user.findFirst({
      where: { id: saleUserId, role: "SALE" },
    });

    if (!saleUser) {
      return res.status(400).json({ message: "ไม่พบพนักงานขายที่เลือก" });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        saleId: saleUserId,
        mainStatus: "CONTACTED",
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

    try {
      const io = getIO();
      io.to("role:SALE").emit("customer:assigned", updated);
      io.to(`user:${saleUserId}`).emit("customer:assigned", updated);
      console.log("📢 Emit → customer:assigned:", updated.id);
    } catch (wsErr) {
      console.warn("Socket.IO not initialized, skip emit:", wsErr);
    }

    return res.json(updated);
  } catch (error) {
    console.error("assignSales error:", error);
    return res.status(500).json({ message: "มอบหมายไม่สำเร็จ" });
  }
};

/**
 * ดึงลูกค้าตามเซลล์
 * GET /api/customers/sale/:saleId
 */
export const getCustomersBySale = async (req: AuthRequest, res: Response) => {
  try {
    const saleId = Number(req.params.saleId);
    if (Number.isNaN(saleId)) {
      return res.status(400).json({ message: "saleId ไม่ถูกต้อง" });
    }

    const allowed = await canAccessSaleId(req.user, saleId);
    if (!allowed) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึงข้อมูลเซลล์นี้" });
    }

    const customers = await prisma.customer.findMany({
      where: { saleId },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        tol: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      customers.map(async (c) => {
        const saleRoomId = `cust:${c.id}`;

        const unreadCount = await prisma.chatMessage.count({
          where: {
            customerId: c.id,
            roomId: saleRoomId,
            readBySaleAt: null,
          },
        });

        // ✅ หาข้อความล่าสุดเพื่อเรียงลำดับ + แสดงเวลา (เฉพาะห้อง Sale)
        const lastMsg = await prisma.chatMessage.findFirst({
          where: { customerId: c.id, roomId: saleRoomId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          userId: c.userId,
          tol: c.tol,
          unreadCount,
          lastMessageAt: lastMsg?.createdAt ?? null,
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
export const getCustomerById = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const scope = buildCustomerScope(req.user);
    if (scope === null) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        ...scope,
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

    if (!customer) {
      return res
        .status(404)
        .json({ message: "ไม่พบลูกค้าหรือไม่มีสิทธิ์เข้าถึง" });
    }

    return res.json(customer);
  } catch (err) {
    console.error("getCustomerById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าล้มเหลว" });
  }
};

/**
 * เพิ่มลูกค้าใหม่
 * POST /api/customers
 */
export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const role = (req.user?.role || "").toUpperCase();

    if (!["ADMIN", "MANAGER", "SALE"].includes(role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์สร้างลูกค้า" });
    }

    const { name, phone, email, img, productType, budget, saleId } = req.body;

    if (!name || !phone || !email) {
      return res
        .status(400)
        .json({ message: "กรุณากรอกชื่อ เบอร์โทร และอีเมล" });
    }

    let finalSaleId: number | null = null;

    if (role === "SALE") {
      finalSaleId = Number(req.user!.id);
    } else if (role === "ADMIN") {
      finalSaleId = saleId ? Number(saleId) : null;
    } else if (role === "MANAGER") {
      // ถ้า manager ส่ง saleId มา ต้องเป็นลูกทีมตัวเอง
      if (saleId !== undefined && saleId !== null && saleId !== "") {
        const allowed = await canAccessSaleId(req.user, Number(saleId));
        if (!allowed) {
          return res
            .status(403)
            .json({ message: "ไม่สามารถมอบหมายให้เซลล์นอกทีมได้" });
        }
        finalSaleId = Number(saleId);
      } else {
        finalSaleId = Number(req.user!.id);
      }
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
        saleId: finalSaleId,
        mainStatus: "CONTACTED",
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
export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const role = (req.user?.role || "").toUpperCase();
    const userId = req.user?.id;

    const current = await prisma.customer.findFirst({
      where: {
        id,
        ...(role === "ADMIN"
          ? {}
          : role === "SALE"
          ? { saleId: userId }
          : role === "MANAGER"
          ? {
              OR: [{ saleId: userId }, { sale: { managerId: userId } }],
            }
          : { id: -1 }),
      },
      select: { id: true, saleId: true },
    });

    if (!current) {
      return res
        .status(404)
        .json({ message: "ไม่พบลูกค้าหรือไม่มีสิทธิ์แก้ไข" });
    }

    const { name, phone, email, img, productType, budget, saleId } = req.body;

    const data: any = {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { tol: phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(img !== undefined ? { img } : {}),
      ...(productType !== undefined ? { productType } : {}),
      ...(budget !== undefined
        ? {
            priceBudget:
              budget !== null && budget !== ""
                ? new Prisma.Decimal(budget)
                : null,
          }
        : {}),
    };

    if (role === "ADMIN" && saleId !== undefined) {
      data.saleId = saleId === null || saleId === "" ? null : Number(saleId);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
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
    return res.status(500).json({ message: "อัปเดตข้อมูลไม่สำเร็จ" });
  }
};

/**
 * ลบลูกค้า
 * DELETE /api/customers/:id
 */
export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id ไม่ถูกต้อง" });
    }

    const role = (req.user?.role || "").toUpperCase();
    const userId = req.user?.id;

    const current = await prisma.customer.findFirst({
      where: {
        id,
        ...(role === "ADMIN"
          ? {}
          : role === "SALE"
          ? { saleId: userId }
          : role === "MANAGER"
          ? {
              OR: [{ saleId: userId }, { sale: { managerId: userId } }],
            }
          : { id: -1 }),
      },
      select: { id: true, name: true },
    });

    if (!current) {
      return res.status(404).json({ message: "ไม่พบลูกค้าหรือไม่มีสิทธิ์ลบ" });
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
 * เซลล์ของลูกค้าที่ล็อกอิน (สำหรับ app)
 * GET /api/customers/my-sale
 */
export const getMyAssignedSale = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const userId = Number(authUser.id);

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

    const saleRoomId = `cust:${customer.id}`;
    const adminRoomId = `admin:cust:${customer.id}`;

    // Sale Chat Stats
    const saleUnreadCount = await prisma.chatMessage.count({
      where: {
        customerId: customer.id,
        roomId: saleRoomId,
        readByCustomerAt: null,
      },
    });

    const saleLastMsg = await prisma.chatMessage.findFirst({
      where: { customerId: customer.id, roomId: saleRoomId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    // Admin Chat Stats
    const adminUnreadCount = await prisma.chatMessage.count({
      where: {
        customerId: customer.id,
        roomId: adminRoomId,
        readByCustomerAt: null,
      },
    });

    const adminLastMsg = await prisma.chatMessage.findFirst({
      where: { customerId: customer.id, roomId: adminRoomId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { name: true },
    });
    const adminNames = admins.length > 0 ? admins.map((a) => a.name).join(", ") : "แอดมินส่วนกลาง";

    return res.json({
      customerId: customer.id,
      customerName: customer.name,
      sale: customer.sale,
      unreadCount: saleUnreadCount,
      lastMessageAt: saleLastMsg?.createdAt ?? null,
      adminUnreadCount,
      adminLastMessageAt: adminLastMsg?.createdAt ?? null,
      adminNames,
    });
  } catch (error) {
    console.error("getMyAssignedSale error:", error);
    return res.status(500).json({ message: "ดึงข้อมูลเซลล์ไม่สำเร็จ" });
  }
};

export const getCustomers = getAllCustomers;

/**
 * ดึงลูกค้าและแชทสำหรับผู้จัดการ (ดูเซลล์ในทีม)
 * GET /api/customers/manager/chats
 */
export const getManagerChats = async (req: AuthRequest, res: Response) => {
  try {
    const role = (req.user?.role || "").toUpperCase();
    const userId = req.user?.id;

    if (!userId || (role !== "MANAGER" && role !== "ADMIN")) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });
    }

    const scope = buildCustomerScope(req.user);
    if (!scope) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์" });
    }

    const customers = await prisma.customer.findMany({
      where: scope,
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        tol: true,
        sale: {
          select: {
            id: true,
            name: true,
            email: true,
            img: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = await Promise.all(
      customers.map(async (c) => {
        const saleRoomId = `cust:${c.id}`;
        const adminRoomId = `admin:cust:${c.id}`;
        
        // For MANAGER/ADMIN, we need to show both if needed, but the endpoint currently returns one object per customer.
        // We will return stats for both rooms so the frontend can split them.
        
        const saleUnreadCount = await prisma.chatMessage.count({
          where: {
            customerId: c.id,
            roomId: saleRoomId,
            readBySaleAt: null, 
          },
        });

        const saleLastMsg = await prisma.chatMessage.findFirst({
          where: { customerId: c.id, roomId: saleRoomId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        const adminUnreadCount = await prisma.chatMessage.count({
          where: {
            customerId: c.id,
            roomId: adminRoomId,
            readBySaleAt: null, 
          },
        });

        const adminLastMsg = await prisma.chatMessage.findFirst({
          where: { customerId: c.id, roomId: adminRoomId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        return {
          id: c.id,
          name: c.name,
          email: c.email,
          userId: c.userId,
          tol: c.tol,
          sale: c.sale,
          unreadCount: saleUnreadCount,
          lastMessageAt: saleLastMsg?.createdAt ?? null,
          adminUnreadCount,
          adminLastMessageAt: adminLastMsg?.createdAt ?? null,
        };
      })
    );

    return res.json(enriched);
  } catch (err) {
    console.error("getManagerChats error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลลูกค้าสำหรับผู้จัดการล้มเหลว" });
  }
};
