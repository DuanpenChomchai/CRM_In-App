-- ===========================================================
-- 1. DROP TABLES & ENUMS (Optional - เผื่อกรณีต้องการเคลียร์ฐานข้อมูลเก่า)
-- ===========================================================
-- DROP TABLE IF EXISTS "PushToken" CASCADE;
-- DROP TABLE IF EXISTS "ChatMessage" CASCADE;
-- DROP TABLE IF EXISTS "Call" CASCADE;
-- DROP TABLE IF EXISTS "ClosedDeal" CASCADE;
-- DROP TABLE IF EXISTS "Negotiation" CASCADE;
-- DROP TABLE IF EXISTS "QuotationItem" CASCADE;
-- DROP TABLE IF EXISTS "Quotation" CASCADE;
-- DROP TABLE IF EXISTS "Contacted" CASCADE;
-- DROP TABLE IF EXISTS "Communications" CASCADE;
-- DROP TABLE IF EXISTS "Customer" CASCADE;
-- DROP TABLE IF EXISTS "Property" CASCADE;
-- DROP TABLE IF EXISTS "Product" CASCADE;
-- DROP TABLE IF EXISTS "RefreshToken" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;
-- DROP TYPE IF EXISTS "PropertyStatus" CASCADE;
-- DROP TYPE IF EXISTS "PropertyType" CASCADE;
-- DROP TYPE IF EXISTS "DealResult" CASCADE;
-- DROP TYPE IF EXISTS "ClosedDealStatus" CASCADE;
-- DROP TYPE IF EXISTS "NegotiationStatus" CASCADE;
-- DROP TYPE IF EXISTS "ContactedStatus" CASCADE;
-- DROP TYPE IF EXISTS "QuotationStatus" CASCADE;
-- DROP TYPE IF EXISTS "ChatMessageType" CASCADE;
-- DROP TYPE IF EXISTS "CustomerStatus" CASCADE;
-- DROP TYPE IF EXISTS "CallStatus" CASCADE;
-- DROP TYPE IF EXISTS "CallDirection" CASCADE;
-- DROP TYPE IF EXISTS "Role" CASCADE;


-- ===========================================================
-- 2. CREATE ENUMS
-- ===========================================================

CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SALE', 'MANAGER', 'ADMIN');

-- สำหรับการโทร
CREATE TYPE "CallDirection" AS ENUM ('CUSTOMER_TO_SALE', 'SALE_TO_CUSTOMER');

CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ONGOING', 'COMPLETED', 'MISSED', 'REJECTED', 'CANCELED');

-- Pipeline Stage หลัก (Single Source of Truth)
CREATE TYPE "CustomerStatus" AS ENUM ('NEW', 'CONTACTED', 'NEGOTIATING', 'QUOTATION', 'CLOSED');

-- ประเภทข้อความแชท
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

-- สถานะใบเสนอราคา
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'WAIT_APPROVAL', 'SENT', 'APPROVED', 'REJECTED');

-- Status รายละเอียดแต่ละ Stage
CREATE TYPE "ContactedStatus" AS ENUM ('FOLLOWING_UP', 'WAITING_REPLY', 'APPOINTED', 'NOT_INTERESTED');

CREATE TYPE "NegotiationStatus" AS ENUM ('NEGOTIATING', 'WAITING_CONFIRM', 'COUNTER_OFFER', 'PAUSED');

CREATE TYPE "ClosedDealStatus" AS ENUM ('CLOSED');

CREATE TYPE "DealResult" AS ENUM ('WON', 'LOST');

-- สำหรับ PROPERTIES
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'CONDO', 'TOWNHOME');

CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');


-- ===========================================================
-- 3. CREATE TABLES & FOREIGN KEYS
-- ===========================================================

-- [USER TABLE]
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "tol" TEXT NOT NULL UNIQUE,
    "img" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "managerId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [REFRESH TOKEN TABLE]
CREATE TABLE "RefreshToken" (
    "id" SERIAL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- [PRODUCT TABLE]
CREATE TABLE "Product" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12, 2) NOT NULL,
    "property" TEXT,
    "img" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- [PROPERTY TABLE]
