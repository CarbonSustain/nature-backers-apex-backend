/*
  Warnings:

  - Made the column `uniqueId` on table `Project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Project" ALTER COLUMN "uniqueId" SET NOT NULL;
