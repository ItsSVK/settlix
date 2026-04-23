-- AlterTable: track when a split payment has been paid out to partners
ALTER TABLE "PaymentExecution" ADD COLUMN "distributedAt" TIMESTAMP(3);
