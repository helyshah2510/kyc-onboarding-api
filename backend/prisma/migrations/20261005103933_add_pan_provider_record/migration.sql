-- CreateTable
CREATE TABLE "PanProviderRecord" (
    "id" SERIAL NOT NULL,
    "pan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "holderType" TEXT NOT NULL,

    CONSTRAINT "PanProviderRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanProviderRecord_pan_key" ON "PanProviderRecord"("pan");
