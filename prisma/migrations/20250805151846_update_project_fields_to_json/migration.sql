/*
  Warnings:

  - The `impactAndRiskAssessments` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `impactAndRiskSdgs` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `standards` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Project" DROP COLUMN "impactAndRiskAssessments",
ADD COLUMN     "impactAndRiskAssessments" JSONB,
DROP COLUMN "impactAndRiskSdgs",
ADD COLUMN     "impactAndRiskSdgs" JSONB,
DROP COLUMN "standards",
ADD COLUMN     "standards" JSONB;
