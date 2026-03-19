-- CreateTable
CREATE TABLE "PostSeen" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSeen_postId_userId_key" ON "PostSeen"("postId", "userId");

-- CreateIndex
CREATE INDEX "PostSeen_userId_idx" ON "PostSeen"("userId");

-- CreateIndex
CREATE INDEX "PostSeen_postId_idx" ON "PostSeen"("postId");

-- CreateIndex
CREATE INDEX "PostSeen_seenAt_idx" ON "PostSeen"("seenAt");

-- CreateIndex
CREATE INDEX "PostSeen_userId_seenAt_idx" ON "PostSeen"("userId", "seenAt");

-- AddForeignKey
ALTER TABLE "PostSeen" ADD CONSTRAINT "PostSeen_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSeen" ADD CONSTRAINT "PostSeen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
