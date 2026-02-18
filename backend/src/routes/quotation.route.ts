import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyRoles } from "../middlewares/verifyRoles";

import {
  createQuotation,
  updateQuotation,
  listQuotations,
  getQuotationById,
  generateQuotationPDF,
  approveQuotation,
} from "../controller/quotationController";

const router = Router();

/** CREATE: Sale/Manager/Admin */
router.post("/", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), createQuotation);

/** LIST: Sale/Manager/Admin */
router.get("/", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), listQuotations);

/** GET BY ID: Sale/Manager/Admin */
router.get("/:id", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), getQuotationById);

/** UPDATE: Sale/Manager/Admin (เงื่อนไข owner/ทีม/สถานะ ไปเช็คใน controller) */
router.patch("/:id", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), updateQuotation);

/** PDF: Sale/Manager/Admin */
router.get("/:id/pdf", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), generateQuotationPDF);

/** APPROVE: Manager/Admin */
router.post("/:id/approve", authMiddleware, verifyRoles("MANAGER", "ADMIN"), approveQuotation);

export default router;
