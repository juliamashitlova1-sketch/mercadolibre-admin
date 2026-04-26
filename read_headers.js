import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const path = "C:\\Users\\Administrator\\Desktop\\20260424_Orders_US_Mercado_Libre_2026-04-24_23-04hs_3110103283.xlsx";
const workbook = XLSX.readFile(path);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const range = XLSX.utils.decode_range(worksheet['!ref']);

for(let R = range.s.r; R <= Math.min(range.e.r, 10); ++R) {
    const rowData = [];
    for(let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({c:C, r: R})];
        rowData.push(cell ? cell.v : null);
    }
    console.log(`Row ${R}:`, rowData);
}
