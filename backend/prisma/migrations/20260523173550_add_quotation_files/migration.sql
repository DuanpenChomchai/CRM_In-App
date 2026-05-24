-- CreateTable
CREATE TABLE "QuotationFile" (
    "id" SERIAL NOT NULL,
    "quotationId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationFile_quotationId_idx" ON "QuotationFile"("quotationId");

-- AddForeignKey
ALTER TABLE "QuotationFile" ADD CONSTRAINT "QuotationFile_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
