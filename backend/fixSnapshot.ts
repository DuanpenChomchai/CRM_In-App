import prisma from "./src/config/prismaclient";

async function fixSnapshots() {
  const deals = await prisma.closedDeal.findMany({
    where: {
      snapshotProductType: null,
    },
    include: {
      customer: {
        select: { productType: true, priceBudget: true }
      }
    }
  });

  console.log(`พบ ${deals.length} deals ที่ต้อง fix`);

  for (const deal of deals) {
    await (prisma.closedDeal as any).update({
      where: { id: deal.id },
      data: {
        snapshotProductType: deal.customer.productType ?? null,
        snapshotPriceBudget: deal.customer.priceBudget ?? null,
      }
    });
    console.log(`Fixed deal id: ${deal.id}`);
  }

  console.log("เสร็จแล้ว!");
}

fixSnapshots()
  .catch(console.error)
  .finally(() => prisma.$disconnect());