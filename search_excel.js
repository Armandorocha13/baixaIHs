const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    let emisCount = 0;
    let eterCount = 0;
    let errorMsgCount = 0;

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[cellAddress];
        if (cell && cell.v !== undefined) {
          const valStr = String(cell.v).toLowerCase();
          if (valStr.includes('emis')) emisCount++;
          if (valStr.includes('eter')) eterCount++;
          if (valStr.includes('saldo') || valStr.includes('equipe') || valStr.includes('baixado')) errorMsgCount++;
        }
      }
    }

    console.log(`Sheet: ${sheetName}`);
    console.log(`- EMIS occurrences: ${emisCount}`);
    console.log(`- ETER occurrences: ${eterCount}`);
    console.log(`- Error messages / balance keywords: ${errorMsgCount}`);
  });
} catch (error) {
  console.error('Error:', error);
}
