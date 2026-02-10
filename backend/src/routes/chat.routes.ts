// chat.routes.ts
import { Router } from "express";
import multer from "multer";
import { verifyToken, requireRoles } from "../middlewares/authMiddleware";
import { sendChatMessage } from "../controller/sendChatController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ✅ log ทุก request ที่เข้ามาที่ /api/chat/*
router.use((req, _res, next) => {
  console.log(`[CHAT:ROUTER] ${req.method} ${req.originalUrl}`);
  next();
});

// ✅ log เฉพาะ /send แบบชัดๆ (ก่อน verifyToken)
router.post("/send", (req, _res, next) => {
  console.log("[CHAT:ROUTES] HIT /api/chat/send body=", {
    roomId: req.body?.roomId,
    customerId: req.body?.customerId,
    type: req.body?.type,
    cid: req.body?.cid,
    fileKey: req.body?.fileKey,
  });
  next();
});

router.post(
  "/send",
  verifyToken,
  requireRoles("CUSTOMER", "SALE"),
  sendChatMessage
);

export default router;
