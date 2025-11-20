// src/routes/userRoutes.ts
import { Router } from "express";
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  listSales,
} from "../controller/userController";
import { authMiddleware, verifyAdmin } from "../middlewares/authMiddleware";

const router = Router();

/* ============================
   Mobile App / ผู้ใช้ทั่วไป
   ============================ */
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

/* ============================
   Web CRM (Admin / Manager)
   ============================ */

// ⭐ ต้องวาง /sales ก่อน /:id เสมอ
router.get(
  "/sales",
  authMiddleware,
  verifyAdmin,   // หรือถ้าอยากให้ SALE ดูด้วย เดี๋ยวค่อยเปลี่ยนทีหลัง
  listSales
);

// list users (default ไม่เอา CUSTOMER ถ้าไม่ส่ง role)
router.get("/", authMiddleware, verifyAdmin, listUsers);

// get user by id
router.get("/:id", authMiddleware, verifyAdmin, getUserById);

// create user
router.post("/", authMiddleware, verifyAdmin, createUser);

// update user by id
router.put("/:id", authMiddleware, verifyAdmin, updateUser);

// delete user
router.delete("/:id", authMiddleware, verifyAdmin, deleteUser);

export default router;
