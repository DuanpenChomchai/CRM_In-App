// src/ws.ts
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";

type ChatMessage   = { id: string; text: string; user: string; ts: number; cid?: string };
type JoinPayload   = { roomId: string; user: string };
type MessagePayload= { roomId: string; text: string; user: string; cid?: string };
type TypingPayload = { roomId: string; user: string; typing: boolean };

const rooms = new Map<string, ChatMessage[]>(); // roomId -> messages
const HISTORY_LIMIT = 200;

let io: Server | null = null;

export const initWs = (server: HttpServer) => {
  io = new Server(server, {
    cors: { origin: "*" },
    transports: ["websocket"], // ถ้าเน็ตบางที่บล็อก WS ให้ลบบรรทัดนี้เพื่อ fallback เป็น polling
  });

  io.on("connection", (socket) => {
    console.log("WS connected:", socket.id);

    socket.on("join", (payload: JoinPayload) => {
      try {
        const { roomId, user } = payload || ({} as JoinPayload);
        if (!roomId || !user) return socket.emit("error", "Invalid join payload");
        socket.join(roomId);

        if (!rooms.has(roomId)) rooms.set(roomId, []);
        const history = rooms.get(roomId)!;

        socket.emit("history", history);
        socket.to(roomId).emit("system", { text: `${user} joined`, ts: Date.now() });

        console.log(`[join] room=${roomId} user=${user}`);
      } catch (err) {
        console.error("join error:", err);
        socket.emit("error", "Join failed");
      }
    });

    socket.on("message", (payload: MessagePayload) => {
      try {
        const { roomId, text, user, cid } = payload || ({} as MessagePayload); // ✅ ดึง cid
        const t = (text || "").trim();
        if (!roomId || !user || !t) return;

        const msg: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          text: t.slice(0, 2000),
          user,
          ts: Date.now(),
          cid, 
        };

        const arr = rooms.get(roomId) ?? [];
        arr.push(msg);
        if (arr.length > HISTORY_LIMIT) arr.splice(0, arr.length - HISTORY_LIMIT);
        rooms.set(roomId, arr);

        io!.to(roomId).emit("message", msg);
        console.log(`[message] room=${roomId} user=${user} text="${t.substring(0, 80)}" cid=${cid ?? "-"}`);
      } catch (err) {
        console.error("message error:", err);
        socket.emit("error", "Message failed");
      }
    });

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
