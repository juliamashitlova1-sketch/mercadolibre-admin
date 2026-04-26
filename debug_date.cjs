const XLSX = require('xlsx');

const filePath = "C:\\Users\\Administrator\\Desktop\\20260424_Orders_US_Mercado_Libre_2026-04-24_23-04hs_3110103283.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Set cellDates: true to see if it helps, but first let's see raw values
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

        const dateCols = ['Data da venda', 'Data de aprovação', 'Date', 'Fecha', 'Data', 'Sale Date', 'Data de venda', 'Order date'];
        let dateIdx = headers.findIndex(h => {
             const val = String(h || '').trim();
             return dateCols.includes(val);
        });
        
        console.log("DATE COLUMN INDEX:", dateIdx);
        
        if (dateIdx !== -1) {
            console.log("--- SAMPLE ROW DATA ---");
            for (let i = headerIndex + 1; i < Math.min(data.length, headerIndex + 11); i++) {
                const row = data[i];
                const dateVal = row[dateIdx];
                console.log(`ROW ${i+1}: Raw Value = [${dateVal}], Type = ${typeof dateVal}`);
                if (typeof dateVal === 'number') {
                    // Try to convert Excel number to JS date
                    const jsDate = new Date((dateVal - 25569) * 86400 * 1000);
                    console.log(`   -> Parsed as Excel Serial Date: ${jsDate.toISOString()}`);
                }
            }
        } else {
            console.log("COULD NOT FIND DATE COLUMN.");
        }
    } else {
        console.log("COULD NOT FIND HEADERS");
    }
} catch (err) {
    console.error("ERROR:", err.message);
}
