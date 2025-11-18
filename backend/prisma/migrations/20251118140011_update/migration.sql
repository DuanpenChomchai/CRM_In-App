-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "priceBudget" DECIMAL(12,2),
ADD COLUMN     "productType" TEXT,
ADD COLUMN     "saleId" INTEGER,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Customer_saleId_idx" ON "Customer"("saleId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
