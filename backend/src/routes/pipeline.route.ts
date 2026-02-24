import express from "express";
import { getPipelineBoard, moveCustomerStage } from "../controller/pipelineController";
import {authMiddleware} from "../middlewares/authMiddleware";
import {verifyRoles} from "../middlewares/verifyRoles";

const router = express.Router();

router.get(
  "/board",
  authMiddleware,
  getPipelineBoard
);

router.patch(
  "/move",
  authMiddleware,
  moveCustomerStage
);

export default router;
