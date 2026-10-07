-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AuthOtp" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthOtp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AuthOtp" ADD CONSTRAINT "AuthOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
