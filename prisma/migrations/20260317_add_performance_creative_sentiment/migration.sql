-- AlterTable
ALTER TABLE "Client" ADD COLUMN "performanceSentiment" "SentimentStatus" NOT NULL DEFAULT 'NEUTRAL';
ALTER TABLE "Client" ADD COLUMN "creativeSentiment" "SentimentStatus" NOT NULL DEFAULT 'NEUTRAL';

-- Copy existing sentimentStatus to both new fields
UPDATE "Client" SET "performanceSentiment" = "sentimentStatus", "creativeSentiment" = "sentimentStatus";
