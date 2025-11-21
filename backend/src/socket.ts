// src/socket.ts
import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

export let io: Server;

export const registerSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.on("connection", (socket) => {
    console.log("📡 Socket connected:", socket.id);

    // APP หรือ WEB จะส่ง role/userId มาเพื่อ join ห้อง
    socket.on("auth-update", ({ role, userId }) => {
      if (role) socket.join(`role:${role}`);
      if (userId) socket.join(`user:${userId}`);

      console.log(`✅ JOIN ROOMS: role=${role}, user=${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });

  return io;
};
