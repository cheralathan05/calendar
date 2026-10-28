-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "busyStatus" TEXT,
ADD COLUMN     "guests" JSONB,
ADD COLUMN     "notifications" JSONB,
ADD COLUMN     "visibility" TEXT;

-- AlterTable
ALTER TABLE "EventRecurrenceException" ADD COLUMN     "busyStatus" TEXT,
ADD COLUMN     "guests" JSONB,
ADD COLUMN     "notifications" JSONB,
ADD COLUMN     "visibility" TEXT;
