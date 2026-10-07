/*
  Warnings:

  - Added the required column `address` to the `KycApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `KycApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `KycApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KycApplication" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;
