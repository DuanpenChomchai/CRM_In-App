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
  uploadProfileImage,
  getUserProfle,
  getProfile,
  getManagersWithTeams,
  assignManager,
} from "../controller/userController";

import { authMiddleware, verifyAdmin, AuthRequest } from "../middlewares/authMiddleware";
import prisma from "../config/prismaclient";
import { upload } from "../middlewares/uploadProfile";

// ✅ ใช้ BUCKET_NAME เพื่อประกอบ URL
import { BUCKET_NAME } from "../config/minioclient";

const router = Router();

const buildProfileImageUrl = (userId: number, filename?: string | null) => {
  if (!filename) return null;
  const base = (process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || "").replace(/\/+$/, "");
  return `${base}/${BUCKET_NAME}/profiles/${userId}/${filename}`;
};

/* ============================
   Mobile App / ผู้ใช้ทั่วไป
   ============================ */
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

// ✅ อัปโหลดรูปโปรไฟล์
router.put("/me/profile-image", authMiddleware, upload.single("img"), uploadProfileImage);
router.get("/profile-image/:id", authMiddleware, getUserProfle);

/* ============================
   Web CRM — PROFILE
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
        img: true, // filename
        role: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        ...user,
        img: buildProfileImageUrl(user.id, user.img), // ✅ ส่ง URL เต็ม
      },
    });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// อัปเดตโปรไฟล์บนเว็บ (ข้อมูล text ปกติ)
router.put("/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, email, tol } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(tol !== undefined ? { tol } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        tol: true,
        img: true, // filename
        role: true,
      },
    });

    return res.json({
      message: "Profile updated",
      user: {
        ...updated,
        img: buildProfileImageUrl(updated.id, updated.img), // ✅ ส่ง URL เต็ม
      },
    });
  } catch (err) {
    console.error("PUT /profile error:", err);
    return res.status(400).json({ message: "Update failed" });
  }
});

// (ทางเลือก) อัปโหลดรูปโปรไฟล์สำหรับหน้าเว็บ (ใช้ตัวเดียวกับ /me/profile-image ได้)
router.put("/profile/profile-image", authMiddleware, upload.single("img"), uploadProfileImage);

/* ============================
   Web CRM (Admin / Manager)
   ============================ */

router.get("/sales", authMiddleware, verifyAdmin, listSales);
// ดึงรายชื่อเซลล์สำหรับ dropdown (ทุก role เข้าได้ แค่ login)
router.get("/sales-list", authMiddleware, listSales);
// จัดการทีม manager
router.get("/managers-with-teams", authMiddleware, verifyAdmin, getManagersWithTeams);
router.patch("/sales/:saleId/assign-manager", authMiddleware, verifyAdmin, assignManager);
router.get("/", authMiddleware, verifyAdmin, listUsers);
router.get("/:id", authMiddleware, verifyAdmin, getUserById);
router.post("/", authMiddleware, verifyAdmin, createUser);
router.put("/:id", authMiddleware, verifyAdmin, updateUser);
router.delete("/:id", authMiddleware, verifyAdmin, deleteUser);


export default router;
