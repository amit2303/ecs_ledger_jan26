const sqlite3 = require('/Users/amit/Documents/FINANCE_ECS/server/node_modules/sqlite3');
const { PrismaClient } = require('../src/generated/client');

const prisma = new PrismaClient();
const dbPath = '/Users/amit/Documents/FINANCE_ECS/server/finance.db';

async function seedSummaries() {
    console.log('Reading from SQLite:', dbPath);
    const db = new sqlite3.Database(dbPath);

    const rows = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM transactions ORDER BY date ASC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    console.log(`Analyzing ${rows.length} transactions...`);

    const months = {};
    for (const r of rows) {
        const m = r.date.slice(0, 7);
        if (!months[m]) {
            months[m] = {
                month: m,
                income: 0,
                expense: 0,
                ssmIncome: 0,
                ssmExpense: 0,
                pankajIncome: 0,
                pankajExpense: 0,
                entryCount: 0
            };
        }
        months[m].entryCount++;
        const isSSM = r.user.includes('Shyam');
        if (r.type.toLowerCase() === 'income') {
            months[m].income += r.amount;
            if (isSSM) months[m].ssmIncome += r.amount;
            else months[m].pankajIncome += r.amount;
        } else {
            months[m].expense += r.amount;
            if (isSSM) months[m].ssmExpense += r.amount;
            else months[m].pankajExpense += r.amount;
        }
    }

    // Delete existing historical summaries
    await prisma.historicalMonthSummary.deleteMany({});

    for (const [monthKey, data] of Object.entries(months)) {
        await prisma.historicalMonthSummary.create({
            data: {
                month: monthKey,
                income: data.income,
                expense: data.expense,
                net: data.income - data.expense,
                ssmIncome: data.ssmIncome,
                ssmExpense: data.ssmExpense,
                pankajIncome: data.pankajIncome,
                pankajExpense: data.pankajExpense,
                entryCount: data.entryCount
            }
        });
        console.log(`Seeded summary for ${monthKey}: Income ₹${data.income}, Expense ₹${data.expense}, Net ₹${data.income - data.expense}`);
    }

    console.log('Historical summaries successfully seeded into MySQL!');
}

seedSummaries()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
