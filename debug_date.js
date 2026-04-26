import * as XLSX from 'xlsx';
import path from 'path';

const filePath = "C:\\Users\\Administrator\\Desktop\\20260424_Orders_US_Mercado_Libre_2026-04-24_23-04hs_3110103283.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row
    const headerKeywords = ['sku', 'order id', 'número de venda', 'external id', 'venda #', 'item sku'];
    let headerIndex = -1;
    for (let i = 0; i < Math.min(data.length, 20); i++) {
        const rowStr = (data[i] || []).join('|').toLowerCase();
        if (headerKeywords.some(kw => rowStr.includes(kw))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex !== -1) {
        const headers = data[headerIndex];
        console.log("HEADERS FOUND AT ROW", headerIndex + 1);
        console.log("HEADERS:", JSON.stringify(headers));

        const dateCols = ['Data da venda', 'Data de aprovação', 'Date', 'Fecha', 'Data', 'Sale Date'];
        let dateIdx = headers.findIndex(h => {
             const val = String(h || '').trim();
             return dateCols.includes(val);
        });
        
        console.log("DATE COLUMN INDEX:", dateIdx);
        
        if (dateIdx !== -1) {
            console.log("--- SAMPLE ROW DATA (FIRST 10) ---");
            for (let i = headerIndex + 1; i < Math.min(data.length, headerIndex + 11); i++) {
                const row = data[i];
                console.log(`ROW ${i+1}: Date Value =`, row[dateIdx], "Type =", typeof row[dateIdx]);
            }
        } else {
            console.log("COULD NOT FIND DATE COLUMN. Headers are:", headers);
        }
    } else {
        console.log("COULD NOT FIND HEADERS");
    }
} catch (err) {
    console.error("ERROR:", err.message);
}
