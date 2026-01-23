import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyAdmin } from "../middlewares/verifyAdmin";
import { upload } from "../middlewares/upload";

import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImages,
  setPropertyCover,
  deletePropertyImage,
} from "../controller/propertycontroller";

const router = Router();

// list + detail (ล็อกอินถึงดูได้)
router.get("/", authMiddleware, getProperties);
router.get("/:id", authMiddleware, getPropertyById);

// admin เท่านั้น
router.post("/", authMiddleware, verifyAdmin, createProperty);
router.put("/:id", authMiddleware, verifyAdmin, updateProperty);
router.delete("/:id", authMiddleware, verifyAdmin, deleteProperty);

router.post(
  "/:id/images",
  authMiddleware,
  verifyAdmin,
  upload.array("images", 10),
  uploadPropertyImages
);

router.patch("/:id/cover", authMiddleware, verifyAdmin, setPropertyCover);
router.delete("/:id/images/:imageId", authMiddleware, verifyAdmin, deletePropertyImage);

export default router;
