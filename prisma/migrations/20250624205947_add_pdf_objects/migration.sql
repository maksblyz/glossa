-- CreateTable
CREATE TABLE "pdf_objects" (
    "id" SERIAL NOT NULL,
    "file" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "bbox" JSONB NOT NULL,

    CONSTRAINT "pdf_objects_pkey" PRIMARY KEY ("id")
);
