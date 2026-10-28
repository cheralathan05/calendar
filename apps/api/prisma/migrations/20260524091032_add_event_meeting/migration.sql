-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "meetingData" JSONB,
ADD COLUMN     "meetingProvider" TEXT,
ADD COLUMN     "meetingUrl" TEXT;

-- AlterTable
ALTER TABLE "EventRecurrenceException" ADD COLUMN     "meetingData" JSONB,
ADD COLUMN     "meetingProvider" TEXT,
ADD COLUMN     "meetingUrl" TEXT;
