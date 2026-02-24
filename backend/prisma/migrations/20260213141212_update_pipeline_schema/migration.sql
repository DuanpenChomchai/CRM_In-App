/*
  Warnings:

  - You are about to drop the column `dealStatus` on the `ClosedDeal` table. All the data in the column will be lost.
  - The `status` column on the `ClosedDeal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `result` to the `ClosedDeal` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Contacted` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `mainStatus` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `status` on the `Negotiation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ContactedStatus" AS ENUM ('FOLLOWING_UP', 'WAITING_REPLY', 'APPOINTED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('NEGOTIATING', 'WAITING_CONFIRM', 'COUNTER_OFFER', 'PAUSED');

-- CreateEnum
CREATE TYPE "ClosedDealStatus" AS ENUM ('CLOSED');

-- CreateEnum
CREATE TYPE "DealResult" AS ENUM ('WON', 'LOST');

-- AlterEnum
ALTER TYPE "CustomerStatus" ADD VALUE 'QUOTATION';

-- DropIndex
DROP INDEX "Contacted_customerId_key";

-- AlterTable
ALTER TABLE "ClosedDeal" DROP COLUMN "dealStatus",
ADD COLUMN     "result" "DealResult" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ClosedDealStatus" NOT NULL DEFAULT 'CLOSED';

-- AlterTable
ALTER TABLE "Contacted" DROP COLUMN "status",
ADD COLUMN     "status" "ContactedStatus" NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "interestedPropertyId" INTEGER,
ALTER COLUMN "mainStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "Negotiation" DROP COLUMN "status",
ADD COLUMN     "status" "NegotiationStatus" NOT NULL;

-- CreateIndex
CREATE INDEX "ClosedDeal_result_idx" ON "ClosedDeal"("result");

-- CreateIndex
CREATE INDEX "Contacted_customerId_idx" ON "Contacted"("customerId");

-- CreateIndex
CREATE INDEX "Contacted_stateDate_idx" ON "Contacted"("stateDate");

-- CreateIndex
CREATE INDEX "Contacted_status_idx" ON "Contacted"("status");

-- CreateIndex
CREATE INDEX "Customer_mainStatus_idx" ON "Customer"("mainStatus");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_interestedPropertyId_idx" ON "Customer"("interestedPropertyId");

-- CreateIndex
CREATE INDEX "Negotiation_status_idx" ON "Negotiation"("status");

-- CreateIndex
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_interestedPropertyId_fkey" FOREIGN KEY ("interestedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
