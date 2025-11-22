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
 * helper: แปลง roomId ("cust:3") -> customerId (3)
 */
function parseCustomerId(roomId: string): number | null {
  const parts = String(roomId).split(":"); // "cust:3" -> ["cust", "3"]
  if (parts[0] !== "cust") return null;

  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * ดูประวัติแชทของห้อง (ใช้ได้ทั้งลูกค้า / เซลล์ / manager / admin)
 *
 * - ถ้า roomId เป็น "cust:3" => จะไปดึงตาม customerId = 3 (ใช้ getMessagesByCustomer)
 * - ถ้า roomId เป็น "general", "dev", "sales" => ใช้ getMessagesByRoom แบบเดิม
 */
router.get(
  "/room/:roomId",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "MANAGER", "ADMIN"),
  (req, res) => {
    const { roomId } = req.params;

    const customerId = parseCustomerId(roomId);
    if (customerId) {
      // case: roomId เป็น cust:<id> -> ใช้ controller ฝั่ง customer
      (req as any).params.customerId = String(customerId);
      return getMessagesByCustomer(req, res);
    }

    // case: ห้องทั่วไป (general/dev/...) -> ใช้ตาม roomId ปกติ
    return getMessagesByRoom(req, res);
  }
);

/**
 * ดูประวัติแชทของลูกค้าคนหนึ่ง (ฝั่ง CRM / manager / admin)
 * ใช้กับเว็บ CRM / ฝั่งเซลล์/ผู้จัดการ ที่เลือกลูกค้าในระบบ
 */
router.get(
  "/customer/:customerId",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getMessagesByCustomer
);

/**
 * ฝั่งลูกค้า: ดูประวัติแชทของตัวเอง
 * (กรณีอยากมี endpoint แยกเฉพาะลูกค้า)
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
