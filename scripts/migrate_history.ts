import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

const data = [
  { month: '2025-06', income: 2132684.0, expense: 1502417.0, net: 630267.0 },
  { month: '2025-07', income: 2070730.0, expense: 815625.0, net: 1255105.0 },
  { month: '2025-08', income: 1748140.0, expense: 1066137.0, net: 682003.0 },
  { month: '2025-09', income: 1073210.0, expense: 537189.0, net: 536021.0 },
  { month: '2025-10', income: 1220800.0, expense: 756610.0, net: 464190.0 },
  { month: '2025-11', income: 2003555.0, expense: 676523.0, net: 1327032.0 },
  { month: '2025-12', income: 2310647.0, expense: 703871.0, net: 1606776.0 },
  { month: '2026-01', income: 1487910.0, expense: 423585.0, net: 1064325.0 },
  { month: '2026-02', income: 1499350.0, expense: 632297.0, net: 867053.0 },
  { month: '2026-03', income: 991575.0, expense: 242752.0, net: 748823.0 },
  { month: '2026-04', income: 1495680.0, expense: 498987.0, net: 996693.0 },
  { month: '2026-05', income: 852600.0, expense: 262360.0, net: 590240.0 },
  { month: '2026-06', income: 1114370.0, expense: 423581.0, net: 690789.0 },
  { month: '2026-07', income: 1180990.0, expense: 409104.0, net: 771886.0 },
  { month: '2026-08', income: 1117100.0, expense: 251587.0, net: 865513.0 }
];

async function main() {
  console.log("Starting migration...");
  let count = 0;
  for (const row of data) {
    await prisma.historicalMonthSummary.upsert({
      where: { month: row.month },
      update: {
        income: row.income,
        expense: row.expense,
        net: row.net
      },
      create: {
        month: row.month,
        income: row.income,
        expense: row.expense,
        net: row.net
      }
    });
    count++;
  }
  console.log(`Successfully migrated ${count} months of historical data!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
