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

import { initWs } from "./ws";

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

  app.use("/api", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/communications", communicationRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/chat", chatMessageRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/chat", chatRoutes);

  app.use("/api/pipeline", pipelineRoutes);
  app.use("/api/quotations", quotationRoutes);

  // ✅ ของใหม่ที่ FE ใช้จริง
  app.use("/api/properties", propertiesRoutes);

  // ✅ กันโค้ดเก่าที่เคยเรียก /api/products (ถ้ามีหน้าอื่นใช้)
  app.use("/api/products", propertiesRoutes);

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
