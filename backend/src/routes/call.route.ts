import { Router } from "express";
import {
  listCalls,
  getCallById,
  getMyCalls,
  createCall,
  updateCall,
  deleteCall,
} from "../controller/callController";

import { verifyToken, requireRoles } from "../middlewares/authMiddleware";

const router = Router();

// ─── ลูกค้า / เซลล์ ดูสายของตนเอง ───
router.get(
  "/my",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "MANAGER", "ADMIN"),
  getMyCalls
);

// ─── Admin / Sale / Manager ดูทั้งหมด + filter ───
router.get(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  listCalls
);

router.get(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN", "CUSTOMER"),
  getCallById
);

// ─── สร้าง / อัปเดต / ลบ ───
router.post(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN", "CUSTOMER"),
  createCall
);

router.put(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN", "CUSTOMER"),
  updateCall
);

router.delete(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  deleteCall
);

export default router;
