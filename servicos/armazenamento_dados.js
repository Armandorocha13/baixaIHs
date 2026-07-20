/**
 * Armazenamento de dados em memória para os registros processados da planilha.
 * Substitui o banco de dados PostgreSQL. A planilha do Google Sheets é a única
 * fonte da verdade; este módulo atua como um cache rápido em memória.
 */

// ---------------------------------------------------------------------------
// Estado interno
// ---------------------------------------------------------------------------
let _records = [];       // Array de objetos de registros processados
let _lastSyncTime = null; // Data e hora da última sincronização bem-sucedida

// ---------------------------------------------------------------------------
// Auxiliares de higienização de dados
// ---------------------------------------------------------------------------

function parseDate(dateVal) {
  if (!dateVal) return null;

  if (dateVal instanceof Date) {
    return dateVal.toISOString().split('T')[0];
  }

  if (typeof dateVal === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsedDate = new Date(excelEpoch.getTime() + dateVal * 24 * 60 * 60 * 1000);
    return parsedDate.toISOString().split('T')[0];
  }

  const str = String(dateVal).trim();

  // DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

function formatDateLabel(isoDate) {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return isoDate;
}

function getStatus(motivo) {
  if (!motivo) return 'SUCESSO';
  const m = String(motivo).toLowerCase();
  if (m.includes('sucesso')) return 'SUCESSO';
  if (m.includes('saldo')) return 'SEM SALDO';
  if (m.includes('baixado')) return 'JÁ BAIXADO';
  return 'ERRO';
}

function safeInt(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function deriveEstado(row) {
  // Suporte tanto para a nova coluna (UF) quanto para a antiga (ESTADO)
  const ufRaw = row.UF || row.ESTADO;

  if (ufRaw && String(ufRaw).trim()) {
    const val = String(ufRaw).trim().toUpperCase();
    if (val === 'SP' || val.includes('SAO PAULO') || val.includes('SÃO PAULO')) return 'SP';
    if (val === 'RJ' || val.includes('RIO')) return 'RJ';
    return val;
  }

  if (row.PROJETO) {
    const proj = String(row.PROJETO).trim().toUpperCase();
    if (/\bSP\b/.test(proj) || /-SP\b/.test(proj) || proj.includes('SAO PAULO') || proj.includes('SÃO PAULO')) return 'SP';
    if (/\bRJ\b/.test(proj) || /-RJ\b/.test(proj) || proj.includes('RJO') || proj.includes('RIO')) return 'RJ';
  }

  return 'RJ'; // Fallback padrão
}

// ---------------------------------------------------------------------------
// API Pública
// ---------------------------------------------------------------------------

/**
 * Processa as linhas brutas vindas do Google Sheets e armazena os registros higienizados.
 *
 * @param {Object[]} rawRows - Linhas brutas retornadas pelo serviço do Google Sheets
 * @returns {number} Quantidade de registros válidos armazenados
 */
function setRecords(rawRows) {
  const processed = [];

  for (const row of rawRows) {
    const numOs = row.NUM_OS ? String(row.NUM_OS).trim() : null;
    if (!numOs) continue; // Pula linhas sem número de OS

    const dataExec = parseDate(row.DATA_EXECUCAO);
    const motivo = row.MOTIVO ? String(row.MOTIVO).trim() : 'Importado com sucesso.';

    processed.push({
      num_os: numOs,
      cliente: row.NUM_CLIENTE ? String(row.NUM_CLIENTE).trim() : '-',
      data_execucao: dataExec,
      data_execucao_formatted: formatDateBR(dataExec),
      data_label: formatDateLabel(dataExec),
      equipe: row.EQUIPE ? String(row.EQUIPE).trim() : null,
      material: row.CODMAT ? String(row.CODMAT).trim() : null,
      codcpl: row.CODCPL ? String(row.CODCPL).trim() : null,
      qtd_aplic: safeInt(row.QTDE_APLIC),
      qtd_remov: safeInt(row.QTDE_REMOV),
      aba_origem: 'MODEM',
      motivo,
      status: getStatus(motivo),
      estado: deriveEstado(row),
      projeto: row.PROJETO ? String(row.PROJETO).trim() : '',
    });
  }

  _records = processed;
  _lastSyncTime = new Date();
  console.log(`[ArmazenamentoDados] Armazenados ${processed.length} registros em memória.`);
  return processed.length;
}

/**
 * Retorna todos os registros atualmente em memória.
 * @returns {Object[]}
 */
function getRecords() {
  return _records;
}

/**
 * Retorna a data e hora do último sincronismo com sucesso.
 * @returns {Date|null}
 */
function getLastSyncTime() {
  return _lastSyncTime;
}

/**
 * Retorna a quantidade total de registros em memória.
 * @returns {number}
 */
function getRecordCount() {
  return _records.length;
}

module.exports = {
  setRecords,
  getRecords,
  getLastSyncTime,
  getRecordCount,
  parseDate,
  getStatus,
  safeInt,
  formatDateBR,
  formatDateLabel,
};
