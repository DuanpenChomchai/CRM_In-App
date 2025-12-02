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
import { authMiddleware, verifyAdmin, AuthRequest } from "../middlewares/authMiddleware";
import prisma from "../config/prismaclient";

const router = Router();

/* ============================
   Mobile App / ผู้ใช้ทั่วไป
   ============================ */
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

/* ============================
   Web CRM — PROFILE (เพิ่มใหม่)
   ============================ */

// ดึงโปรไฟล์สำหรับหน้าเว็บ
router.get("/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// อัปเดตโปรไฟล์บนเว็บ
router.put("/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, email, tol, img } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, email, tol, img },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true,
        role: true,
      },
    });

    return res.json({
      message: "Profile updated",
      user: updated,
    });
  } catch (err) {
    console.error("PUT /profile error:", err);
    return res.status(400).json({ message: "Update failed" });
  }
});

/* ============================
   Web CRM (Admin / Manager)
   ============================ */

// ⭐ ต้องวาง /sales ก่อน /:id
router.get(
  "/sales",
  authMiddleware,
  verifyAdmin,
  listSales
);

// list users
router.get("/", authMiddleware, verifyAdmin, listUsers);

// get user by id
router.get("/:id", authMiddleware, verifyAdmin, getUserById);

// create user
router.post("/", authMiddleware, verifyAdmin, createUser);

// update user
router.put("/:id", authMiddleware, verifyAdmin, updateUser);

// delete user
router.delete("/:id", authMiddleware, verifyAdmin, deleteUser);

export default router;
