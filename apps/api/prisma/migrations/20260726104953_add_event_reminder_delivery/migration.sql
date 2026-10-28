-- CreateTable
CREATE TABLE "EventReminderDelivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventReminderDelivery_eventId_idx" ON "EventReminderDelivery"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReminderDelivery_eventId_notificationId_key" ON "EventReminderDelivery"("eventId", "notificationId");

-- AddForeignKey
ALTER TABLE "EventReminderDelivery" ADD CONSTRAINT "EventReminderDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
