import ExcelJS from 'exceljs';

// Interfaces for better type safety
interface BaseTransaction {
    id?: number;
    amount: number;
    date: Date | string;
    description: string;
}

interface Charge extends BaseTransaction {
    type?: 'CHARGE';
}

interface Payment extends BaseTransaction {
    type?: 'PAYMENT';
}

interface Package {
    description: string;
    charges?: Charge[];
    payments?: Payment[];
}

// Helper to save buffer as file
const saveWorkbook = async (workbook: ExcelJS.Workbook, fileName: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${fileName}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
};

export const exportToExcel = async (data: Record<string, unknown>[], fileName: string, sheetName: string = 'Sheet1', heading?: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (heading) {
        worksheet.addRow([heading]);
        worksheet.getRow(1).font = { bold: true, size: 14 };
    }

    if (data.length > 0) {
        // Headers
        const headers = Object.keys(data[0]);
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };

        // Data
        data.forEach(row => {
            worksheet.addRow(Object.values(row));
        });
    }

    await saveWorkbook(workbook, fileName);
};

export const exportStatementToExcel = async (charges: Charge[], payments: Payment[], fileName: string, title: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Statement');

    // Title
    worksheet.addRow([title]);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.mergeCells('A1:F1'); // Merge title across columns

    // Headers
    worksheet.addRow([]);
    const headerRow = worksheet.addRow(['Date', 'Description', 'Type', 'Charge (Debit)', 'Payment (Credit)', 'Net Balance']);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        cell.border = { bottom: { style: 'thin' } };
    });

    // Combine and Sort Data
    const transactions = [
        ...charges.map((c) => ({
            date: new Date(c.date || Date.now()),
            description: c.description,
            type: 'CHARGE',
            amount: Number(c.amount)
        })),
        ...payments.map((p) => ({
            date: new Date(p.date),
            description: p.description || 'Payment',
            type: 'PAYMENT',
            amount: Number(p.amount)
        }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;

    transactions.forEach(t => {
        if (t.type === 'CHARGE') runningBalance += t.amount;
        else runningBalance -= t.amount;

        const row = worksheet.addRow([
            t.date.toLocaleDateString('en-GB'),
            t.description,
            t.type,
            t.type === 'CHARGE' ? t.amount : '',
            t.type === 'PAYMENT' ? t.amount : '',
            runningBalance
        ]);

        // Styling
        if (t.type === 'CHARGE') {
            row.getCell(4).font = { color: { argb: 'FFFF0000' } }; // Red
        } else {
            row.getCell(5).font = { color: { argb: 'FF008000' } }; // Green
        }
    });

    // Summary Row
    const totalCharges = charges.reduce((sum: number, c) => sum + Number(c.amount), 0);
    const totalPayments = payments.reduce((sum: number, p) => sum + Number(p.amount), 0);

    worksheet.addRow([]);
    const totalRow = worksheet.addRow([
        '', 'TOTAL', '', totalCharges, totalPayments, totalCharges - totalPayments
    ]);
    totalRow.font = { bold: true };
    totalRow.getCell(4).font = { bold: true, color: { argb: 'FFFF0000' } }; // Red Total Charge
    totalRow.getCell(5).font = { bold: true, color: { argb: 'FF008000' } }; // Green Total Payment

    // Auto-width columns (simple estimation)
    worksheet.columns = [
        { width: 15 }, { width: 40 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    await saveWorkbook(workbook, fileName);
};

export const exportCompanyFullReport = async (companyName: string, packages: Package[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Full Report');

    // Main Title
    worksheet.addRow([`${companyName} - Financial Report`]);
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
    worksheet.addRow([]);

    // Define Global Columns for consistency
    worksheet.columns = [
        { width: 15 }, // A: Charge Date
        { width: 35 }, // B: Charge Desc
        { width: 15 }, // C: Charge Amt
        { width: 5 },  // D: Gap
        { width: 15 }, // E: Payment Date
        { width: 35 }, // F: Payment Desc
        { width: 15 }  // G: Payment Amt
    ];

    packages.forEach(pkg => {
        // Package Header
        const pkgHeaderRow = worksheet.addRow([`PACKAGE: ${pkg.description.toUpperCase()}`]);
        pkgHeaderRow.font = { bold: true, size: 12, color: { argb: 'FF0000FF' } }; // Blue Header

        // Columns Header
        const colHeader1 = worksheet.addRow(["CHARGES", "", "", "", "PAYMENTS", "", ""]);
        colHeader1.font = { bold: true };
        colHeader1.getCell(1).font = { bold: true, color: { argb: 'FFFF0000' } }; // Red "CHARGES"
        colHeader1.getCell(5).font = { bold: true, color: { argb: 'FF008000' } }; // Green "PAYMENTS"

        const colHeader2 = worksheet.addRow(["Date", "Particulars", "Amount (₹)", "", "Date", "Particulars", "Amount (₹)"]);
        colHeader2.font = { bold: true };
        colHeader2.eachCell(cell => {
            cell.border = { bottom: { style: 'thin' } };
        });

        const charges = (pkg.charges || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const payments = (pkg.payments || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const maxRows = Math.max(charges.length, payments.length);
        let totalCharges = 0;
        let totalPayments = 0;

        for (let i = 0; i < maxRows; i++) {
            const charge = charges[i];
            const payment = payments[i];

            // Use Array<string | number> explicitly to match ExcelJS addRow signature
            const rowValues: (string | number)[] = [];

            // Charge Data
            if (charge) {
                rowValues.push(new Date(charge.date).toLocaleDateString('en-GB'));
                rowValues.push(charge.description);
                const amt = Number(charge.amount);
                rowValues.push(amt);
                totalCharges += amt;
            } else {
                rowValues.push("", "", "");
            }

            // Gap
            rowValues.push("");

            // Payment Data
            if (payment) {
                rowValues.push(new Date(payment.date).toLocaleDateString('en-GB'));
                rowValues.push(payment.description);
                const amt = Number(payment.amount);
                rowValues.push(amt);
                totalPayments += amt;
            } else {
                rowValues.push("", "", "");
            }

            const row = worksheet.addRow(rowValues);

            // Color data rows
            if (charge) row.getCell(3).font = { color: { argb: 'FFFF0000' } }; // Red Charge
            if (payment) row.getCell(7).font = { color: { argb: 'FF008000' } }; // Green Payment
        }

        // Totals Row
        worksheet.addRow([]);
        const totalRow = worksheet.addRow([
            "TOTAL CHARGES", "", totalCharges, "", "TOTAL PAID", "", totalPayments
        ]);
        totalRow.font = { bold: true };
        totalRow.getCell(3).font = { bold: true, color: { argb: 'FFFF0000' } };
        totalRow.getCell(7).font = { bold: true, color: { argb: 'FF008000' } };

        // Net Due Row
        const netDue = totalCharges - totalPayments;
        const status = netDue > 0 ? "PAYABLE" : "CLEARED";
        const netRow = worksheet.addRow([
            "NET DUE", "", netDue, "", "STATUS", "", status
        ]);
        netRow.font = { bold: true };

        // Spacing
        worksheet.addRow([]);
        worksheet.addRow([]);
    });

    await saveWorkbook(workbook, `${companyName}_Full_Report_${new Date().toISOString().split('T')[0]}`);
};
