import { PrismaClient } from "@prisma/client";


const isTest = process.env.NODE_ENV === "test";


const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({

    log: isTest ? [] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    if (!isTest) {
      console.log("Connected to the database successfully!");
    }
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    if (!isTest) process.exit(1);
  }
}

ensureDatabaseConnection();

export default prisma;
