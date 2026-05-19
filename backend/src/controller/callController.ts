import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import { getIO } from "../ws";
import { sendPushNotification } from "../services/notificationService";

// ─── Auth types (same pattern as other controllers) ───
interface AuthUser {
  id: number;
  email: string;
  role: string;
}
interface AuthRequest extends Request {
  user?: AuthUser;
}

// ─── Select ───
const callSelect = {
  id: true,
  customerId: true,
  saleUserId: true,
  customerUserId: true,
  direction: true,
  status: true,
  startedAt: true,
  endedAt: true,
  durationSec: true,
  recordingKey: true,
  recordingDurationSec: true,
  transcript: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  customer: { select: { id: true, name: true, email: true } },
  saleUser: { select: { id: true, name: true, email: true, role: true } },
  customerUser: { select: { id: true, name: true, email: true, role: true } },
};

// =========================================================
// LIST (GET /api/calls)
// query: ?page=1&pageSize=20&customerId=&saleUserId=&status=&direction=&from=&to=
// =========================================================
export const listCalls = async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100
    );

    const where: any = {};

    if (req.query.customerId) where.customerId = Number(req.query.customerId);
    if (req.query.saleUserId) where.saleUserId = Number(req.query.saleUserId);
    if (req.query.customerUserId)
      where.customerUserId = Number(req.query.customerUserId);
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.direction) where.direction = String(req.query.direction);

    if (req.query.from || req.query.to) {
      where.startedAt = {};
      if (req.query.from) where.startedAt.gte = new Date(String(req.query.from));
      if (req.query.to) {
        const end = new Date(String(req.query.to));
        end.setHours(23, 59, 59, 999);
        where.startedAt.lte = end;
      }
    }

    const [items, total] = await Promise.all([
      prisma.call.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: callSelect,
      }),
      prisma.call.count({ where }),
    ]);

    return res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("listCalls error:", err);
    return res.status(500).json({ message: "ดึงรายการสายล้มเหลว" });
  }
};

// =========================================================
// GET BY ID (GET /api/calls/:id)
// =========================================================
export const getCallById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const call = await prisma.call.findUnique({
      where: { id },
      select: callSelect,
    });
    if (!call) return res.status(404).json({ message: "ไม่พบรายการสาย" });
    return res.json(call);
  } catch (err) {
    console.error("getCallById error:", err);
    return res.status(500).json({ message: "ดึงข้อมูลสายล้มเหลว" });
  }
};

// =========================================================
// MY CALLS (GET /api/calls/my)
// ลูกค้า/เซลล์ดูเฉพาะสายของตัวเอง
// =========================================================
export const getMyCalls = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const pageSize = Math.min(
      Math.max(parseInt(String(req.query.pageSize ?? "20"), 10), 1),
      100
    );

    const where: any = {
      OR: [{ saleUserId: userId }, { customerUserId: userId }],
    };

    if (req.query.status) where.status = String(req.query.status);

    const [items, total] = await Promise.all([
      prisma.call.findMany({
        where,
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: callSelect,
      }),
      prisma.call.count({ where }),
    ]);

    return res.json({
      data: items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("getMyCalls error:", err);
    return res.status(500).json({ message: "ดึงรายการสายล้มเหลว" });
  }
};

