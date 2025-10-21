import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// เพิ่ม interface ให้ req มี user
export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

/**
 * Middleware: ตรวจสอบ JWT token
 * - อ่านจาก Header: Authorization: Bearer <token>
 * - ถ้า token ถูกต้อง → req.user จะมีข้อมูลผู้ใช้
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "ไม่ได้รับอนุญาต (token หายหรือไม่ถูกต้อง)" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dev_secret";

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      role: string;
    };

    req.user = decoded; // บันทึกข้อมูล user ลงใน req
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Token ไม่ถูกต้องหรือหมดอายุ" });
  }
};
