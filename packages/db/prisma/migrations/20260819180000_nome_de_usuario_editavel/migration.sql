-- AlterTable
ALTER TABLE "User" ADD COLUMN     "previousSlug" TEXT,
ADD COLUMN     "slugChangedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_previousSlug_key" ON "User"("previousSlug");

