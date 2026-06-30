const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined) {
          const valStr = String(cell.v).toLowerCase();
          if (valStr.includes('saldo') || valStr.includes('equipe') || valStr.includes('baixado')) {
            console.log(`Match in Sheet [${sheetName}], Cell [${cellAddress}]: "${cell.v}"`);
          }
        }
      }
    }
  });
} catch (error) {
  console.error('Error:', error);
}
