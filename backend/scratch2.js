require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true, name: true, role: true }
  });
  console.log("Found admins:", admins);
}

main().finally(() => prisma.$disconnect());
