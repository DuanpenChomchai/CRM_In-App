import { Router } from "express";
import {
  register,
  registerSales,
  registerManager,
  login,
  logout,
} from "../controller/authController";

import {
  authMiddleware,
  verifyAdmin,
} from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);

router.post("/register-sale", authMiddleware, verifyAdmin, registerSales);

router.post("/register-manager", authMiddleware, verifyAdmin, registerManager);

router.post("/login", login);
router.post("/logout", logout);

export default router;
