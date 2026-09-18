-- CreateTable
CREATE TABLE "ContactThread" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "profileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactThread_email_idx" ON "ContactThread"("email");

-- CreateIndex
CREATE INDEX "ContactThread_status_updatedAt_idx" ON "ContactThread"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContactMessage_threadId_createdAt_idx" ON "ContactMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContactThread" ADD CONSTRAINT "ContactThread_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ContactThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
