import { Router } from "express";
import { verifyToken, requireRoles } from "../middlewares/authMiddleware";
import {
  getMessagesByRoom,
  getMessagesByCustomer,
  getMyChatMessages,
  markRoomAsRead, 
} from "../controller/chatMessageController";

const router = Router();

/**
 * ดูประวัติแชทของห้อง (ใช้ได้ทั้งลูกค้า / เซลล์ / manager / admin)
 */
router.get(
  "/room/:roomId",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "MANAGER", "ADMIN"),
  getMessagesByRoom
);

/**
 * ดูประวัติแชทของลูกค้าคนหนึ่ง (ฝั่ง CRM / manager / admin)
 */
router.get(
  "/customer/:customerId",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getMessagesByCustomer
);

/**
 * ฝั่งลูกค้า: ดูประวัติแชทของตัวเอง
 */
router.get(
  "/my-messages",
  verifyToken,
  requireRoles("CUSTOMER"),
  getMyChatMessages
);

/**
 * mark ห้องว่า "อ่านแล้ว"
 * body: { customerId: number }
 * ใช้ได้ทั้ง CUSTOMER และ SALE
 */
router.post(
  "/mark-read",
  verifyToken,
  requireRoles("CUSTOMER", "SALE"),
  markRoomAsRead
);

export default router;
