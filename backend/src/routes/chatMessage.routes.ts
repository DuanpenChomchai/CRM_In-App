import { Router } from "express";
import multer from "multer";
import { verifyToken, requireRoles } from "../middlewares/authMiddleware";
import {
  getMessagesByRoom,
  getMessagesByCustomer,
  getMyChatMessages,
  markRoomAsRead,
} from "../controller/chatMessageController";
import { uploadChatFile } from "../controller/uploadController";
import { sendChatMessage } from "../controller/sendChatController";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/**
 * helper: แปลง roomId ("cust:3") -> customerId (3)
 */
function parseCustomerId(roomId: string): number | null {
  const parts = String(roomId).split(":");
  if (parts[0] !== "cust") return null;
  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ====== HISTORY ======

router.get(
  "/room/:roomId",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "MANAGER", "ADMIN"),
  (req, res) => {
    const { roomId } = req.params;
    const customerId = parseCustomerId(roomId);
    if (customerId) {
      (req as any).params.customerId = String(customerId);
      return getMessagesByCustomer(req, res);
    }
    return getMessagesByRoom(req, res);
  }
);

router.get(
  "/customer/:customerId",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getMessagesByCustomer
);

router.get(
  "/my-messages",
  verifyToken,
  requireRoles("CUSTOMER"),
  getMyChatMessages
);

// ====== MARK READ ======

router.post(
  "/mark-read",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "ADMIN", "MANAGER"),
  markRoomAsRead
);

// ====== NEW: UPLOAD + SEND ======

/**
 * POST /api/chat/upload
 * multipart/form-data: file
 */
router.post(
  "/upload",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "ADMIN", "MANAGER"),
  upload.single("file"),
  uploadChatFile
);

/**
 * POST /api/chat/send
 * body: { roomId, customerId?, cid?, type, text?, fileKey?, fileName?, fileMime?, fileSize? }
 */
router.post(
  "/send",
  verifyToken,
  requireRoles("CUSTOMER", "SALE", "ADMIN", "MANAGER"),
  sendChatMessage
);

export default router;
