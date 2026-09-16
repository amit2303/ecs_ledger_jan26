import { prisma } from '@/lib/prisma'

/**
 * Checks active monthly charges and generates any missing charges for the 1st of elapsed months up to current date.
 * Deduplicates using monthlyChargeId and month boundaries.
 */
export async function processDueMonthlyCharges(packageId?: number) {
    try {
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() // 0-indexed

        const whereClause: any = { isActive: true }
        if (packageId) {
            whereClause.packageId = packageId
        }

        const activeMonthlyCharges = await prisma.monthlyCharge.findMany({
            where: whereClause,
            include: {
                package: {
                    select: { id: true, companyId: true }
                }
            }
        })

        let generatedCount = 0

        for (const mc of activeMonthlyCharges) {
            const start = new Date(mc.startDate)
            const startYear = start.getFullYear()
            const startMonth = start.getMonth()

            // Iterate month by month from startMonth/startYear up to currentMonth/currentYear
            let iterYear = startYear
            let iterMonth = startMonth

            while (
                iterYear < currentYear ||
                (iterYear === currentYear && iterMonth <= currentMonth)
            ) {
                // Target date: 1st of that month (UTC noon to avoid timezone shift)
                const chargeDate = new Date(Date.UTC(iterYear, iterMonth, 1, 12, 0, 0))

                // Start and end of that month for query
                const startOfMonth = new Date(Date.UTC(iterYear, iterMonth, 1, 0, 0, 0))
                const endOfMonth = new Date(Date.UTC(iterYear, iterMonth + 1, 1, 0, 0, 0))

                // Check if a charge for this monthly charge already exists for this month
                const existing = await prisma.charge.findFirst({
                    where: {
                        packageId: mc.packageId,
                        monthlyChargeId: mc.id,
                        date: {
                            gte: startOfMonth,
                            lt: endOfMonth
                        }
                    }
                })

                if (!existing) {
                    await prisma.charge.create({
                        data: {
                            packageId: mc.packageId,
                            monthlyChargeId: mc.id,
                            description: mc.description,
                            amount: mc.amount,
                            date: chargeDate,
                            hasUpdates: true
                        }
                    })

                    // Mark package & company hasUpdates
                    if (mc.package?.companyId) {
                        await prisma.package.update({
                            where: { id: mc.packageId },
                            data: { hasUpdates: true }
                        }).catch(() => {})

                        await prisma.company.update({
                            where: { id: mc.package.companyId },
                            data: { hasUpdates: true }
                        }).catch(() => {})
                    }

                    generatedCount++
                }

                // Advance to next month
                iterMonth++
                if (iterMonth > 11) {
                    iterMonth = 0
                    iterYear++
                }
            }

            // Update lastGeneratedMonth
            const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
            if (mc.lastGeneratedMonth !== currentMonthStr) {
                await prisma.monthlyCharge.update({
                    where: { id: mc.id },
                    data: { lastGeneratedMonth: currentMonthStr }
                }).catch(() => {})
            }
        }

        return { generatedCount }
    } catch (error) {
        console.error('Error processing monthly charges:', error)
        return { generatedCount: 0, error }
    }
}
