const xlsx = require('xlsx');
try {
  const wb = xlsx.readFile('C:\\Users\\Administrator\\Desktop\\4.24.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, {header: 1});
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch(e) {
  console.error(e.message);
}
