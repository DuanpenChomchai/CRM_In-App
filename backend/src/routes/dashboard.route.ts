import { Router } from "express";
import { getDashboardData } from "../controller/dashboardController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getDashboardData);

export default router;
