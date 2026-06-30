const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Monitoramento'];
  // Convert to JSON with raw values to see what is in there
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Total rows in Monitoramento: ${data.length}`);
  
  // Print non-empty rows
  data.forEach((row, index) => {
    // If row is not completely empty, print it
    if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      console.log(`Row ${index}:`, row);
    }
  });

} catch (error) {
  console.error('Error:', error);
}
