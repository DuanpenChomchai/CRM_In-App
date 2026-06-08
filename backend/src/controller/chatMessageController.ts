import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import { getIO } from "../ws";

// ===== Types =====
interface AuthUser {
  id: number;
  email: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

// ===== Helper: build where =====
const buildChatWhere = (roomId?: string, customerId?: number, q?: string) => {
  const where: any = {};

  if (roomId) where.roomId = roomId;
  if (customerId) where.customerId = customerId;

  if (q?.trim()) {
    const keyword = q.trim();

    // ✅ รองรับ text ที่เป็น null + ค้นจาก fileName ได้
    where.OR = [
      { text: { contains: keyword, mode: "insensitive" } },
      { senderName: { contains: keyword, mode: "insensitive" } },
      { fileName: { contains: keyword, mode: "insensitive" } }, // ✅ ใหม่
    ];
  }

  return where;
};

// ===== Select fields =====
const baseSelect = {
  id: true,
  roomId: true,
  text: true,
  senderName: true,
  cid: true,
  customerId: true,
  createdAt: true,
  readByCustomerAt: true,
  readBySaleAt: true,
  isDeleted: true,

  // ✅ เพิ่ม: รองรับรูป/ไฟล์
  type: true,
  fileKey: true,
  fileName: true,
  fileMime: true,
  fileSize: true,

  // ✅ fallback ของเดิม (เผื่อข้อมูลเก่า)
  imgMessage: true,
  fileMessage: true,

  customer: {
    select: { id: true, name: true, email: true },
  },
};

/**
 * GET /api/chat/room/:roomId
 * ดึงประวัติแชทของห้องเดียว
 */
export const getMessagesByRoom = async (req: Request, res: Response) => {
  try {
    const roomId = req.params.roomId;
    if (!roomId) return res.status(400).json({ message: "roomId is required" });

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "50"), 10), 1),
      500
    );

    const q = req.query.q ? String(req.query.q) : undefined;

    const where = buildChatWhere(roomId, undefined, q);

    const [items, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" }, // Fetch latest first to avoid pagination cutoff
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: baseSelect,
      }).then(list => list.reverse()), // Restore ascending chronological order
      prisma.chatMessage.count({ where }),
    ]);

    return res.json({
      roomId,
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("getMessagesByRoom error:", err);
    return res.status(500).json({ message: "ดึงข้อความแชทของห้องล้มเหลว" });
  }
};

/**
 * GET /api/chat/customer/:customerId
 * ฝั่ง CRM: ดูข้อความทั้งหมดของลูกค้า + unreadCount
 */
export const getMessagesByCustomer = async (req: Request, res: Response) => {
  try {
    const customerId = Number(req.params.customerId);
    if (!customerId || Number.isNaN(customerId))
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });

    const authUser = (req as any).user;
    let roomId = req.params.roomId || (req.query.roomId as string);

    if (!roomId && authUser) {
      if (authUser.role === "SALE") {
        roomId = `cust:${customerId}:sale:${authUser.id}`;
      } else if (authUser.role === "ADMIN") {
        roomId = `admin:cust:${customerId}`;
      }
    }

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "50"), 10), 1),
      500
    );
    const q = req.query.q ? String(req.query.q) : undefined;

    const where = buildChatWhere(roomId, customerId, q);

    const [items, total, unreadCustomer, unreadSale] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" }, // Fetch latest first
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: baseSelect,
      }).then(list => list.reverse()), // Restore ascending order
      prisma.chatMessage.count({ where }),
      prisma.chatMessage.count({
        where: { customerId, ...(roomId ? { roomId } : {}), readByCustomerAt: null },
      }),
      prisma.chatMessage.count({
        where: { customerId, ...(roomId ? { roomId } : {}), readBySaleAt: null },
      }),
    ]);

    return res.json({
      customerId,
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      unreadCount: { customerUnread: unreadCustomer, saleUnread: unreadSale },
    });
  } catch (err) {
    console.error("getMessagesByCustomer error:", err);
    return res.status(500).json({ message: "ดึงข้อความแชทของลูกค้าล้มเหลว" });
  }
};

/**
 * GET /api/chat/my-messages
 * สำหรับฝั่งลูกค้าในแอป: ดูแชททั้งหมด + unreadCount (ฝั่งลูกค้า)
 */
