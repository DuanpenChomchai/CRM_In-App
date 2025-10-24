import express from "express";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controller/customersController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = express.Router();
router.get("/", authMiddleware, getCustomers);
router.post("/", authMiddleware, createCustomer);
router.put("/:id", authMiddleware, updateCustomer);
router.delete("/:id", authMiddleware, deleteCustomer);
export default router;
