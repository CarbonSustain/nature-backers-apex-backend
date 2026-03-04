/*
  Warnings:

  - You are about to drop the column `link` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `token_type` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `typeId` on the `Project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,projectTypeId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ecosystemTypeId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `landUseTypeId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `methodology` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `network` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectTypeId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Project` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_typeId_fkey";

-- DropIndex
DROP INDEX "Project_name_typeId_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "link",
DROP COLUMN "token_type",
DROP COLUMN "typeId",
ADD COLUMN     "ecosystemTypeId" INTEGER NOT NULL,
ADD COLUMN     "landUseTypeId" INTEGER NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "methodology" TEXT NOT NULL,
ADD COLUMN     "network" TEXT NOT NULL,
ADD COLUMN     "projectTypeId" INTEGER NOT NULL,
ADD COLUMN     "statusId" INTEGER NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- CreateTable
CREATE TABLE "EcosystemType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EcosystemType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandUseType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LandUseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SDG" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SDG_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSDG" (
    "projectId" INTEGER NOT NULL,
    "sdgId" INTEGER NOT NULL,

    CONSTRAINT "ProjectSDG_pkey" PRIMARY KEY ("projectId","sdgId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EcosystemType_name_key" ON "EcosystemType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LandUseType_name_key" ON "LandUseType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Status_name_key" ON "Status"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SDG_name_key" ON "SDG"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_projectTypeId_key" ON "Project"("name", "projectTypeId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectTypeId_fkey" FOREIGN KEY ("projectTypeId") REFERENCES "ProjectType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ecosystemTypeId_fkey" FOREIGN KEY ("ecosystemTypeId") REFERENCES "EcosystemType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_landUseTypeId_fkey" FOREIGN KEY ("landUseTypeId") REFERENCES "LandUseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSDG" ADD CONSTRAINT "ProjectSDG_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSDG" ADD CONSTRAINT "ProjectSDG_sdgId_fkey" FOREIGN KEY ("sdgId") REFERENCES "SDG"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
