CREATE TABLE "ChatReadCursor" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatReadCursor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChatReadCursor_threadId_userId_key" ON "ChatReadCursor"("threadId", "userId");
CREATE INDEX "ChatReadCursor_userId_updatedAt_idx" ON "ChatReadCursor"("userId", "updatedAt");
ALTER TABLE "ChatReadCursor" ADD CONSTRAINT "ChatReadCursor_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
