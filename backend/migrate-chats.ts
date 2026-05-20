import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting chat migration...");

  const oldMessages = await prisma.chatMessage.findMany({
    where: {
      roomId: {
        startsWith: "cust:",
        not: {
          contains: ":sale:",
        },
      },
    },
    select: {
      roomId: true,
      customerId: true,
    },
    distinct: ["roomId"],
  });

  console.log(`Found ${oldMessages.length} distinct old rooms to migrate.`);

  let migrated = 0;

  for (const msg of oldMessages) {
    if (msg.roomId.startsWith("admin:cust:")) {
        continue;
    }

    if (msg.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: msg.customerId },
        select: { saleId: true },
      });

      if (customer && customer.saleId) {
        const newRoomId = `cust:${msg.customerId}:sale:${customer.saleId}`;
        const updated = await prisma.chatMessage.updateMany({
          where: { roomId: msg.roomId },
          data: { roomId: newRoomId },
        });
        console.log(`Migrated room ${msg.roomId} to ${newRoomId} (${updated.count} messages)`);
        migrated++;
      } else {
        console.log(`Skipping room ${msg.roomId}, no sale assigned to customer ${msg.customerId}`);
      }
    }
  }

  console.log(`Migration complete. Migrated ${migrated} rooms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
