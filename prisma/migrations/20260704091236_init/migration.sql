-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('TODO', 'POTENTIAL_RESEARCH', 'PENDING', 'CONTACTED', 'DEAD_END', 'SUCCEEDED', 'DISCARDED', 'DO_NOT_CALL');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('GOOGLE_NEARBY', 'GOOGLE_TEXT', 'MANUAL');

-- CreateEnum
CREATE TYPE "GatekeeperRisk" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('NO_ANSWER', 'WRONG_NUMBER', 'GATEKEEPER', 'OWNER_UNAVAILABLE', 'PERMISSION_TO_SEND', 'SENT_LINK', 'NOT_INTERESTED', 'FOLLOW_UP', 'CLOSED', 'DO_NOT_CALL', 'OTHER');

-- CreateTable
CREATE TABLE "BusinessLead" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "primaryType" TEXT,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryBucket" TEXT,
    "formattedAddress" TEXT,
    "suburb" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapsUri" TEXT,
    "websiteUri" TEXT,
    "nationalPhoneNumber" TEXT,
    "rating" DOUBLE PRECISION,
    "userRatingCount" INTEGER,
    "businessStatus" TEXT,
    "source" "LeadSource" NOT NULL,
    "sourceQuery" TEXT,
    "searchAreaLabel" TEXT,
    "hasWebsite" BOOLEAN NOT NULL,
    "hasPhone" BOOLEAN NOT NULL,
    "isChainLikely" BOOLEAN NOT NULL DEFAULT false,
    "gatekeeperRisk" "GatekeeperRisk" NOT NULL DEFAULT 'UNKNOWN',
    "leadStatus" "LeadStatus" NOT NULL DEFAULT 'TODO',
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "cleaningReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastImportedAt" TIMESTAMP(3),
    "previewUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "areaLabel" TEXT,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radiusMeters" INTEGER,
    "textQuery" TEXT,
    "includedTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawResultsCount" INTEGER NOT NULL DEFAULT 0,
    "newLeadsCount" INTEGER NOT NULL DEFAULT 0,
    "existingLeadsCount" INTEGER NOT NULL DEFAULT 0,
    "todoCount" INTEGER NOT NULL DEFAULT 0,
    "potentialCount" INTEGER NOT NULL DEFAULT 0,
    "discardedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportEvent" (
    "id" TEXT NOT NULL,
    "searchRunId" TEXT,
    "businessLeadId" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "wasNew" BOOLEAN NOT NULL,
    "previousStatus" "LeadStatus",
    "finalStatus" "LeadStatus" NOT NULL,
    "importReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "businessLeadId" TEXT NOT NULL,
    "outcome" "CallOutcome" NOT NULL,
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLead_googlePlaceId_key" ON "BusinessLead"("googlePlaceId");

-- CreateIndex
CREATE INDEX "BusinessLead_leadStatus_idx" ON "BusinessLead"("leadStatus");

-- CreateIndex
CREATE INDEX "BusinessLead_primaryType_idx" ON "BusinessLead"("primaryType");

-- CreateIndex
CREATE INDEX "BusinessLead_hasWebsite_idx" ON "BusinessLead"("hasWebsite");

-- CreateIndex
CREATE INDEX "BusinessLead_hasPhone_idx" ON "BusinessLead"("hasPhone");

-- CreateIndex
CREATE INDEX "BusinessLead_leadScore_idx" ON "BusinessLead"("leadScore");

-- CreateIndex
CREATE INDEX "BusinessLead_suburb_idx" ON "BusinessLead"("suburb");

-- CreateIndex
CREATE INDEX "BusinessLead_isChainLikely_idx" ON "BusinessLead"("isChainLikely");

-- CreateIndex
CREATE INDEX "ImportEvent_searchRunId_idx" ON "ImportEvent"("searchRunId");

-- CreateIndex
CREATE INDEX "ImportEvent_businessLeadId_idx" ON "ImportEvent"("businessLeadId");

-- CreateIndex
CREATE INDEX "ImportEvent_googlePlaceId_idx" ON "ImportEvent"("googlePlaceId");

-- CreateIndex
CREATE INDEX "CallLog_businessLeadId_idx" ON "CallLog"("businessLeadId");

-- CreateIndex
CREATE INDEX "CallLog_outcome_idx" ON "CallLog"("outcome");

-- CreateIndex
CREATE INDEX "CallLog_calledAt_idx" ON "CallLog"("calledAt");

-- CreateIndex
CREATE INDEX "CallLog_nextFollowUpAt_idx" ON "CallLog"("nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "ImportEvent" ADD CONSTRAINT "ImportEvent_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportEvent" ADD CONSTRAINT "ImportEvent_businessLeadId_fkey" FOREIGN KEY ("businessLeadId") REFERENCES "BusinessLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_businessLeadId_fkey" FOREIGN KEY ("businessLeadId") REFERENCES "BusinessLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
