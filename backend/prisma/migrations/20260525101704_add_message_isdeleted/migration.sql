/*
  Warnings:

  - You are about to drop the column `snapshotPriceBudget` on the `ClosedDeal` table. All the data in the column will be lost.
  - You are about to drop the column `snapshotProductType` on the `ClosedDeal` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClosedDeal" DROP COLUMN "snapshotPriceBudget",
DROP COLUMN "snapshotProductType";
