const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets in Excel:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log(`Total Rows: ${data.length}`);
    if (data.length > 0) {
      console.log('Header Columns:', data[0]);
      console.log('Sample Rows (first 3):');
      for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
        console.log(`Row ${i}:`, data[i]);
      }
    }
  });
} catch (error) {
  console.error('Error reading Excel file:', error);
}
