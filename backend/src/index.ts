import express from "express";

import dotenv from "dotenv";
import authRoutes from "./routes/authroute";
const cors = require('cors');

dotenv.config();

const app = express();

// ถ้าอยากยืดหยุ่นหน่อยก็ไปเซตใน .env ได้
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ✅ เปิด CORS แบบกำหนด origin ชัดเจน
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ให้ express อ่าน json ได้
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ เปลี่ยน prefix ให้ตรงกับที่ frontend ใช้
// จะได้มี /api/auth/login, /api/auth/google, /api/auth/me ฯลฯ
app.use("/api/auth", authRoutes);

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
