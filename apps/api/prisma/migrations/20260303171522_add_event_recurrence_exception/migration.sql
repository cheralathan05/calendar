-- CreateTable
CREATE TABLE "EventRecurrenceException" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "originalStartAt" TIMESTAMP(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "location" TEXT,
    "allDay" BOOLEAN,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "startDate" DATE,
    "endDate" DATE,
    "color" TEXT,
    "timeZone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRecurrenceException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRecurrenceException_eventId_originalStartAt_idx" ON "EventRecurrenceException"("eventId", "originalStartAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRecurrenceException_eventId_originalStartAt_key" ON "EventRecurrenceException"("eventId", "originalStartAt");

-- AddForeignKey
ALTER TABLE "EventRecurrenceException" ADD CONSTRAINT "EventRecurrenceException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
