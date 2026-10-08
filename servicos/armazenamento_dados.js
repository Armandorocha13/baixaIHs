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
  if (m.includes('sucesso') || m.includes('instalado') || m.includes('conclu') || m.includes('baixad')) return 'SUCESSO';
  if (m.includes('saldo')) return 'SEM SALDO';
  if (m.includes('baixado') || m.includes('já baixado') || m.includes('ja baixado')) return 'JÁ BAIXADO';
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

/**
 * Normaliza um registro individual vindo da aba clássica BAIXA.
 * Preserva integralmente o histórico de RJ e dados antigos de SP.
 */
function normalizarLinhaBaixa(row) {
  const numOs = row.NUM_OS ? String(row.NUM_OS).trim() : null;
  if (!numOs) return null;

  const dataExec = parseDate(row.DATA_EXECUCAO);
  const motivo = row.MOTIVO ? String(row.MOTIVO).trim() : 'Importado com sucesso.';

  return {
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
  };
}

/**
 * Normaliza um registro individual vindo da aba BAIXA CONNECT (dados de SP).
 */
function normalizarLinhaConnect(row) {
  // Identificação do número de OS: prioriza OS, OBSERVACAO TÉCNICO, WO, CONTRATO ou SERIAL
  const osRaw =
    row['OS'] ||
    row['OBSERVACAO TÉCNICO'] ||
    row['OBSERVACAO TECNICO'] ||
    row['WO'] ||
    row['CONTRATO'] ||
    row['SERIAL'];

  const numOs = osRaw ? String(osRaw).trim() : null;
  if (!numOs) return null;

  const dataRaw =
    row['DATA ALTERAÇÃO'] ||
    row['DATA ALTERACAO'] ||
    row['DATA CONTRATO'];

  const dataExec = parseDate(dataRaw);

  const cliente = row['CONTRATO']
    ? String(row['CONTRATO']).trim()
    : (row['BASE'] ? String(row['BASE']).trim() : '-');

  const eqRaw =
    row['TECNICO'] ||
    row['RE'] ||
    row['LOGIN'] ||
    row['ALTERADO POR'];
  const equipe = eqRaw ? String(eqRaw).trim() : null;

  const matRaw = row['SAP'] || row['CODIGO'] || row['MODELO'];
  const material = matRaw ? String(matRaw).trim() : null;

  const serialRaw = row['SERIAL'] || row['MAC'];
  const codcpl = serialRaw ? String(serialRaw).trim() : null;

  const motRaw = row['DMT/LOTE'] || row['STATUS'] || 'Baixa realizada';
  const motivo = motRaw ? String(motRaw).trim() : 'Baixa realizada';

  const statusRaw = row['STATUS'] || motivo;
  const status = getStatus(statusRaw);

  const projRaw = row['BASE'] || 'I-SYSTEMS';
  const projeto = projRaw ? String(projRaw).trim() : 'I-SYSTEMS';

  return {
    num_os: numOs,
    cliente,
    data_execucao: dataExec,
    data_execucao_formatted: formatDateBR(dataExec),
    data_label: formatDateLabel(dataExec),
    equipe,
    material,
    codcpl,
    qtd_aplic: 1, // Cada item registrado em BAIXA CONNECT representa 1 instalação de equipamento
    qtd_remov: 0,
    aba_origem: 'BAIXA CONNECT',
    motivo,
    status,
    estado: 'SP', // Dados da aba BAIXA CONNECT pertencem à operação de SP
    projeto,
  };
}

// ---------------------------------------------------------------------------
// API Pública
// ---------------------------------------------------------------------------

/**
 * Processa as linhas vindas do Google Sheets e armazena os registros consolidados.
 * Suporta tanto o formato objeto { baixa, baixaConnect } quanto array clássico,
 * preservando 100% dos dados históricos de SP e RJ da aba BAIXA e agregando os novos
 * registros de SP de BAIXA CONNECT de forma desduplicada.
 *
 * @param {Object|Array} dadosEntrada - Dados retornados pelo serviço do Google Sheets
 * @returns {number} Quantidade de registros consolidados armazenados
 */
function setRecords(dadosEntrada) {
  let linhasBaixa = [];
  let linhasConnect = [];

  if (Array.isArray(dadosEntrada)) {
    // Array simples: distribui conforme as propriedades da linha
    for (const row of dadosEntrada) {
      if (row.SERIAL && (row.STATUS || row['ALTERADO POR']) && !row.CODMAT) {
        linhasConnect.push(row);
      } else {
        linhasBaixa.push(row);
      }
    }
  } else if (dadosEntrada && typeof dadosEntrada === 'object') {
    linhasBaixa = dadosEntrada.baixa || [];
    linhasConnect = dadosEntrada.baixaConnect || [];
  }

  const mapaChaves = new Set();
  const consolidados = [];

  // 1. Processar registros da aba clássica BAIXA (preservando histórico RJ e SP)
  let countBaixa = 0;
  for (const row of linhasBaixa) {
    const item = normalizarLinhaBaixa(row);
    if (!item) continue;

    const chave = `${item.estado}_${item.num_os}_${item.codcpl || ''}_${item.data_execucao || ''}`;
    if (!mapaChaves.has(chave)) {
      mapaChaves.add(chave);
      consolidados.push(item);
      countBaixa++;
    }
  }

  // 2. Processar registros da nova aba BAIXA CONNECT (dados de SP)
  let countConnect = 0;
  for (const row of linhasConnect) {
    const item = normalizarLinhaConnect(row);
    if (!item) continue;

    const chave = `${item.estado}_${item.num_os}_${item.codcpl || ''}_${item.data_execucao || ''}`;
    if (!mapaChaves.has(chave)) {
      mapaChaves.add(chave);
      consolidados.push(item);
      countConnect++;
    }
  }

  _records = consolidados;
  _lastSyncTime = new Date();
  console.log(`[ArmazenamentoDados] Consolidados ${consolidados.length} registros em memória (BAIXA: ${countBaixa}, BAIXA CONNECT: ${countConnect}).`);
  return consolidados.length;
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
