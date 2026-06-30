const ExcelJS = require('exceljs');

/**
 * Builds a styled Excel Workbook (.xlsx) with a single sheet containing the formatted Analytical table.
 * @param {Array} logs Array of log objects from DB query
 * @returns {Promise<Buffer>} Excel workbook binary buffer
 */
async function buildExcelDashboard(logs) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Painel IHS';
  workbook.lastModifiedBy = 'Painel IHS';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create a single sheet for the analytical table
  const wsDados = workbook.addWorksheet('Relatório Analítico');

  // Define Columns (including UF)
  wsDados.columns = [
    { header: 'NUMERO OS', key: 'num_os', width: 15 },
    { header: 'CLIENTE', key: 'cliente', width: 15 },
    { header: 'DATA EXECUCAO', key: 'data_execucao', width: 15 },
    { header: 'EQUIPE (MATRICULA)', key: 'equipe', width: 20 },
    { header: 'MATERIAL', key: 'material', width: 15 },
    { header: 'CODCPL', key: 'codcpl', width: 20 },
    { header: 'QTD. APLIC', key: 'qtd_aplic', width: 12 },
    { header: 'QTD. REMOV', key: 'qtd_remov', width: 12 },
    { header: 'ABA / ORIGEM', key: 'aba_origem', width: 15 },
    { header: 'MOTIVO / RETORNO', key: 'motivo', width: 30 },
    { header: 'STATUS', key: 'status', width: 15 },
    { header: 'UF', key: 'estado', width: 10 }
  ];

  // Style Header Row
  const headerRow = wsDados.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111111' } // Black header matching buttons
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } }
    };
  });

  // Populate data rows
  logs.forEach((log, idx) => {
    const row = wsDados.addRow({
      num_os: log.num_os || '',
      cliente: log.cliente || '',
      data_execucao: log.data_execucao_formatted || '',
      equipe: log.equipe || '',
      material: log.material || '',
      codcpl: log.codcpl || '',
      qtd_aplic: log.qtd_aplic !== null ? Number(log.qtd_aplic) : 0,
      qtd_remov: log.qtd_remov !== null ? Number(log.qtd_remov) : 0,
      aba_origem: log.aba_origem || 'MODEM',
      motivo: log.motivo || '',
      status: log.status || '',
      estado: log.estado || ''
    });

    const isEven = idx % 2 === 0;
    row.height = 18;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10 };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Alternating light grey rows
        };
      }
      
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Alignment: right-align number columns, center others
      if (colNumber === 7 || colNumber === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  // Auto-fit Column Widths based on maximum cell lengths
  wsDados.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : '';
      if (valStr.length > maxLength) {
        maxLength = valStr.length;
      }
    });
    column.width = Math.max(maxLength + 4, 10);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { buildExcelDashboard };
