import { Request, Response } from "express";
import prisma from "../config/prismaclient";
import { getIO } from "../ws";

interface AuthUser {
  id: number;
  email: string;
  role: string; // "SALE" | "CUSTOMER" | ...
  name?: string;
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

type ChatType = "TEXT" | "IMAGE" | "FILE";

function parseCustomerIdFromRoomId(roomId: string): number | null {
  const [prefix, idStr] = String(roomId).split(":");
  if (prefix !== "cust") return null;
  const n = Number(idStr);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const pickBodyForLog = (body: any) => ({
  roomId: body?.roomId,
  customerId: body?.customerId,
  cid: body?.cid,
  type: body?.type,
  textLen: typeof body?.text === "string" ? body.text.length : body?.text,
  fileKey: body?.fileKey,
  fileName: body?.fileName,
  fileMime: body?.fileMime,
  fileSize: body?.fileSize,
});

/**
 * POST /api/chat/send
 */
export const sendChatMessage = async (req: AuthRequest, res: Response) => {
  const startedAt = Date.now();
  const rid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const authUser = req.user;

    console.log(`\n[CHAT:SEND][${rid}] IN`);
    console.log(`[CHAT:SEND][${rid}] user=`, {
      id: authUser?.id,
      role: authUser?.role,
      email: authUser?.email,
      name: authUser?.name,
    });
    console.log(`[CHAT:SEND][${rid}] body=`, pickBodyForLog(req.body));

    if (!authUser?.id) {
      console.log(`[CHAT:SEND][${rid}] -> 401 Unauthenticated`);
      return res.status(401).json({ message: "Unauthenticated" });
    }

    let roomId = String(req.body.roomId || "").trim();
    if (!roomId) {
      console.log(`[CHAT:SEND][${rid}] -> 400 roomId is required`);
      return res.status(400).json({ message: "roomId is required" });
    }

    const type = String(req.body.type || "TEXT").toUpperCase() as ChatType;
    if (!["TEXT", "IMAGE", "FILE"].includes(type)) {
      console.log(`[CHAT:SEND][${rid}] -> 400 invalid type=`, type);
      return res.status(400).json({ message: "type ไม่ถูกต้อง" });
    }

    const cid = req.body.cid != null ? String(req.body.cid) : null;

    // ✅ แนะนำให้ใช้ email เป็น senderName เพื่อ FE fromMe เทียบง่าย ไม่เพี้ยน
    const senderName = authUser.email || authUser.name || "User";

    const text = req.body.text != null ? String(req.body.text) : null;

    const fileKey = req.body.fileKey != null ? String(req.body.fileKey) : null;
    const fileName = req.body.fileName != null ? String(req.body.fileName) : null;
    const fileMime = req.body.fileMime != null ? String(req.body.fileMime) : null;

    const fileSize =
      req.body.fileSize == null || req.body.fileSize === "" ? null : Number(req.body.fileSize);

    if (fileSize !== null && Number.isNaN(fileSize)) {
      console.log(`[CHAT:SEND][${rid}] -> 400 fileSize invalid`, req.body.fileSize);
      return res.status(400).json({ message: "fileSize ไม่ถูกต้อง" });
    }

    // ===== customerId (optional input) =====
    const customerIdRaw = req.body.customerId;
    let customerId: number | null =
      customerIdRaw === null || customerIdRaw === undefined || customerIdRaw === ""
        ? null
        : Number(customerIdRaw);

    if (customerId !== null && Number.isNaN(customerId)) {
      console.log(`[CHAT:SEND][${rid}] -> 400 customerId invalid`, customerIdRaw);
      return res.status(400).json({ message: "customerId ไม่ถูกต้อง" });
    }

    console.log(`[CHAT:SEND][${rid}] parsed roomId=`, roomId, "customerId(in)=", customerId);

    // ✅ 1) derive จาก roomId ถ้าเป็น cust:<id>
    if (customerId == null) {
      const fromRoom = parseCustomerIdFromRoomId(roomId);
      console.log(`[CHAT:SEND][${rid}] derive from roomId ->`, fromRoom);
      if (fromRoom) customerId = fromRoom;
    }

    // ✅ 2) ถ้ายังไม่มี และเป็น CUSTOMER → หา customerId จาก Customer.userId
    if (customerId == null && authUser.role === "CUSTOMER") {
      console.log(`[CHAT:SEND][${rid}] lookup customer by userId=`, authUser.id);

      const customer = await prisma.customer.findFirst({
        where: { userId: authUser.id },
        select: { id: true },
      });

      console.log(`[CHAT:SEND][${rid}] lookup result customer=`, customer);

      if (customer?.id) customerId = customer.id;
    }

    // ✅ 3) normalize roomId ให้เป็น cust:<customerId> ถ้ามี customerId แล้ว
    if (customerId != null) {
      const oldRoom = roomId;
      roomId = `cust:${customerId}`;
      if (oldRoom !== roomId) {
        console.log(`[CHAT:SEND][${rid}] normalize roomId`, oldRoom, "->", roomId);
      }
    }

    console.log(
      `[CHAT:SEND][${rid}] final roomId=`,
      roomId,
      "final customerId=",
      customerId,
      "type=",
      type
    );

    // ===== Validate ตาม type =====
    if (type === "TEXT") {
      if (!text || !text.trim()) {
        console.log(`[CHAT:SEND][${rid}] -> 400 text is required (text=)`, text);
        return res.status(400).json({ message: "text is required" });
      }
    } else {
      if (!fileKey) {
        console.log(`[CHAT:SEND][${rid}] -> 400 fileKey missing for`, type);
        return res.status(400).json({ message: "fileKey is required for IMAGE/FILE" });
      }
      if (customerId == null) {
        console.log(`[CHAT:SEND][${rid}] -> 400 customerId missing for`, type, "(roomId=", roomId, ")");
        return res.status(400).json({ message: "customerId is required for IMAGE/FILE" });
      }
    }

    // ✅ ผู้ส่ง “อ่านแล้ว” ทันที (แก้ badge ขึ้นฝั่งผู้ส่ง + unread นับผิด)
    const now = new Date();
    const readBySaleAt = authUser.role === "SALE" ? now : null;
    const readByCustomerAt = authUser.role === "CUSTOMER" ? now : null;

    // ===== บันทึก DB =====
    console.log(`[CHAT:SEND][${rid}] creating DB...`);

    const created = await prisma.chatMessage.create({
      data: {
        roomId,
        customerId,

        senderName,
        cid,

        type: type as any,
        text: type === "TEXT" ? text : null,

        fileKey: type !== "TEXT" ? fileKey : null,
        fileName: type !== "TEXT" ? fileName : null,
        fileMime: type !== "TEXT" ? fileMime : null,
        fileSize: type !== "TEXT" ? fileSize : null,

        imgMessage: type === "IMAGE" ? fileKey : null,
        fileMessage: type === "FILE" ? fileKey : null,

        // ✅ สำคัญมาก
        readBySaleAt,
        readByCustomerAt,
      },
      select: {
        id: true,
        roomId: true,
        customerId: true,
        senderName: true,
        cid: true,
        type: true,
        text: true,
        fileKey: true,
        fileName: true,
        fileMime: true,
        fileSize: true,
        imgMessage: true,
        fileMessage: true,
        createdAt: true,
        readByCustomerAt: true,
        readBySaleAt: true,
      },
    });

    console.log(
      `[CHAT:SEND][${rid}] DB OK id=${created.id} type=${created.type} roomId=${created.roomId} customerId=${created.customerId} fileKey=${created.fileKey}`
    );

    // ===== broadcast realtime =====
    try {
      const io = getIO();

      // 1) ส่ง message realtime ให้ทุกคนในห้อง (ทั้ง sale + customer ที่อยู่ห้องเดียวกัน)
      console.log(`[CHAT:SEND][${rid}] emit chat:message to room=`, roomId);
      io.to(roomId).emit("chat:message", created);

      // 2) unread-count คำนวณจาก DB หลัง set readBy.. ของผู้ส่งแล้ว
      if (created.customerId) {
        console.log(`[CHAT:SEND][${rid}] counting unread for customerId=`, created.customerId);

        const [customerUnread, saleUnread] = await Promise.all([
          prisma.chatMessage.count({
            where: { customerId: created.customerId, readByCustomerAt: null },
          }),
          prisma.chatMessage.count({
            where: { customerId: created.customerId, readBySaleAt: null },
          }),
        ]);

        const payload = {
          roomId: `cust:${created.customerId}`,
          customerUnread,
          saleUnread,
        };

        console.log(`[CHAT:SEND][${rid}] emit unread-count payload=`, payload);

        // ส่งเข้า roomId เสมอ (เอาไว้ให้หน้าที่เปิดห้องนั้นอยู่ update ได้)
        io.to(payload.roomId).emit("unread-count", payload);

        // ✅ ส่งให้ “ฝั่งรับ” เท่านั้น (แก้ badge ขึ้นฝั่งผู้ส่ง)
        if (authUser.role === "SALE") {
          io.to("role:CUSTOMER").emit("unread-count", payload);
        } else if (authUser.role === "CUSTOMER") {
          io.to("role:SALE").emit("unread-count", payload);
        }
      }
    } catch (e) {
      console.error(`[CHAT:SEND][${rid}] emit error:`, e);
    }

    console.log(`[CHAT:SEND][${rid}] DONE ${Date.now() - startedAt}ms`);
    return res.json(created);
  } catch (err: any) {
    console.error(`[CHAT:SEND][${rid}] ERROR:`, err);
    console.log(`[CHAT:SEND][${rid}] DONE ${Date.now() - startedAt}ms (error)`);
    return res.status(500).json({ message: "ส่งข้อความไม่สำเร็จ" });
  }
};
