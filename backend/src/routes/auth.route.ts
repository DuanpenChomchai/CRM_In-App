import { Router } from "express";
import {
  register,
  registerSales,
  registerManager,
  login,
  logout,
  googleLogin,
  me,
  refreshToken
} from "../controller/authController";

import {
  authMiddleware,
  verifyAdmin,
} from "../middlewares/authMiddleware";

const router = Router();

/* ============================
        REGISTER กลุ่มต่าง ๆ
================================*/

// สมัคร user ปกติ
router.post("/register", register);

// สมัคร Sale (ต้องเป็น Admin)
router.post("/register-sale", authMiddleware, verifyAdmin, registerSales);

// สมัคร Manager (ต้องเป็น Admin)
router.post("/register-manager", authMiddleware, verifyAdmin, registerManager);


/* ============================
               LOGIN
================================*/

// Login ปกติ
router.post("/login", login);

// Login ผ่าน Google
router.post("/google", googleLogin);


/* ============================
        USER INFO (ME)
================================*/

// ดึงข้อมูลผู้ใช้งานจาก token
router.get("/me", authMiddleware, me);


/* ============================
          REFRESH TOKEN
================================*/

router.post("/refresh", refreshToken);


/* ============================
              LOGOUT
================================*/

router.post("/logout", logout);


export default router;
