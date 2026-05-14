-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRepository" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRepository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summaryHtml" TEXT NOT NULL,
    "summaryText" TEXT,
    "totalCommits" INTEGER NOT NULL DEFAULT 0,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "status" "SummaryStatus" NOT NULL DEFAULT 'COMPLETED',
    "llmProvider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitLog" (
    "id" TEXT NOT NULL,
    "summaryId" TEXT,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "authorLogin" TEXT,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "htmlUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserRepository_userId_owner_repo_key" ON "UserRepository"("userId", "owner", "repo");

-- CreateIndex
CREATE INDEX "WorkSummary_userId_startDate_endDate_idx" ON "WorkSummary"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CommitLog_userId_committedAt_idx" ON "CommitLog"("userId", "committedAt");

-- CreateIndex
CREATE INDEX "CommitLog_owner_repo_idx" ON "CommitLog"("owner", "repo");

-- CreateIndex
CREATE UNIQUE INDEX "CommitLog_owner_repo_sha_key" ON "CommitLog"("owner", "repo", "sha");

-- AddForeignKey
ALTER TABLE "UserRepository" ADD CONSTRAINT "UserRepository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSummary" ADD CONSTRAINT "WorkSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitLog" ADD CONSTRAINT "CommitLog_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "WorkSummary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
