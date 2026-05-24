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
  deleteQuotation,
  uploadQuotationFile,
  deleteQuotationFile,
  downloadQuotationFile,
  upload,
} from "../controller/quotationController";

const router = Router();

/** CREATE */
router.post("/", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), createQuotation);

/** LIST */
router.get("/", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), listQuotations);

/** FILE ROUTES — ต้องอยู่ก่อน /:id เพื่อกัน conflict */
router.post(
  "/:id/files",
  authMiddleware,
  verifyRoles("SALE", "MANAGER", "ADMIN"),
  upload.single("file"),
  uploadQuotationFile,
);
router.delete(
  "/:id/files/:fileId",
  authMiddleware,
  verifyRoles("SALE", "MANAGER", "ADMIN"),
  deleteQuotationFile,
);
router.get(
  "/:id/files/:fileId/download",
  authMiddleware,
  verifyRoles("SALE", "MANAGER", "ADMIN"),
  downloadQuotationFile,
);

/** GET BY ID */
router.get("/:id", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), getQuotationById);

/** UPDATE */
router.patch("/:id", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), updateQuotation);

/** PDF */
router.get("/:id/pdf", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), generateQuotationPDF);

/** APPROVE */
router.post("/:id/approve", authMiddleware, verifyRoles("MANAGER", "ADMIN"), approveQuotation);

/** DELETE */
router.delete("/:id", authMiddleware, verifyRoles("SALE", "MANAGER", "ADMIN"), deleteQuotation);

export default router;