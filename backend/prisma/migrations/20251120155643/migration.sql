-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('CUSTOMER_TO_SALE', 'SALE_TO_CUSTOMER');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ONGOING', 'COMPLETED', 'MISSED', 'REJECTED', 'CANCELED');

-- AlterTable
ALTER TABLE "Communications" ADD COLUMN     "callId" INTEGER;

-- CreateTable
CREATE TABLE "Call" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER,
    "saleUserId" INTEGER,
    "customerUserId" INTEGER,
    "direction" "CallDirection" NOT NULL,
    "status" "CallStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "recordingKey" TEXT,
    "recordingDurationSec" INTEGER,
    "transcript" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Call_customerId_idx" ON "Call"("customerId");

-- CreateIndex
CREATE INDEX "Call_saleUserId_idx" ON "Call"("saleUserId");

-- CreateIndex
CREATE INDEX "Call_customerUserId_idx" ON "Call"("customerUserId");

-- CreateIndex
CREATE INDEX "Call_startedAt_idx" ON "Call"("startedAt");

-- CreateIndex
CREATE INDEX "Communications_callId_idx" ON "Communications"("callId");

-- AddForeignKey
ALTER TABLE "Communications" ADD CONSTRAINT "Communications_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_saleUserId_fkey" FOREIGN KEY ("saleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
