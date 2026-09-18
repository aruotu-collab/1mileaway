ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "answerReports" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "callId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Review_callId_key" ON "Review"("callId");
DO $$ BEGIN
  ALTER TABLE "Review" ADD CONSTRAINT "Review_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
UPDATE "Business" SET "answerRate" = 0, "answerReports" = 0, "ratingAvg" = 0, "ratingCount" = 0;
