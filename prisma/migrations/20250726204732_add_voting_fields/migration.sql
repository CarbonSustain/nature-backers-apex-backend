/*
  Warnings:

  - Added the required column `projectId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "tx_hash" TEXT;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "projectId" INTEGER NOT NULL,
ADD COLUMN     "vote_hash" TEXT;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
