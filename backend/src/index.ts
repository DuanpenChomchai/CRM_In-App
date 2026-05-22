// src/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";

import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import communicationRoutes from "./routes/communication.route";
import customerRoutes from "./routes/customers.route";
import chatMessageRoutes from "./routes/chatMessage.routes";
import fileRoutes from "./routes/file.routes";
import chatRoutes from "./routes/chat.routes";
import pipelineRoutes from "./routes/pipeline.route";
import quotationRoutes from "./routes/quotation.route";
import propertiesRoutes from "./routes/Properties.route";
import callRoutes from "./routes/call.route";
import dashboardRoutes from "./routes/dashboard.route";
import notificationRoutes from "./routes/notification.route";
import settingRoutes from "./routes/setting.route";

import { initWs } from "./ws";
import { getProfile } from "./controller/userController";

async function main() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // =========================
  // CORS
  // =========================
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // =========================
  // Body parsers
  // =========================
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // =========================
  // ✅ Request logger (ช่วย debug)
  // =========================
  app.use((req, res, next) => {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(`[HTTP] ${method} ${originalUrl} -> ${res.statusCode} (${ms}ms)`);
    });

    next();
  });

  // =========================
  // Health
  // =========================
  app.get("/", (_req, res) => res.json({ ok: true }));

  // =========================
  // ✅ Guard กันเรียก method ผิด (เคส GET /api/chat/upload)
  // =========================
  app.all("/api/chat/upload", (req, res, next) => {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed. Use POST /api/chat/upload" });
    }
    next();
  });

  // =========================
  // Routes
  // =========================
  app.use("/api", authRoutes);

  app.use("/api/users", userRoutes);
  app.use("/api/communications", communicationRoutes);
  app.use("/api/customers", customerRoutes);

  // ✅ ไฟล์: /api/files/...
  app.use("/api/files", fileRoutes);

  // ✅ แชท (upload/send) ก่อน
  app.use("/api/chat", chatRoutes);

  // ✅ แชท (history/room/mark-read) ทีหลัง
  app.use("/api/chat", chatMessageRoutes);

  // ✅ Pipeline & Quotation
  app.use("/api/pipeline", pipelineRoutes);
  app.use("/api/quotations", quotationRoutes);

  // ✅ Properties
  app.use("/api/properties", propertiesRoutes);
  app.use("/api/products", propertiesRoutes); // backward compat

  // ✅ Calls
  app.use("/api/calls", callRoutes);
  // ✅ Dashboard
  app.use("/api/dashboard", dashboardRoutes);
  // ✅ Notifications
  app.use("/api/notifications", notificationRoutes);
  // ✅ Settings (AppSetting)
  app.use("/api/settings", settingRoutes);

  // ✅ profile route
  app.get("/api/myprofile/:id", getProfile);

  console.log(
    "SERVER START with JWT_SECRET =",
    process.env.JWT_SECRET ? "[SET]" : "[MISSING]"
  );

  const server = http.createServer(app);
  initWs(server);

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
