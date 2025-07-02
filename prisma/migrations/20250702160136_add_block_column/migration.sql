/*
  Warnings:

  - You are about to drop the column `block_id` on the `pdf_objects` table. All the data in the column will be lost.
  - You are about to drop the column `block_index` on the `pdf_objects` table. All the data in the column will be lost.
  - You are about to drop the column `block_type` on the `pdf_objects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pdf_objects" DROP COLUMN "block_id",
DROP COLUMN "block_index",
DROP COLUMN "block_type",
ADD COLUMN     "block" TEXT;
