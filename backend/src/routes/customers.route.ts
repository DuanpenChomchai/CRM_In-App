import { Router } from "express";
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  assignSales,
  deleteCustomer,
  getMyAssignedSale,
} from "../controller/customersController";

import { verifyToken, requireRoles } from "../middlewares/authMiddleware";

const router = Router();

/**
 * ดึงลูกค้าทั้งหมด
 * GET /api/customers
 * จำกัดสิทธิ์: SALE, MANAGER, ADMIN เท่านั้น
 */
router.get(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  getAllCustomers
);

/**
 * >>> ดึง "เซลล์ที่ดูแลลูกค้าที่ล็อกอิน"  <<<
 * GET /api/customers/my-sale
 * จำกัดสิทธิ์: CUSTOMER เท่านั้น
 */
router.get(
  "/my-sale",
  verifyToken,
  requireRoles("CUSTOMER"),
  getMyAssignedSale
);

/**
 * สร้างลูกค้าใหม่จากฝั่ง Web CRM
 * POST /api/customers
 * จำกัดสิทธิ์: SALE, MANAGER, ADMIN
 */
router.post(
  "/",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  createCustomer
);

/**
 * อัปเดตข้อมูลลูกค้า
 * PUT /api/customers/:id
 * จำกัดสิทธิ์: SALE, MANAGER, ADMIN
 */
router.put(
  "/:id",
  verifyToken,
  requireRoles("SALE", "MANAGER", "ADMIN"),
  updateCustomer
);

/**
 * มอบหมายพนักงานขายให้ลูกค้า
 * PATCH /api/customers/:id/assign-sale
 * จำกัดสิทธิ์: MANAGER, ADMIN
 */
router.patch(
  "/:id/assign-sale",
  verifyToken,
  requireRoles("MANAGER", "ADMIN"),
  assignSales
);

/**
 * ลบลูกค้า
 * DELETE /api/customers/:id
 * จำกัดสิทธิ์: MANAGER, ADMIN
 */
router.delete(
  "/:id",
  verifyToken,
  requireRoles("MANAGER", "ADMIN"),
  deleteCustomer
);

export default router;
