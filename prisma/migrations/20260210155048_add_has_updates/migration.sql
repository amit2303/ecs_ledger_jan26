-- AlterTable
ALTER TABLE `Company` ADD COLUMN `hasUpdates` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Package` ADD COLUMN `hasUpdates` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Charge` ADD COLUMN `hasUpdates` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `hasUpdates` BOOLEAN NOT NULL DEFAULT false;
