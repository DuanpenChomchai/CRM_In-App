import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware";
import { getFileObject } from "../controller/fileController";

const router = Router();

// GET /api/files/object?key=chat/....
router.get("/object", verifyToken, getFileObject);

export default router;
