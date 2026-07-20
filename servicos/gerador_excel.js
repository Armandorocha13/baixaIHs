const ExcelJS = require('exceljs');

/**
 * Cria uma planilha Excel estilizada contendo a tabela analítica dos logs de consumo.
 *
 * @param {Array} registros Lista de objetos de log obtidos da memória
 * @returns {Promise<Buffer>} Buffer binário da planilha Excel
 */
async function criarPlanilhaLogs(registros) {
  const pastaTrabalho = new ExcelJS.Workbook();
  pastaTrabalho.creator = 'Painel IHS';
  pastaTrabalho.lastModifiedBy = 'Painel IHS';
  pastaTrabalho.created = new Date();
  pastaTrabalho.modified = new Date();

  const abaDados = pastaTrabalho.addWorksheet('Relatório Analítico');

  abaDados.columns = [
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

  const linhaCabecalho = abaDados.getRow(1);
  linhaCabecalho.height = 24;
  linhaCabecalho.eachCell((celula) => {
    celula.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    celula.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111111' } // Fundo escuro/preto correspondendo aos botões
    };
    celula.alignment = { vertical: 'middle', horizontal: 'center' };
    celula.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } }
    };
  });

  registros.forEach((log, indice) => {
    const linha = abaDados.addRow({
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

    const ehPar = indice % 2 === 0;
    linha.height = 18;
    linha.eachCell((celula, numeroColuna) => {
      celula.font = { name: 'Arial', size: 10 };
      if (ehPar) {
        celula.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Linhas alternadas em cinza claro
        };
      }
      
      celula.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (numeroColuna === 7 || numeroColuna === 8) {
        celula.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        celula.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  });

  abaDados.columns.forEach((coluna) => {
    let tamanhoMaximo = 0;
    coluna.eachCell({ includeEmpty: true }, (celula) => {
      const stringValor = celula.value ? celula.value.toString() : '';
      if (stringValor.length > tamanhoMaximo) {
        tamanhoMaximo = stringValor.length;
      }
    });
    coluna.width = Math.max(tamanhoMaximo + 4, 10);
  });

  return await pastaTrabalho.xlsx.writeBuffer();
}

module.exports = { criarPlanilhaLogs };
