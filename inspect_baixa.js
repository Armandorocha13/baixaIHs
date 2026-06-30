const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['BAIXA'];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Total rows in BAIXA: ${rows.length}`);

  // Inspect unique values for some columns
  const colsToInspect = ['PROJETO', 'MOTIVO', 'ESTADO', 'TAREFA', 'CODCT'];
  const uniqueValues = {};
  
  colsToInspect.forEach(col => {
    uniqueValues[col] = new Set();
  });

  rows.forEach(row => {
    colsToInspect.forEach(col => {
      if (row[col] !== undefined) {
        uniqueValues[col].add(row[col]);
      }
    });
  });

  colsToInspect.forEach(col => {
    console.log(`\nUnique values in '${col}' (count: ${uniqueValues[col].size}):`);
    console.log(Array.from(uniqueValues[col]).slice(0, 20));
  });

  // Let's check if there are other columns, and print the first 5 rows fully formatted
  console.log('\nFirst 5 rows:');
  console.log(rows.slice(0, 5));

} catch (error) {
  console.error('Error:', error);
}
