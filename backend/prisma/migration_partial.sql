-- Add sentQty and returnedQty columns to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sentQty" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "returnedQty" INTEGER NOT NULL DEFAULT 0;

-- Create DispatchLog table
CREATE TABLE IF NOT EXISTS "DispatchLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "invoiceNumber" TEXT,
    "vehicleNumber" TEXT,
    "driverName" TEXT,
    "driverMobile" TEXT,
    "warehouseId" INTEGER,
    "dispatchDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatchLog_pkey" PRIMARY KEY ("id")
);

-- Create ReturnLog table
CREATE TABLE IF NOT EXISTS "ReturnLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "returnReason" TEXT,
    "challanNumber" TEXT,
    "vehicleNumber" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "DispatchLog_orderId_idx" ON "DispatchLog"("orderId");
CREATE INDEX IF NOT EXISTS "DispatchLog_orderItemId_idx" ON "DispatchLog"("orderItemId");
CREATE INDEX IF NOT EXISTS "ReturnLog_orderId_idx" ON "ReturnLog"("orderId");
CREATE INDEX IF NOT EXISTS "ReturnLog_orderItemId_idx" ON "ReturnLog"("orderItemId");
