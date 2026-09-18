-- CreateTable
CREATE TABLE `TransactionMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rawText` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `companyId` INTEGER NULL,
    `packageId` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `errorMsg` TEXT NULL,
    `paymentId` INTEGER NULL,
    `chargeId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
