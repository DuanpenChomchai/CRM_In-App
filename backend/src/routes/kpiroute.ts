import express from "express";
import {
  getAllKpi,
  getKpiSummary,
  createKpi,
} from "../controller/kpiController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authMiddleware, getAllKpi);
router.get("/summary", authMiddleware, getKpiSummary);
router.post("/", authMiddleware, createKpi);

export default router;
