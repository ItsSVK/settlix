-- CreateTable
CREATE TABLE "SplitRecipient" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "basisPoints" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SplitRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SplitRecipient_linkId_idx" ON "SplitRecipient"("linkId");

-- AddForeignKey
ALTER TABLE "SplitRecipient" ADD CONSTRAINT "SplitRecipient_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
