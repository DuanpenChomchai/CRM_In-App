import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

/**
 * ใช้แบบ:
 * verifyRoles("SALE", "MANAGER", "ADMIN")
 */
export const verifyRoles = (...allowed: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "ไม่ได้รับอนุญาต (ไม่พบข้อมูลผู้ใช้)" });
      }

      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: "ไม่มีสิทธิ์ใช้งาน" });
      }

      next();
    } catch (error) {
      console.error("verifyRoles Error:", error);
      return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
    }
  };
};
