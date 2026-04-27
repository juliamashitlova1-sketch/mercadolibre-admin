
const XLSX = require('xlsx');
const path = require('path');

const filePath = "C:\\Users\\Administrator\\Downloads\\20260427_Ventas_US_Mercado_Libre_2026-04-27_03-45hs_3110103283.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log("COLUMNS (Row 6):", JSON.stringify(data[5]));
    console.log("FIRST 10 ROWS:", JSON.stringify(data.slice(0, 10)));
} catch (err) {
    console.error("ERROR:", err.message);
}
