-- CreateTable
CREATE TABLE "FilterCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilterOption" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filterCategoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilterOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FilterCategory_name_key" ON "FilterCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FilterOption_filterCategoryId_value_key" ON "FilterOption"("filterCategoryId", "value");

-- AddForeignKey
ALTER TABLE "FilterOption" ADD CONSTRAINT "FilterOption_filterCategoryId_fkey" FOREIGN KEY ("filterCategoryId") REFERENCES "FilterCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
