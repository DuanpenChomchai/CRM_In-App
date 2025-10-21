import express from "express";
import { register, login, logout } from "../controller/authController";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

export default router;
