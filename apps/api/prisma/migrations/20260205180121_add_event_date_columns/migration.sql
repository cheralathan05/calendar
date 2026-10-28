-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "startDate" DATE;

-- CreateIndex
CREATE INDEX "Event_calendarId_startDate_idx" ON "Event"("calendarId", "startDate");
