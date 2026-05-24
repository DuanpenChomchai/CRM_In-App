require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    take: 5,
    include: {
      user: true,
      sale: true
    }
  });
  console.log("Customers:");
  console.dir(customers, { depth: null });
}

main().finally(() => prisma.$disconnect());
