import { Router } from "express";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controller/userController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { verifyAdmin } from "../middlewares/verifyAdmin";

const router = Router();

router.get("/", authMiddleware, listUsers);
router.get("/:id", authMiddleware, getUserById);

router.post("/", authMiddleware, verifyAdmin, createUser);
router.patch("/:id", authMiddleware, verifyAdmin, updateUser);
router.delete("/:id", authMiddleware, verifyAdmin, deleteUser);

export default router;
