-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "emailBody" TEXT,
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "url" TEXT;
