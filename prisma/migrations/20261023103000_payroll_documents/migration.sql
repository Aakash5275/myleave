CREATE TABLE "PayrollDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "extractedText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayrollDocument_userId_idx" ON "PayrollDocument"("userId");

ALTER TABLE "PayrollDocument" ADD CONSTRAINT "PayrollDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
