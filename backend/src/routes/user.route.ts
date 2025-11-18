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
} from "../controller/userController";
import { authMiddleware, verifyAdmin } from "../middlewares/authMiddleware";

const router = Router();

/* ============================
   ส่วนที่ใช้ใน Mobile App / ผู้ใช้ทั่วไป
   ============================ */

// ดึงข้อมูล user จาก token
router.get("/me", authMiddleware, getMe);

// แก้ไขโปรไฟล์ตัวเอง
router.put("/me", authMiddleware, updateMe);

/* ============================
   ส่วนที่ใช้ใน Web CRM (Admin / Manager)
   ============================ */

// list users (default ไม่เอา CUSTOMER ถ้าไม่ได้ส่ง role)
router.get("/", authMiddleware, verifyAdmin, listUsers);

// สร้าง user ใหม่ (ใช้ใน backend / CRM)
router.post("/", authMiddleware, verifyAdmin, createUser);

// get user by id
router.get("/:id", authMiddleware, verifyAdmin, getUserById);

// update user by id
router.put("/:id", authMiddleware, verifyAdmin, updateUser);

// delete user
router.delete("/:id", authMiddleware, verifyAdmin, deleteUser);

export default router;
