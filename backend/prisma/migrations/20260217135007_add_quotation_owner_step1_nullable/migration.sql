-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'WAIT_APPROVAL';

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "createdById" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "managerId" INTEGER;

-- CreateIndex
CREATE INDEX "Quotation_createdById_idx" ON "Quotation"("createdById");

-- CreateIndex
CREATE INDEX "Quotation_approvedById_idx" ON "Quotation"("approvedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
