-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PhoneOtp" ADD CONSTRAINT "PhoneOtp_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
