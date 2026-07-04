-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dailyCallQuota" INTEGER NOT NULL DEFAULT 5,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusChange" (
    "id" TEXT NOT NULL,
    "businessLeadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "countedForDailyQuota" BOOLEAN NOT NULL DEFAULT false,
    "localDate" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadStatusChange_businessLeadId_idx" ON "LeadStatusChange"("businessLeadId");

-- CreateIndex
CREATE INDEX "LeadStatusChange_localDate_idx" ON "LeadStatusChange"("localDate");

-- CreateIndex
CREATE INDEX "LeadStatusChange_countedForDailyQuota_idx" ON "LeadStatusChange"("countedForDailyQuota");

-- AddForeignKey
ALTER TABLE "LeadStatusChange" ADD CONSTRAINT "LeadStatusChange_businessLeadId_fkey" FOREIGN KEY ("businessLeadId") REFERENCES "BusinessLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
