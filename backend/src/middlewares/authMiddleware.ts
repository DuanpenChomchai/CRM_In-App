// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

/**
 * ตรวจสอบ JWT ว่าถูกต้องไหม
 * (ตัวหลัก ใช้ชื่อเดิม = authMiddleware)
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "ไม่ได้รับอนุญาต (token หายหรือไม่ถูกต้อง)",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dev_secret";

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
};

// เผื่อจะใช้ชื่อ verifyToken ในไฟล์ใหม่ ๆ ก็ได้
export const verifyToken = authMiddleware;

/**
 * ตรวจสอบ role ว่าต้องเป็น ADMIN เท่านั้น
 */
export const verifyAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถทำรายการนี้ได้",
    });
  }

  next();
};

/**
 * ตรวจสอบว่า user ต้องมี Role ตามที่กำหนด
 * เช่น requireRoles("SALE", "MANAGER")
 */
export const requireRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `ต้องเป็นหนึ่งในสิทธิ์: ${roles.join(", ")}`,
      });
    }

    next();
  };
};
