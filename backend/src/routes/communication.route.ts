import { Router } from "express";
import {
  listCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  deleteCommunication,
  getMyChatHistory,  
} from "../controller/communicationController";

import { verifyToken, requireRoles } from "../middlewares/authMiddleware";

const router = Router();

/**
 * สำหรับ admin / sale / manager ใช้ดูทั้งหมด / filter
 */
router.get(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  listCommunications
);

router.get(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getCommunicationById
);

/**
 * ✅ ลูกค้า (CUSTOMER) ดูประวัติแชทของตัวเอง
 * GET /api/communications/my-chats
 */
router.get(
  "/my-chats",
  verifyToken,
  requireRoles("CUSTOMER"),
  getMyChatHistory
);

/**
 * สร้าง / อัปเดต / ลบ (ตามสิทธิ์ที่คุณต้องการ)
 */
router.post(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  createCommunication
);

router.put(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  updateCommunication
);

router.delete(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  deleteCommunication
);

export default router;
