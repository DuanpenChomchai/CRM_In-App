import { Router } from "express";
import {
  listCommunications,
  getCommunicationById,
  createCommunication,
  updateCommunication,
  deleteCommunication,
} from "../controller/communicationController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyAdmin } from "../middlewares/verifyAdmin";

const router = Router();

router.get("/", authMiddleware, listCommunications);
router.get("/:id", authMiddleware, getCommunicationById);

router.post("/", authMiddleware, createCommunication);
router.patch("/:id", authMiddleware, updateCommunication);
router.delete("/:id", authMiddleware, verifyAdmin, deleteCommunication);

export default router;
