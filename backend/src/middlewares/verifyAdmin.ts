import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";


export const verifyAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "ไม่ได้รับอนุญาต (ไม่พบข้อมูลผู้ใช้)" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "ต้องเป็นผู้ดูแลระบบ (Admin) เท่านั้น" });
    }

    next(); 
  } catch (error) {
    console.error("verifyAdmin Error:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" });
  }
};
