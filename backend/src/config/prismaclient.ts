import { PrismaClient } from "@prisma/client";

const isTest = process.env.NODE_ENV === "test";

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isTest ? [] : ["warn", "error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ✅ Auto-reconnect เมื่อ connection ถูกตัด
async function connectWithRetry(retries = 5, delay = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      if (!isTest) console.log("Connected to the database successfully!");
      return;
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("All connection attempts failed.");
        if (!isTest) process.exit(1);
      }
    }
  }
}

export async function ensureDatabaseConnection(): Promise<void> {
  await connectWithRetry();
}

// ✅ Reconnect อัตโนมัติเมื่อ connection หลุด
prisma.$on("beforeExit" as never, async () => {
  await prisma.$disconnect();
});

// ✅ Keep-alive query ทุก 30 วินาที ป้องกัน connection timeout
if (!isTest) {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      console.warn("Keep-alive query failed, reconnecting...");
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        console.log("Reconnected to database.");
      } catch (err) {
        console.error("Reconnect failed:", err);
      }
    }
  }, 30000);
}

ensureDatabaseConnection();

export default prisma;