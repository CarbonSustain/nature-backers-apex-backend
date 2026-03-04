/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[business_email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `business_email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "full_name",
ADD COLUMN     "business_email" TEXT NOT NULL,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "personal_email" TEXT,
ALTER COLUMN "google_sub" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_business_email_key" ON "User"("business_email");
