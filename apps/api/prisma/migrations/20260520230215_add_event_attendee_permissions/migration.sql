/*
  Warnings:

  - A unique constraint covering the columns `[eventId,email]` on the table `EventAttendee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EventAttendee" ADD COLUMN     "permissions" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendee_eventId_email_key" ON "EventAttendee"("eventId", "email");
