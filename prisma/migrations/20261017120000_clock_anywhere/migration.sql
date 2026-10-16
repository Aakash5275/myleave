-- CreateTable
CREATE TABLE "OrgSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "clockAnywhere" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSetting_pkey" PRIMARY KEY ("id")
);
