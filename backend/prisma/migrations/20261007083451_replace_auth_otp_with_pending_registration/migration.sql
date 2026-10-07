/*
  Warnings:

  - You are about to drop the `AuthOtp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuthOtp" DROP CONSTRAINT "AuthOtp_userId_fkey";

-- DropTable
DROP TABLE "AuthOtp";

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_phone_key" ON "PendingRegistration"("phone");
