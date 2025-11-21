// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import authRoutes from "./routes/auth.route";
import { checkBucket } from "./config/minioclient";
import userRoutes from "./routes/user.route";
import communicationRoutes from "./routes/communication.route";
import customerRoutes from "./routes/customers.route";
import chatMessageRoutes from "./routes/chatMessage.routes";
import { registerSocket } from "./socket";

async function main() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_req, res) => res.json({ ok: true }));

  // routes หลักทั้งหมด
  app.use("/api", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/communications", communicationRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/chat", chatMessageRoutes);

  console.log(
    "SERVER START with JWT_SECRET =",
    process.env.JWT_SECRET ? "[SET]" : "[MISSING]"
  );

  try {
    await checkBucket();
  } catch (e) {
    console.error("MinIO checkBucket failed:", e);
  }

  // ⭐ สร้าง HTTP server + WebSocket
  const server = http.createServer(app);
  registerSocket(server); // ← ใช้ registerSocket ใหม่

  server.listen(port, "0.0.0.0", () => {
    console.log(`HTTP + WebSocket running on http://localhost:${port}`);
  });

  process.on("SIGINT", () => {
    console.log("Shutting down…");
    server.close(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
