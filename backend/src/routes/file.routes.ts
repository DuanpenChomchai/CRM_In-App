import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware";
import { getFileObject, getSignedUrl } from "../controller/fileController";

const router = Router();

// GET /api/files/object?key=chat/....
router.get("/object", verifyToken, getFileObject);

// GET /api/files/signed?key=chat/....
router.get("/signed", verifyToken, getSignedUrl);

export default router;
