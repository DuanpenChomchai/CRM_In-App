// src/ws.ts (หรือไฟล์ initWs ที่คุณใช้)
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import prisma from "./config/prismaclient";

type ChatMessage = {
  id: string;
  text: string;
  user: string;
  ts: number;
  cid?: string | number;
};

type JoinPayload = { roomId: string; user: string };
type MessagePayload = {
  roomId: string;
  text: string;
  user: string;
  cid?: string | number;
};
type TypingPayload = { roomId: string; user: string; typing: boolean };

const rooms = new Map<string, ChatMessage[]>();
const HISTORY_LIMIT = 200;

let io: Server | null = null;

/** แปลง roomId เป็น customerId เช่น "cust:2" -> 2 */
function parseCustomerId(roomId: string): number | null {
  const parts = roomId.split(":");
  if (parts.length < 2) return null;
  if (parts[0] !== "cust") return null;
  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const initWs = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: "*" },
    transports: ["websocket"],
  });

  io.on("connection", (socket) => {
    console.log("WS connected:", socket.id);

    // --- อ่าน auth ตอน handshake ---
    const { token, role, userId } = socket.handshake.auth || {};
    if (role) {
      (socket.data as any).role = role; // "CUSTOMER" | "SALE" | ...
    }
    if (userId) {
      (socket.data as any).userId = Number(userId);
    }

    // เผื่อกรณี React เปลี่ยน user ตอนรันแอป → update ผ่าน event
    socket.on("auth-update", (payload: any) => {
      try {
        if (payload?.role) (socket.data as any).role = payload.role;
        if (payload?.userId)
          (socket.data as any).userId = Number(payload.userId);
      } catch (e) {
        console.error("auth-update error:", e);
      }
    });

    // ================== JOIN ==================
    socket.on("join", (payload: JoinPayload) => {
      try {
        const { roomId, user } = payload || ({} as JoinPayload);
        if (!roomId || !user)
          return socket.emit("error", "Invalid join payload");

        socket.join(roomId);

        if (!rooms.has(roomId)) rooms.set(roomId, []);
        const history = rooms.get(roomId)!;

        socket.emit("history", history);
        socket
          .to(roomId)
          .emit("system", { text: `${user} joined`, ts: Date.now() });

        console.log(
          `[join] room=${roomId} user=${user} role=${(socket.data as any).role}`
        );
      } catch (err) {
        console.error("join error:", err);
        socket.emit("error", "Join failed");
      }
    });

    // ================== MESSAGE ==================
    socket.on("message", async (payload: MessagePayload) => {
      try {
        const { roomId, text, user, cid } = payload || ({} as MessagePayload);
        const t = (text || "").trim();
        if (!roomId || !user || !t) return;

        const msg: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          text: t.slice(0, 2000),
          user,
          ts: Date.now(),
          cid,
        };

        // 1) เก็บ history ใน memory
        const arr = rooms.get(roomId) ?? [];
        arr.push(msg);
        if (arr.length > HISTORY_LIMIT)
          arr.splice(0, arr.length - HISTORY_LIMIT);
        rooms.set(roomId, arr);

        // 2) broadcast ให้คนในห้อง
        io!.to(roomId).emit("message", msg);
        console.log(
          `[message] room=${roomId} user=${user} text="${t.substring(
            0,
            80
          )}" cid=${cid ?? "-"} role=${(socket.data as any).role}`
        );

        // 3) ถ้าเป็นห้องลูกค้า cust:<id> → save DB + unread logic
        const customerId = parseCustomerId(roomId);

        if (customerId) {
          const role =
            (socket.data as any)?.role as
              | "CUSTOMER"
              | "SALE"
              | "MANAGER"
              | "ADMIN"
              | undefined;

          const now = new Date();

          try {
            // 3.1 เก็บ ChatMessage
            await prisma.chatMessage.create({
              data: {
                roomId,
                text: msg.text,
                senderName: user,
                cid: cid != null ? String(cid) : null,
                customerId,
                // ฝั่งที่เป็นคน "ส่ง" ให้ถือว่าอ่านแล้ว
                readByCustomerAt: role === "CUSTOMER" ? now : undefined,
                readBySaleAt: role === "SALE" ? now : undefined,
              },
            });

            // 3.2 เก็บ Communications
            await prisma.communications.create({
              data: {
                customerId,
                chat: msg.text,
                phone: null,
                voiceNote: null,
                userId: (socket.data as any)?.userId ?? null,
              },
            });

            // 3.3 นับ unread แยกฝั่ง
            const [customerUnread, saleUnread] = await Promise.all([
              prisma.chatMessage.count({
                where: {
                  customerId,
                  readByCustomerAt: null,
                },
              }),
              prisma.chatMessage.count({
                where: {
                  customerId,
                  readBySaleAt: null,
                },
              }),
            ]);

            io!.to(roomId).emit("unread-count", {
              roomId,
              customerUnread,
              saleUnread,
            });
          } catch (dbErr) {
            console.error("save chat to DB error:", dbErr);
          }
        } else {
          console.warn(
            "message in non-customer room, skip DB save. roomId=",
            roomId
          );
        }
      } catch (err) {
        console.error("message error:", err);
        socket.emit("error", "Message failed");
      }
    });

    // ================== TYPING ==================
    socket.on("typing", (payload: TypingPayload) => {
      try {
        const { roomId, user, typing } = payload || ({} as TypingPayload);
        if (!roomId || !user) return;
        socket.to(roomId).emit("typing", { user, typing: !!typing });
      } catch (err) {
        console.error("typing error:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("WS disconnected:", socket.id, "reason:", reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO has not been initialized.");
  return io;
};