CREATE TABLE "Property" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "price" DECIMAL(12, 2) NOT NULL,
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "img" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- [CUSTOMER TABLE]
CREATE TABLE "Customer" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tol" TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "img" TEXT,
    "password" TEXT,
    "productType" TEXT,
    "priceBudget" DECIMAL(12, 2),
    "interestedPropertyId" INTEGER,
    "userId" INTEGER,
    "saleId" INTEGER,
    "mainStatus" "CustomerStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Customer_interestedPropertyId_fkey" FOREIGN KEY ("interestedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Customer_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [CALL TABLE]
CREATE TABLE "Call" (
    "id" SERIAL PRIMARY KEY,
    "customerId" INTEGER,
    "saleUserId" INTEGER,
    "customerUserId" INTEGER,
    "direction" "CallDirection" NOT NULL,
    "status" "CallStatus" NOT NULL,
    "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    "durationSec" INTEGER,
    "recordingKey" TEXT,
    "recordingDurationSec" INTEGER,
    "transcript" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Call_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Call_saleUserId_fkey" FOREIGN KEY ("saleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Call_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [COMMUNICATIONS TABLE]
CREATE TABLE "Communications" (
    "id" SERIAL PRIMARY KEY,
    "phone" TEXT,
    "chat" TEXT,
    "voiceNote" TEXT,
    "customerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "callId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Communications_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Communications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Communications_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [CONTACTED TABLE]
CREATE TABLE "Contacted" (
    "id" SERIAL PRIMARY KEY,
    "status" "ContactedStatus" NOT NULL,
    "topic" TEXT,
    "note" TEXT,
    "stateDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "customerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Contacted_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- [QUOTATION TABLE]
CREATE TABLE "Quotation" (
    "id" SERIAL PRIMARY KEY,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "stateDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terms" TEXT,
    "quotationNumber" TEXT NOT NULL UNIQUE,
    "totalAmount" DECIMAL(12, 2) NOT NULL,
    "note" TEXT,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "propertyId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Quotation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Quotation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [QUOTATION ITEM TABLE]
CREATE TABLE "QuotationItem" (
    "id" SERIAL PRIMARY KEY,
    "quotationId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12, 2) NOT NULL,
    "discount" DECIMAL(5, 2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(12, 2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuotationItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [NEGOTIATION TABLE]
CREATE TABLE "Negotiation" (
    "id" SERIAL PRIMARY KEY,
    "status" "NegotiationStatus" NOT NULL,
    "stateDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "customerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "Negotiation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- [CLOSED DEAL TABLE]
CREATE TABLE "ClosedDeal" (
    "id" SERIAL PRIMARY KEY,
    "status" "ClosedDealStatus" NOT NULL DEFAULT 'CLOSED',
    "result" "DealResult" NOT NULL,
    "stateDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalValue" DECIMAL(12, 2),
    "discount" DECIMAL(12, 2),
    "closingDate" TIMESTAMP WITH TIME ZONE,
    "note" TEXT,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "customerId" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "ClosedDeal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClosedDeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- [CHAT MESSAGE TABLE]
CREATE TABLE "ChatMessage" (
    "id" SERIAL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "text" TEXT,
    "senderName" TEXT NOT NULL,
    "cid" TEXT,
    "customerId" INTEGER,
    "imgMessage" TEXT,
    "fileMessage" TEXT,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readByCustomerAt" TIMESTAMP WITH TIME ZONE,
    "readBySaleAt" TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT "ChatMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    -- กันซ้ำ (cid เดียวกันจากคนเดิมในห้องเดียวกัน)
    CONSTRAINT "ChatMessage_roomId_senderName_cid_key" UNIQUE ("roomId", "senderName", "cid")
);

-- [PUSH TOKEN FOR NOTIFICATIONS TABLE]
CREATE TABLE "PushToken" (
    "id" SERIAL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" INTEGER,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PushToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);


-- ===========================================================
-- 4. CREATE INDEXES
-- ===========================================================

-- RefreshToken Indexes
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- Property Indexes
CREATE INDEX "Property_type_idx" ON "Property"("type");
CREATE INDEX "Property_status_idx" ON "Property"("status");
CREATE INDEX "Property_location_idx" ON "Property"("location");
CREATE INDEX "Property_createdById_idx" ON "Property"("createdById");

-- Customer Indexes
CREATE INDEX "Customer_userId_idx" ON "Customer"("userId");
CREATE INDEX "Customer_saleId_idx" ON "Customer"("saleId");
CREATE INDEX "Customer_mainStatus_idx" ON "Customer"("mainStatus");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Customer_interestedPropertyId_idx" ON "Customer"("interestedPropertyId");

-- Communications Indexes
CREATE INDEX "Communications_customerId_idx" ON "Communications"("customerId");
CREATE INDEX "Communications_userId_idx" ON "Communications"("userId");
CREATE INDEX "Communications_callId_idx" ON "Communications"("callId");

-- Contacted Indexes
CREATE INDEX "Contacted_customerId_idx" ON "Contacted"("customerId");
CREATE INDEX "Contacted_stateDate_idx" ON "Contacted"("stateDate");
CREATE INDEX "Contacted_status_idx" ON "Contacted"("status");

-- Quotation Indexes
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");
CREATE INDEX "Quotation_propertyId_idx" ON "Quotation"("propertyId");
CREATE INDEX "Quotation_stateDate_idx" ON "Quotation"("stateDate");
CREATE INDEX "Quotation_status_idx" ON "Quotation"("status");
CREATE INDEX "Quotation_createdById_idx" ON "Quotation"("createdById");
CREATE INDEX "Quotation_approvedById_idx" ON "Quotation"("approvedById");

-- QuotationItem Indexes
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- Negotiation Indexes
CREATE INDEX "Negotiation_customerId_idx" ON "Negotiation"("customerId");
CREATE INDEX "Negotiation_stateDate_idx" ON "Negotiation"("stateDate");
CREATE INDEX "Negotiation_status_idx" ON "Negotiation"("status");

-- ClosedDeal Indexes
CREATE INDEX "ClosedDeal_customerId_idx" ON "ClosedDeal"("customerId");
CREATE INDEX "ClosedDeal_userId_idx" ON "ClosedDeal"("userId");
CREATE INDEX "ClosedDeal_closingDate_idx" ON "ClosedDeal"("closingDate");
CREATE INDEX "ClosedDeal_result_idx" ON "ClosedDeal"("result");

-- Call Indexes
CREATE INDEX "Call_customerId_idx" ON "Call"("customerId");
CREATE INDEX "Call_saleUserId_idx" ON "Call"("saleUserId");
CREATE INDEX "Call_customerUserId_idx" ON "Call"("customerUserId");
CREATE INDEX "Call_startedAt_idx" ON "Call"("startedAt");

-- ChatMessage Indexes
CREATE INDEX "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");
CREATE INDEX "ChatMessage_customerId_createdAt_idx" ON "ChatMessage"("customerId", "createdAt");

-- PushToken Indexes
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");
CREATE INDEX "PushToken_customerId_idx" ON "PushToken"("customerId");