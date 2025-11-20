// src/routes/customersRoutes.ts
import { Router } from "express";
import {
  getAllCustomers,
  getNewCustomers,
  getCustomersBySale,
  getCustomerById,
  createCustomer,
  updateCustomer,
  assignSales,
  deleteCustomer,
  getMyAssignedSale,
} from "../controller/customersController";

import { verifyToken, requireRoles } from "../middlewares/authMiddleware";

const router = Router();

/** ดึงลูกค้าทั้งหมด */
router.get(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getAllCustomers
);

/** ลูกค้าใหม่ที่ยังไม่ assign */
router.get(
  "/new",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getNewCustomers
);

/** ✅ ลูกค้าตามเซลล์ (ใช้ในแอป role=SALE) */
router.get(
  "/sale/:saleId",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getCustomersBySale
);

/** ✅ เซลล์ที่ดูแลลูกค้าที่ล็อกอิน (ใช้ในแอป role=CUSTOMER) */
router.get(
  "/my-sale",
  verifyToken,
  requireRoles("CUSTOMER"),
  getMyAssignedSale
);

/** รายละเอียดลูกค้ารายคน */
router.get(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getCustomerById
);

/** สร้างลูกค้าใหม่จาก Web CRM */
router.post(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  createCustomer
);

/** อัปเดตลูกค้า */
router.put(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  updateCustomer
);

/** มอบหมายเซลล์ให้ลูกค้า */
router.patch(
  "/:id/assign-sale",
  verifyToken,
  requireRoles("MANAGER", "ADMIN"),
  assignSales
);

/** ลบลูกค้า */
router.delete(
  "/:id",
  verifyToken,
  requireRoles("MANAGER", "ADMIN"),
  deleteCustomer
);

export default router;
