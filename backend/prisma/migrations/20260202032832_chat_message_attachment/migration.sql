-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "fileKey" TEXT,
ADD COLUMN     "fileMime" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
ALTER COLUMN "text" DROP NOT NULL;
