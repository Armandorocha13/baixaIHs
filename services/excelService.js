const XLSX = require('xlsx');
const path = require('path');
const db = require('../config/db');

function parseDate(dateVal) {
  if (!dateVal) return null;
  
  // If it's already a JS Date object (parsed by xlsx with cellDates: true)
  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel serial date)
  if (typeof dateVal === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsedDate = new Date(excelEpoch.getTime() + dateVal * 24 * 60 * 60 * 1000);
    return parsedDate.toISOString().split('T')[0];
  }
  
  const str = String(dateVal).trim();
  
  // Try DD/MM/YYYY format
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  
  // Fallback to standard JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return null;
}

function getStatus(motivo) {
  if (!motivo) return 'SUCESSO';
  const m = String(motivo).toLowerCase();
  if (m.includes('sucesso')) return 'SUCESSO';
  if (m.includes('saldo')) return 'SEM SALDO';
  if (m.includes('baixado')) return 'JÁ BAIXADO';
  return 'ERRO';
}

async function importExcel(filePath) {
  try {
    console.log(`Reading Excel file: ${filePath}`);
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    
    // We import data from the BAIXA sheet, or first sheet if BAIXA doesn't exist
    const sheetName = workbook.SheetNames.includes('BAIXA') ? 'BAIXA' : workbook.SheetNames[0];
    console.log(`Using sheet: ${sheetName}`);
    
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    console.log(`Found ${rows.length} rows to import.`);

    if (rows.length === 0) {
      console.log('No rows found to import.');
      return;
    }

    // Connect and start transaction
    await db.initDb();
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Truncate existing logs
      console.log('Clearing existing log records...');
      await client.query('TRUNCATE TABLE logs_consumo RESTART IDENTITY');

      console.log('Inserting new records...');
      const insertQuery = `
        INSERT INTO logs_consumo (
          num_os, cliente, data_execucao, equipe, material, codcpl, 
          qtd_aplic, qtd_remov, aba_origem, motivo, status, estado, projeto
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      let importedCount = 0;
      for (const row of rows) {
        // Map Excel columns to database fields
        const numOs = row.NUM_OS ? String(row.NUM_OS).trim() : null;
        const cliente = row.NUM_CLIENTE ? String(row.NUM_CLIENTE).trim() : '-';
        const dataExec = parseDate(row.DATA_EXECUCAO);
        const equipe = row.EQUIPE ? String(row.EQUIPE).trim() : null;
        const material = row.CODMAT ? String(row.CODMAT).trim() : null;
        const codcpl = row.CODCPL ? String(row.CODCPL).trim() : null;
        
        const qtdAplic = row.QTDE_APLIC !== undefined ? parseInt(row.QTDE_APLIC, 10) : 0;
        const qtdRemov = row.QTDE_REMOV !== undefined ? parseInt(row.QTDE_REMOV, 10) : 0;
        
        // As per request, aba_origem is MODEM (renamed from ETER)
        const abaOrigem = 'MODEM';
        
        const motivo = row.MOTIVO ? String(row.MOTIVO).trim() : 'Importado com sucesso.';
        const status = getStatus(motivo);
        const estado = row.ESTADO ? String(row.ESTADO).trim().toUpperCase() : 'RJ';
        const projeto = row.PROJETO ? String(row.PROJETO).trim() : '';

        // Only insert if OS number is present
        if (numOs) {
          await client.query(insertQuery, [
            numOs, cliente, dataExec, equipe, material, codcpl,
            qtdAplic, qtdRemov, abaOrigem, motivo, status, estado, projeto
          ]);
          importedCount++;
        }
      }

      await client.query('COMMIT');
      console.log(`Successfully imported ${importedCount} records to the database.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during database transaction, transaction rolled back.');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error importing Excel data:', err);
    throw err;
  }
}

// If run directly
if (require.main === module) {
  const excelPath = path.join(__dirname, 'Acompanhamento de baixa - MODENS IHS.xlsx');
  importExcel(excelPath)
    .then(() => {
      console.log('Import finished successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Import failed:', err);
      process.exit(1);
    });
}

module.exports = { importExcel, parseDate, getStatus };
