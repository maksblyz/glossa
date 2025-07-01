/*
  Warnings:

  - Added the required column `page_height` to the `pdf_objects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `page_width` to the `pdf_objects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pdf_objects" ADD COLUMN     "page_height" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "page_width" DOUBLE PRECISION NOT NULL;
