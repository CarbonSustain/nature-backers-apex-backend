/*
  Warnings:

  - You are about to drop the `CampaignEmployee` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `departmentId` to the `Campaign` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CampaignEmployee" DROP CONSTRAINT "CampaignEmployee_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "CampaignEmployee" DROP CONSTRAINT "CampaignEmployee_employeeId_fkey";

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "departmentId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "CampaignEmployee";

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
