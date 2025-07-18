/*
  Warnings:

  - You are about to drop the column `block` on the `pdf_objects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "x" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "y" DOUBLE PRECISION DEFAULT 0;

-- AlterTable
ALTER TABLE "pdf_objects" DROP COLUMN "block";
