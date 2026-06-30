const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('SheetNames list:', workbook.SheetNames);
  if (workbook.Workbook && workbook.Workbook.Sheets) {
    console.log('Workbook Sheets settings:');
    workbook.Workbook.Sheets.forEach(s => {
      console.log(`- name: ${s.name}, Hidden flag: ${s.Hidden}`);
    });
  } else {
    console.log('No Workbook.Sheets metadata found.');
  }
} catch (error) {
  console.error('Error:', error);
}
