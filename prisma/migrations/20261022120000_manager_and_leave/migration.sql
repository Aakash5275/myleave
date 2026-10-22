ALTER TABLE "User" ADD COLUMN "managerId" TEXT;

ALTER TABLE "Attendance" ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" TEXT;

CREATE INDEX "User_managerId_idx" ON "User"("managerId");

ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DELETE FROM "Attendance" AS a
USING "LeaveRequest" AS l
WHERE a."userId" = l."userId"
  AND a.notes = 'Approved leave'
  AND a.status = 'On Leave'
  AND a."checkIn" IS NULL
  AND a.date >= l."startDate"
  AND a.date <= l."endDate"
  AND l.type IN ('Annual', 'Sick', 'Casual');

DELETE FROM "LeaveRequest" WHERE type IN ('Annual', 'Sick', 'Casual');
DELETE FROM "LeaveBalance" WHERE type IN ('Annual', 'Sick', 'Casual');
