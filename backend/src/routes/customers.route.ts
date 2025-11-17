import { Router } from "express";
import { getAllCustomers, createCustomer, updateCustomer, assignSales } from "../controller/customersController";
import { authMiddleware } from "../middlewares/authMiddleware";
import  { verifyAdmin } from "../middlewares/verifyAdmin";

const router = Router();

// ต้องล็อกอินก่อนถึงจะดูได้
router.get("/", authMiddleware, getAllCustomers);

// เพิ่มลูกค้า (เฉพาะแอดมิน)
router.post("/", authMiddleware, verifyAdmin, createCustomer);

// อัปเดทข้อมูลลูกค้า
router.put("/:id", authMiddleware, updateCustomer);

// มอบหมายพนักงานขาย
router.patch("/:id/assign-sale", authMiddleware, assignSales);
import express from "express";


router.get("/", getAllCustomers);




export default router;
