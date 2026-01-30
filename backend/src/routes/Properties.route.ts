import { Router } from "express";
import { upload } from "../middlewares/upload";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyAdmin } from "../middlewares/verifyAdmin";
import {
  listProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyImage,
  uploadPropertyImage,
} from "../controller/PropertiesController";

const router = Router();

/**
 * สำคัญ:
 * - route ที่เฉพาะเจาะจงต้องมาก่อน "/:id"
 * - ใช้ wildcard "/image/*" เพื่อให้ key มี "/" ได้
 */

// ✅ public
router.get("/", listProperties);

// ✅ stream รูปจาก MinIO (รับ key ได้ยาวๆ เช่น properties/14/xxx.jpg)
router.get("/img", getPropertyImage);



// ✅ ดึงรายการ/ตัวเดียว
router.get("/:id", getPropertyById);

// ✅ admin only
router.post("/", authMiddleware, verifyAdmin, createProperty);
router.patch("/:id", authMiddleware, verifyAdmin, updateProperty);

// ✅ FE ยิงอันนี้: POST /api/properties/:id/image (multipart) field = "img"
router.post(
  "/:id/image",
  authMiddleware,
  verifyAdmin,
  upload.single("img"),
  uploadPropertyImage
);

router.delete("/:id", authMiddleware, verifyAdmin, deleteProperty);

export default router;
