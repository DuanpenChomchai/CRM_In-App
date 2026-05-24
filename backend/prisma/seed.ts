import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่มต้นการ Seed ข้อมูลระบบ CRM...");

  // 1. แฮชรหัสผ่านสำหรับแต่ละบทบาทการใช้งาน
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
  const managerPasswordHash = await bcrypt.hash("ManagerPassword123!", 10);
  const salePasswordHash = await bcrypt.hash("SalePassword123!", 10);
  const customerPasswordHash = await bcrypt.hash("CustomerPassword123!", 10);

  // 2. สร้าง ADMIN บัญชีผู้ดูแลระบบสูงสุด
  console.log("👥 กำลังสร้างบัญชีผู้ดูแลระบบ (ADMIN)...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@crm.com" },
    update: {
      name: "แอดมิน สูงสุด",
      tol: "+66811111111",
      role: "ADMIN",
    },
    create: {
      name: "แอดมิน สูงสุด",
      email: "admin@crm.com",
      tol: "+66811111111",
      password: adminPasswordHash,
      role: "ADMIN",
    },
  });

  // 3. สร้าง MANAGER บัญชีผู้จัดการฝ่ายขาย
  console.log("👥 กำลังสร้างบัญชีผู้จัดการ (MANAGER)...");
  const manager = await prisma.user.upsert({
    where: { email: "manager@crm.com" },
    update: {
      name: "ผู้จัดการ วันดี",
      tol: "+66822222222",
      role: "MANAGER",
    },
    create: {
      name: "ผู้จัดการ วันดี",
      email: "manager@crm.com",
      tol: "+66822222222",
      password: managerPasswordHash,
      role: "MANAGER",
    },
  });

  // 4. สร้าง SALE บัญชีพนักงานขาย (และเชื่อมต่อให้อยู่ในทีมของ Manager ข้างบน)
  console.log("👥 กำลังสร้างบัญชีฝ่ายขาย (SALE)...");
  const sale = await prisma.user.upsert({
    where: { email: "sale@crm.com" },
    update: {
      name: "เซลล์ นำโชค",
      tol: "+66833333333",
      role: "SALE",
      managerId: manager.id,
    },
    create: {
      name: "เซลล์ นำโชค",
      email: "sale@crm.com",
      tol: "+66833333333",
      password: salePasswordHash,
      role: "SALE",
      managerId: manager.id,
    },
  });

  // 5. สร้างข้อมูลอสังหาริมทรัพย์จำลอง (PROPERTY) เพื่อความสวยงามของแดชบอร์ดและการเสนอราคา
  console.log("🏠 กำลังสร้างข้อมูลอสังหาริมทรัพย์จำลอง...");
  const property1 = await prisma.property.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "เดอะ พาโนรามา เรสซิเดนซ์",
      type: "CONDO",
      location: "สุขุมวิท, กรุงเทพฯ",
      address: "123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ",
      price: 4500000.00,
      bedrooms: 1,
      bathrooms: 1,
      size: 45,
      status: "AVAILABLE",
      description: "คอนโดหรูวิวเมือง 360 องศา ใกล้ BTS อโศก พร้อมสิ่งอำนวยความสะดวกครบครัน",
      createdById: admin.id,
    },
  });

  const property2 = await prisma.property.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: "แกรนด์ โฮม ทาวน์โฮม",
      type: "TOWNHOME",
      location: "ลาดพร้าว, กรุงเทพฯ",
      address: "99/8 ซอยลาดพร้าว 101 แขวงคลองเจ้าคุณสิงห์ เขตวังทองหลาง กรุงเทพฯ",
      price: 6800000.00,
      bedrooms: 3,
      bathrooms: 3,
      size: 180,
      status: "AVAILABLE",
      description: "ทาวน์โฮม 3 ชั้น สไตล์โมเดิร์น เดินทางสะดวก ใกล้ทางด่วนและรถไฟฟ้าสายสีเหลือง",
      createdById: admin.id,
    },
  });

  // 6. สร้าง CUSTOMER บัญชีลูกค้า (ประกอบด้วยข้อมูลใน User table และ Customer table)
  console.log("👤 กำลังสร้างบัญชีลูกค้าจำลอง (CUSTOMER)...");
  const customerUser = await prisma.user.upsert({
    where: { email: "customer@crm.com" },
    update: {
      name: "สมชาย รักดี",
      tol: "+66844444444",
      role: "CUSTOMER",
    },
    create: {
      name: "สมชาย รักดี",
      email: "customer@crm.com",
      tol: "+66844444444",
      password: customerPasswordHash,
      role: "CUSTOMER",
    },
  });

  const customerData = await prisma.customer.upsert({
    where: { email: "customer@crm.com" },
    update: {
      name: "สมชาย รักดี",
      tol: "+66844444444",
      userId: customerUser.id,
      saleId: sale.id, // มอบหมายให้เซลล์คนข้างบนดูแล
      mainStatus: "NEW",
      productType: "CONDO",
      priceBudget: 5000000.00,
      interestedPropertyId: property1.id,
    },
    create: {
      name: "สมชาย รักดี",
      email: "customer@crm.com",
      tol: "+66844444444",
      userId: customerUser.id,
      saleId: sale.id, // มอบหมายให้เซลล์คนข้างบนดูแล
      mainStatus: "NEW",
      productType: "CONDO",
      priceBudget: 5000000.00,
      interestedPropertyId: property1.id,
    },
  });

  console.log("✨ Seeding ข้อมูลระบบ CRM เสร็จสมบูรณ์แล้ว!");
  console.log("-----------------------------------------");
  console.log("📊 รายการบัญชีผู้ใช้ตั้งต้น:");
  console.log("🛡️ [ADMIN]    Email: admin@crm.com    | Password: AdminPassword123!");
  console.log("💼 [MANAGER]  Email: manager@crm.com  | Password: ManagerPassword123!");
  console.log("⚡ [SALE]     Email: sale@crm.com     | Password: SalePassword123!");
  console.log("👤 [CUSTOMER] Email: customer@crm.com | Password: CustomerPassword123!");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ เกิดข้อผิดพลาดในการ Seeding ข้อมูล:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