// =========================================================
// CREATE (POST /api/calls)
// =========================================================
export const createCall = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      saleUserId,
      customerUserId,
      direction,
      status,
      startedAt,
      endedAt,
      durationSec,
      recordingKey,
      recordingDurationSec,
      transcript,
      note,
    } = req.body;

    if (!direction) {
      return res.status(400).json({ message: "กรุณาระบุ direction" });
    }
    if (!status) {
      return res.status(400).json({ message: "กรุณาระบุ status" });
    }

    const data: any = {
      direction,
      status,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
    };

    if (customerId != null) data.customerId = Number(customerId);
    if (saleUserId != null) data.saleUserId = Number(saleUserId);
    if (customerUserId != null) data.customerUserId = Number(customerUserId);
    if (endedAt) data.endedAt = new Date(endedAt);
    if (durationSec != null) data.durationSec = Number(durationSec);
    if (recordingKey) data.recordingKey = recordingKey;
    if (recordingDurationSec != null)
      data.recordingDurationSec = Number(recordingDurationSec);
    if (transcript) data.transcript = transcript;
    if (note) data.note = note;

    const created = await prisma.call.create({
      data,
      select: callSelect,
    });

    try {
      const io = getIO();
      const targetUserId =
        created.direction === "CUSTOMER_TO_SALE"
          ? created.saleUserId
          : created.customerUserId;

      if (targetUserId) {
        const caller =
          created.direction === "CUSTOMER_TO_SALE"
            ? created.customerUser
            : created.saleUser;

        // 1) WebSocket signaling for online clients
        io.to(`user:${targetUserId}`).emit("call:incoming", {
          callId: created.id,
          callerName: caller?.name || "User",
          callerId: caller?.id,
          customerId: created.customerId,
          direction: created.direction
        });

        // 2) Push notifications for offline / background clients
        const pushTokens = await prisma.pushToken.findMany({
          where: {
            OR: [
              { userId: targetUserId },
              ...(created.customerId ? [{ customerId: created.customerId }] : [])
            ]
          },
          select: { token: true }
        });
        const recipientTokens = pushTokens.map(t => t.token);

        if (recipientTokens.length > 0) {
          await sendPushNotification(
            recipientTokens,
            `📞 สายเรียกเข้าจากคุณ ${caller?.name || "ผู้ใช้งาน"}`,
            `แตะเพื่อรับสายสนทนา`,
            {
              type: "INCOMING_CALL",
              callId: String(created.id),
              callerUserId: String(caller?.id || ""),
              customerId: String(created.customerId || ""),
              name: caller?.name || "ผู้ติดต่อ",
              isIncoming: "true"
            }
          );
        }
      }
    } catch (wsErr) {
      console.error("Emit call:incoming or send push error:", wsErr);
    }

    return res.status(201).json(created);
  } catch (err: any) {
    console.error("createCall error:", err);
    if (err?.code === "P2003") {
      return res
        .status(400)
        .json({ message: "customerId / saleUserId / customerUserId ไม่ถูกต้อง (FK)" });
    }
    return res.status(500).json({ message: "สร้างรายการสายล้มเหลว" });
  }
};

// =========================================================
// UPDATE (PUT /api/calls/:id)
// =========================================================
export const updateCall = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      customerId,
      saleUserId,
      customerUserId,
      direction,
      status,
      startedAt,
      endedAt,
      durationSec,
      recordingKey,
      recordingDurationSec,
      transcript,
      note,
    } = req.body;

    const data: any = {};

    if (typeof customerId !== "undefined") data.customerId = customerId ? Number(customerId) : null;
    if (typeof saleUserId !== "undefined") data.saleUserId = saleUserId ? Number(saleUserId) : null;
    if (typeof customerUserId !== "undefined")
      data.customerUserId = customerUserId ? Number(customerUserId) : null;
    if (typeof direction !== "undefined") data.direction = direction;
    if (typeof status !== "undefined") data.status = status;
    if (typeof startedAt !== "undefined") data.startedAt = new Date(startedAt);
    if (typeof endedAt !== "undefined") data.endedAt = endedAt ? new Date(endedAt) : null;
    if (typeof durationSec !== "undefined") data.durationSec = durationSec != null ? Number(durationSec) : null;
    if (typeof recordingKey !== "undefined") data.recordingKey = recordingKey ?? null;
    if (typeof recordingDurationSec !== "undefined")
      data.recordingDurationSec = recordingDurationSec != null ? Number(recordingDurationSec) : null;
    if (typeof transcript !== "undefined") data.transcript = transcript ?? null;
    if (typeof note !== "undefined") data.note = note ?? null;

    const updated = await prisma.call.update({
      where: { id },
      data,
      select: callSelect,
    });

    try {
      const io = getIO();
      if (updated.status === "ONGOING") {
        if (updated.saleUserId) io.to(`user:${updated.saleUserId}`).emit("call:answered", { callId: updated.id });
        if (updated.customerUserId) io.to(`user:${updated.customerUserId}`).emit("call:answered", { callId: updated.id });
      } else if (updated.status === "COMPLETED" || updated.status === "CANCELED") {
        if (updated.saleUserId) io.to(`user:${updated.saleUserId}`).emit("call:ended", { callId: updated.id, durationSec: updated.durationSec });
        if (updated.customerUserId) io.to(`user:${updated.customerUserId}`).emit("call:ended", { callId: updated.id, durationSec: updated.durationSec });
      }
    } catch (wsErr) {
      console.log("Emit call update socket error:", wsErr);
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("updateCall error:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบรายการสาย" });
    }
    if (err?.code === "P2003") {
      return res.status(400).json({ message: "ค่า FK ไม่ถูกต้อง" });
    }
    return res.status(500).json({ message: "อัปเดตรายการสายล้มเหลว" });
  }
};

// =========================================================
// DELETE (DELETE /api/calls/:id)
// =========================================================
export const deleteCall = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await prisma.call.delete({ where: { id } });
    return res.json({ message: "ลบสำเร็จ" });
  } catch (err: any) {
    console.error("deleteCall error:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ message: "ไม่พบรายการสาย" });
    }
    return res.status(500).json({ message: "ลบรายการสายล้มเหลว" });
  }
};
