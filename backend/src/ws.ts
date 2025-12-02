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
  const parts = String(roomId).split(":");
  if (parts.length < 2) return null;
  if (parts[0] !== "cust") return null;
  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const initWs = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    //transports: ["websocket"],
  });

  io.on("connection", (socket) => {
    console.log("📡 WS connected:", socket.id);

    // ===== อ่าน auth ตอน handshake =====
    const { token, role, userId } = socket.handshake.auth || {};
    if (role) {
      (socket.data as any).role = role; // "CUSTOMER" | "SALE" | ...
      socket.join(`role:${role}`);
    }
    if (userId) {
      const uidNum = Number(userId);
      (socket.data as any).userId = uidNum;
      socket.join(`user:${uidNum}`);
    }

    if (role || userId) {
      console.log(
        `✅ HANDSHAKE ROOMS: role=${role ?? "-"}, user=${userId ?? "-"}`
      );
    }

    // ===== AUTH UPDATE (ตอนเปลี่ยน user ระหว่างรัน) =====
    socket.on("auth-update", (payload: any) => {
      try {
        const nextRole = payload?.role;
        const nextUserId = payload?.userId;

        if (nextRole) {
          (socket.data as any).role = nextRole;
          socket.join(`role:${nextRole}`);
        }
        if (nextUserId) {
          const uidNum = Number(nextUserId);
          (socket.data as any).userId = uidNum;
          socket.join(`user:${uidNum}`);
        }

        console.log(
          `✅ AUTH-UPDATE: role=${(socket.data as any).role ?? "-"}, user=${
            (socket.data as any).userId ?? "-"
          }`
        );
      } catch (e) {
        console.error("auth-update error:", e);
      }
    });

    // ================== JOIN (ห้องแชท) ==================
    socket.on("join", (payload: JoinPayload) => {
      try {
        const { roomId, user } = payload || ({} as JoinPayload);
        if (!roomId || !user)
          return socket.emit("error", "Invalid join payload");

        socket.join(roomId);

        if (!rooms.has(roomId)) rooms.set(roomId, []);
        const history = rooms.get(roomId)!;

        // ส่ง history จาก memory (ของรอบที่ server ยังไม่ปิด)
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

        // 2) broadcast message ให้คนในห้อง
        io!.to(roomId).emit("message", msg);
        const role = (socket.data as any).role;
        console.log(
          `[message] room=${roomId} user=${user} role=${role} text="${t.substring(
            0,
            80
          )}" cid=${cid ?? "-"}`
        );

        // 3) ถ้าเป็นห้องลูกค้า cust:<id> → save DB + คำนวณ unread
        const customerId = parseCustomerId(roomId);

        if (customerId) {
          const now = new Date();

          try {
            // 3.1 เก็บ ChatMessage ลง DB พร้อม read flag ฝั่งที่ "เป็นคนส่ง"
            await prisma.chatMessage.create({
              data: {
                roomId,
                text: msg.text,
                senderName: user,
                cid: cid != null ? String(cid) : null,
                customerId,
                ...(role === "CUSTOMER"
                  ? { readByCustomerAt: now }
                  : role === "SALE"
                  ? { readBySaleAt: now }
                  : {}),
              },
            });

            // 3.2 เก็บ Communications (ถ้าใช้ใน CRM)
            await prisma.communications.create({
              data: {
                customerId,
                chat: msg.text,
                phone: null,
                voiceNote: null,
                userId: (socket.data as any)?.userId ?? null,
              },
            });

            // 3.3 นับจำนวนข้อความที่ยังไม่อ่านของแต่ละฝั่ง
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

            const payloadUnread = {
              roomId,
              customerUnread,
              saleUnread,
            };

            // 3.4 ส่ง event unread-count ไปให้ทุกคนในห้อง + ทุก socket ตาม role
            io!.to(roomId).emit("unread-count", payloadUnread);
            io!.to("role:CUSTOMER").emit("unread-count", payloadUnread);
            io!.to("role:SALE").emit("unread-count", payloadUnread);

            console.log(
              `💾 saved chat & unread-count: customerId=${customerId}, customerUnread=${customerUnread}, saleUnread=${saleUnread}`
            );
          } catch (dbErr) {
            console.error("❌ save chat to DB error:", dbErr);
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
      console.log("❌ WS disconnected:", socket.id, "reason:", reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.IO has not been initialized.");
  return io;
};
