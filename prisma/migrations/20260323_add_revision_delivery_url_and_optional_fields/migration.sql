-- AlterTable: Make s3Key, s3Url, fileName optional and add deliveryUrl
-- This allows revisions to be link-based (deliveryUrl) without requiring S3 upload

ALTER TABLE "Revision" ALTER COLUMN "s3Key" DROP NOT NULL;
ALTER TABLE "Revision" ALTER COLUMN "s3Url" DROP NOT NULL;
ALTER TABLE "Revision" ALTER COLUMN "fileName" DROP NOT NULL;
ALTER TABLE "Revision" ADD COLUMN "deliveryUrl" TEXT;
