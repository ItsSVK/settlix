-- CreateEnum
CREATE TYPE "PaymentExecutionStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "merchantWallet" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'fixed',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentExecution" (
    "id" TEXT NOT NULL,
    "clientExecutionId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "userWallet" TEXT NOT NULL,
    "inputToken" TEXT NOT NULL,
    "inputAmount" DECIMAL(30,18) NOT NULL,
    "outputAmount" DECIMAL(30,18) NOT NULL,
    "txSignature" TEXT NOT NULL,
    "status" "PaymentExecutionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentExecution_clientExecutionId_key" ON "PaymentExecution"("clientExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentExecution_txSignature_key" ON "PaymentExecution"("txSignature");

-- CreateIndex
CREATE INDEX "PaymentExecution_linkId_idx" ON "PaymentExecution"("linkId");

-- AddForeignKey
ALTER TABLE "PaymentExecution" ADD CONSTRAINT "PaymentExecution_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
