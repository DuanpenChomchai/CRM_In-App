import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };

  // ✅ เพิ่มเพื่อให้รองรับ multer (upload รูป)
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

/**
 * ✅ ดึง token ได้ทั้ง 2 แบบ:
 * 1) Authorization: Bearer <token>  (ปกติสำหรับ fetch/axios)
 * 2) query string ?t=<token>        (จำเป็นสำหรับ <img src="..."> เพราะใส่ header ไม่ได้)
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1] || null;
  }

  const t = (req.query as any)?.t;
  if (typeof t === "string" && t.trim().length > 0) return t.trim();

  return null;
};

/** ตรวจ token พื้นฐาน */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        message: "ไม่ได้รับอนุญาต (token หายหรือไม่ถูกต้อง)",
      });
    }

    const secret = process.env.JWT_SECRET || "dev_secret";

    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      role: string;
    };

    // ✅ normalize id เป็น number เผื่อ jwt payload เป็น string
    req.user = {
      id: Number(decoded.id),
      email: decoded.email,
      role: decoded.role,
    };

    return next();
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

    return next();
  };

/** ตรวจว่าเป็น ADMIN เท่านั้น */
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถทำรายการนี้ได้",
    });
  }

  return next();
};
