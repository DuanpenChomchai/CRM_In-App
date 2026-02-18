/*
  Warnings:

  - You are about to drop the column `productId` on the `QuotationItem` table. All the data in the column will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `propertyId` to the `Quotation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QuotationItem" DROP CONSTRAINT "QuotationItem_productId_fkey";

-- DropIndex
DROP INDEX "QuotationItem_productId_idx";

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "propertyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "QuotationItem" DROP COLUMN "productId";

-- DropTable
DROP TABLE "Product";

-- CreateIndex
CREATE INDEX "Quotation_propertyId_idx" ON "Quotation"("propertyId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
