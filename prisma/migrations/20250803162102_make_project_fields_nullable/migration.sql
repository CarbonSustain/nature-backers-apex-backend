/*
  Warnings:

  - You are about to drop the column `description` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `ecosystemTypeId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `landUseTypeId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `methodology` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `network` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `projectStatusId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `projectTypeId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uniqueId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectName,uniqueId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_ecosystemTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_landUseTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_projectStatusId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_projectTypeId_fkey";

-- DropIndex
DROP INDEX "Project_name_projectTypeId_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "description",
DROP COLUMN "ecosystemTypeId",
DROP COLUMN "landUseTypeId",
DROP COLUMN "methodology",
DROP COLUMN "name",
DROP COLUMN "network",
DROP COLUMN "projectStatusId",
DROP COLUMN "projectTypeId",
DROP COLUMN "url",
ADD COLUMN     "impactAndRiskAssessments" TEXT[],
ADD COLUMN     "impactAndRiskSdgs" TEXT[],
ADD COLUMN     "primarySector" TEXT,
ADD COLUMN     "projectMethodology" TEXT,
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "projectTypes" TEXT,
ADD COLUMN     "proofPurpose" TEXT,
ADD COLUMN     "secondarySector" TEXT,
ADD COLUMN     "standards" TEXT,
ADD COLUMN     "uniqueId" TEXT,
ADD COLUMN     "verificationMethod" TEXT,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_uniqueId_key" ON "Project"("uniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectName_uniqueId_key" ON "Project"("projectName", "uniqueId");
