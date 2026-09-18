-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'none',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_businessId_key" ON "Subscription"("businessId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "leadId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'lead';

-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "paymentState" SET DEFAULT 'UNSUBSCRIBED';
