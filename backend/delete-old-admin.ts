import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const oldEmail = "admin@gmail.com";
  const newEmail = "admin@crm.com";

  console.log(`🔍 กำลังค้นหาแอดมินคนเก่า (${oldEmail}) และแอดมินคนใหม่ (${newEmail})...`);

  const oldAdmin = await prisma.user.findUnique({ where: { email: oldEmail } });
  const newAdmin = await prisma.user.findUnique({ where: { email: newEmail } });

  if (!oldAdmin) {
    console.error(`❌ ไม่พบข้อมูลแอดมินคนเก่า (${oldEmail}) ในระบบ`);
    return;
  }

  if (!newAdmin) {
    console.error(`❌ ไม่พบข้อมูลแอดมินคนใหม่ (${newEmail}) โปรดทำการรัน Seed แอดมินคนใหม่ก่อน`);
    return;
  }

  console.log(`⚙️ เริ่มโอนย้ายความสัมพันธ์ข้อมูลจาก ID: ${oldAdmin.id} ไปยัง ID: ${newAdmin.id}...`);

  // 1. โอนย้ายอสังหาริมทรัพย์ (Property) ที่แอดมินเก่าเคยสร้าง
  const updatedProperties = await prisma.property.updateMany({
    where: { createdById: oldAdmin.id },
    data: { createdById: newAdmin.id },
  });
  console.log(`🏠 โอนย้ายอสังหาริมทรัพย์สำเร็จ: ${updatedProperties.count} รายการ`);

  // 2. โอนย้ายใบเสนอราคา (Quotation) ที่สร้างโดยแอนมินคนเก่า
  const updatedQuotationsCreated = await prisma.quotation.updateMany({
    where: { createdById: oldAdmin.id },
    data: { createdById: newAdmin.id },
  });
  console.log(`📄 โอนย้ายใบเสนอราคาที่สร้างสำเร็จ: ${updatedQuotationsCreated.count} รายการ`);

  // 3. โอนย้ายใบเสนอราคาที่ได้รับอนุมัติโดยแอดมินคนเก่า
  const updatedQuotationsApproved = await prisma.quotation.updateMany({
    where: { approvedById: oldAdmin.id },
    data: { approvedById: newAdmin.id },
  });
  console.log(`✅ โอนย้ายการอนุมัติใบเสนอราคาสำเร็จ: ${updatedQuotationsApproved.count} รายการ`);

  // 4. โอนย้ายการดูแลลูกค้า (Customer) ที่ผูกกับแอดมินคนเก่า
  const updatedCustomerSales = await prisma.customer.updateMany({
    where: { saleId: oldAdmin.id },
    data: { saleId: newAdmin.id },
  });
  console.log(`👤 โอนย้ายความดูแลลูกค้าสำเร็จ: ${updatedCustomerSales.count} รายการ`);

  // 5. โอนย้าย User ID ของลูกค้า (กรณีลูกค้าล็อกอินผูกกับแอดมินเก่า)
  const updatedCustomerUsers = await prisma.customer.updateMany({
    where: { userId: oldAdmin.id },
    data: { userId: null },
  });
  console.log(`👤 เคลียร์ความเชื่อมโยงบัญชีลูกค้าสำเร็จ: ${updatedCustomerUsers.count} รายการ`);

  // 6. โอนย้ายข้อมูลการติดต่อสื่อสาร (Communications)
  const updatedComms = await prisma.communications.updateMany({
    where: { userId: oldAdmin.id },
    data: { userId: newAdmin.id },
  });
  console.log(`📞 โอนย้ายประวัติการติดต่อสำเร็จ: ${updatedComms.count} รายการ`);

  // 7. โอนย้ายดีลที่ปิดสำเร็จ (Closed Deals)
  const updatedDeals = await prisma.closedDeal.updateMany({
    where: { userId: oldAdmin.id },
    data: { userId: newAdmin.id },
  });
  console.log(`📊 โอนย้ายข้อมูลการปิดดีลสำเร็จ: ${updatedDeals.count} รายการ`);

  // 8. ลบ Active Tokens และ Push Tokens ของแอดมินคนเก่า เพื่อป้องกัน Error
  await prisma.refreshToken.deleteMany({ where: { userId: oldAdmin.id } });
  await prisma.pushToken.deleteMany({ where: { userId: oldAdmin.id } });
  console.log(`🔑 เคลียร์ Token ตั้งต้นสำเร็จ`);

  // 9. ทำการลบแอดมินคนเก่าออกจากระบบอย่างปลอดภัย
  console.log(`🗑️ กำลังดำเนินการลบผู้ใช้แอดมินคนเก่าออกจากระบบ...`);
  await prisma.user.delete({ where: { id: oldAdmin.id } });
  console.log(`🎉 ลบบัญชีแอดมินเก่า (${oldEmail}) เรียบร้อยอย่างปลอดภัยแล้วครับ!`);
}

main()
  .catch((e) => {
    console.error("❌ เกิดข้อผิดพลาดระหว่างย้ายและลบข้อมูล:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
