import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

/** ตรวจ token พื้นฐาน */
export const verifyToken = (
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

/** alias ให้ชื่อเดิมยังใช้ได้ */
export const authMiddleware = verifyToken;

/** ตรวจ role ว่าต้องเป็น 1 ใน roles ที่กำหนด */
export const requireRoles =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "สิทธิ์ไม่เพียงพอสำหรับการทำรายการนี้",
      });
    }

    next();
  };

/** ตรวจว่าเป็น ADMIN เท่านั้น */
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
