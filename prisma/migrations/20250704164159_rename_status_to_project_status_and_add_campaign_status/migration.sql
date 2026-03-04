/*
  Warnings:

  - You are about to drop the column `statusId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `Status` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `campaignStatusId` to the `Campaign` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectStatusId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_statusId_fkey";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "campaignStatusId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "statusId",
ADD COLUMN     "projectStatusId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Status";

-- CreateTable
CREATE TABLE "ProjectStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProjectStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStatus_name_key" ON "ProjectStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignStatus_name_key" ON "CampaignStatus"("name");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectStatusId_fkey" FOREIGN KEY ("projectStatusId") REFERENCES "ProjectStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_campaignStatusId_fkey" FOREIGN KEY ("campaignStatusId") REFERENCES "CampaignStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
