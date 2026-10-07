-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "KycApplication" (
    "id" SERIAL NOT NULL,
    "pan" TEXT NOT NULL,
    "holderType" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycApplication_pkey" PRIMARY KEY ("id")
);
