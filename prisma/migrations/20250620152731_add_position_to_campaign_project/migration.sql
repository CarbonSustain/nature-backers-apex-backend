/*
  Warnings:

  - Added the required column `position` to the `CampaignProject` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CampaignProject" ADD COLUMN     "position" INTEGER NOT NULL;
