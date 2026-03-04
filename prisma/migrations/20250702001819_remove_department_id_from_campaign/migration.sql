/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Campaign` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_departmentId_fkey";

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "departmentId";

-- CreateTable
CREATE TABLE "CampaignDepartment" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDepartment_campaignId_departmentId_key" ON "CampaignDepartment"("campaignId", "departmentId");

-- AddForeignKey
ALTER TABLE "CampaignDepartment" ADD CONSTRAINT "CampaignDepartment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignDepartment" ADD CONSTRAINT "CampaignDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
