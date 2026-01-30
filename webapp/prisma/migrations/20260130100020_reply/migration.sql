-- CreateTable
CREATE TABLE "Reply" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedbackId" TEXT NOT NULL,
    "adminUserId" TEXT,
    CONSTRAINT "Reply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reply_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Reply_feedbackId_createdAt_idx" ON "Reply"("feedbackId", "createdAt");
