-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR');

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
