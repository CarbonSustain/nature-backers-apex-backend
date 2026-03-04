/*
  Warnings:

  - A unique constraint covering the columns `[name,startDate,endDate,votingStyle]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_startDate_endDate_votingStyle_key" ON "Campaign"("name", "startDate", "endDate", "votingStyle");