export const getMyChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser?.id)
      return res.status(401).json({ message: "Unauthenticated" });

    const customer = await prisma.customer.findFirst({
      where: { userId: authUser.id },
      select: { id: true, name: true },
    });

    if (!customer)
      return res
        .status(404)
        .json({ message: "ไม่พบ Customer ที่ผูกกับ user นี้" });

    const customerId = customer.id;
    const roomId = req.query.roomId as string | undefined;

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "50"), 10), 1),
      500
    );

    const where = buildChatWhere(roomId, customerId, req.query.q as any);

    const [items, total, unreadCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where,
        orderBy: { createdAt: "desc" }, // Fetch latest first
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: baseSelect,
      }).then(list => list.reverse()), // Restore ascending order
      prisma.chatMessage.count({ where }),
      prisma.chatMessage.count({
        where: { customerId, ...(roomId ? { roomId } : {}), readByCustomerAt: null },
      }),
    ]);

    return res.json({
      customerId,
      customerName: customer.name,
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      unreadCount,
    });
  } catch (err) {
    console.error("getMyChatMessages error:", err);
    return res.status(500).json({ message: "ดึงประวัติแชทของคุณเองไม่สำเร็จ" });
  }
};

/**
 * POST /api/chat/mark-read
 * body: { customerId: number }
 * CUSTOMER → mark readByCustomerAt
 * SALE → mark readBySaleAt
 */

// ===== helper นับ unread ตาม role =====
const countUnreadForCustomer = async (customerId: number, roomId: string) => {
  return prisma.chatMessage.count({
    where: {
      customerId,
      roomId,
      readByCustomerAt: null,
    },
  });
};

const countUnreadForSaleOrAdmin = async (customerId: number, roomId: string) => {
  return prisma.chatMessage.count({
    where: {
      customerId,
      roomId,
      readBySaleAt: null,
    },
  });
};

/**
 * POST /api/chat/mark-read
 * body: { customerId: number, roomId?: string }
 * ใช้ได้ทั้งฝั่ง CUSTOMER, SALE และ ADMIN
 */
export const markRoomAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    const customerId = Number(req.body.customerId);
    if (!customerId || Number.isNaN(customerId)) {
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });
    }

    let roomId = req.body.roomId;
    if (!roomId) {
      if (authUser.role === "SALE") {
        roomId = `cust:${customerId}:sale:${authUser.id}`;
      } else if (authUser.role === "ADMIN") {
        roomId = `admin:cust:${customerId}`;
      } else {
        roomId = `cust:${customerId}:sale:${authUser.id}`; // Fallback for customer, though it should explicitly pass roomId now.
      }
    }
    const now = new Date();

    if (authUser.role === "CUSTOMER") {
      await prisma.chatMessage.updateMany({
        where: {
          customerId,
          roomId,
          readByCustomerAt: null,
        },
        data: { readByCustomerAt: now },
      });
    } else if (authUser.role === "SALE") {
      await prisma.chatMessage.updateMany({
        where: {
          customerId,
          roomId,
          readBySaleAt: null,
        },
        data: { readBySaleAt: now },
      });
    } else if (authUser.role === "ADMIN") {
      await prisma.chatMessage.updateMany({
        where: {
          customerId,
          roomId,
          readBySaleAt: null,
        },
        data: { readBySaleAt: now },
      });
    } else if (authUser.role === "MANAGER") {
      // Manager เข้ามาอ่านแชทของ Sale ไม่ควรทำให้ badge แจ้งเตือนของ Sale หายไป
      // จึงไม่ทำการอัปเดต readBySaleAt
    } else {
      return res
        .status(403)
        .json({ message: "role นี้ยังไม่รองรับ mark-read" });
    }

    // ✅ คำนวณ unread ใหม่ทั้งสองฝั่ง (เฉพาะห้องนั้น)
    const [customerUnread, saleUnread] = await Promise.all([
      countUnreadForCustomer(customerId, roomId),
      countUnreadForSaleOrAdmin(customerId, roomId),
    ]);

    // ✅ broadcast ผ่าน Socket.IO ให้ทั้งห้อง + ทุก role ที่เกี่ยว
    try {
      const io = getIO();
      const payload = { roomId, customerUnread, saleUnread };

      io.to(roomId).emit("unread-count", payload);
      
      // Emit events to specific roles
      if (roomId.startsWith("admin:cust:")) {
        io.to("role:CUSTOMER").emit("unread-count", payload);
        io.to("role:ADMIN").emit("unread-count", payload);
        io.to("role:MANAGER").emit("unread-count", payload);
      } else {
        io.to("role:CUSTOMER").emit("unread-count", payload);
        io.to("role:SALE").emit("unread-count", payload);
        io.to("role:MANAGER").emit("unread-count", payload);
      }

      // ✅ แจ้งฝั่งส่งว่าข้อความถูกอ่านแล้ว (read receipt)
      io.to(roomId).emit("messages-read", {
        roomId,
        readByRole: authUser.role, // "CUSTOMER" | "SALE" | "ADMIN"
      });
    } catch (e) {
      console.error("emit unread-count after mark-read error:", e);
    }

    return res.json({
      customerId,
      roomId,
      role: authUser.role,
      customerUnread,
      saleUnread,
    });
  } catch (err) {
    console.error("markRoomAsRead error:", err);
    return res
      .status(500)
      .json({ message: "อัปเดตสถานะอ่านแชทไม่สำเร็จ" });
  }
};
