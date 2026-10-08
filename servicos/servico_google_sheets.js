const { google } = require('googleapis');

/**
 * Autentica com a API do Google Sheets utilizando uma conta de serviço (Service Account).
 * @returns {google.auth.GoogleAuth} Cliente autenticado
 */
function obterClienteAutenticacao() {
  const chaveJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (chaveJson) {
    let credenciais;
    try {
      credenciais = JSON.parse(chaveJson);
      if (credenciais.private_key) {
        credenciais.private_key = credenciais.private_key.replace(/\\n/g, '\n');
      }
    } catch (err) {
      throw new Error(
        'A variável GOOGLE_SERVICE_ACCOUNT_KEY não contém um JSON válido.'
      );
    }

    return new google.auth.GoogleAuth({
      credentials: credenciais,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  throw new Error(
    'Nenhuma credencial de conta de serviço do Google foi encontrada no arquivo .env.'
  );
}

/**
 * Converte uma matriz de linhas brutas (onde a primeira linha é o cabeçalho)
 * em um array de objetos com as chaves em letras maiúsculas.
 *
 * @param {Array<Array<any>>} linhasBrutas
 * @returns {Array<Object>}
 */
function converterMatrizParaObjetos(linhasBrutas) {
  if (!linhasBrutas || linhasBrutas.length < 2) {
    return [];
  }

  const cabecalhos = linhasBrutas[0].map(h => String(h).trim().toUpperCase());
  const registros = [];

  for (let i = 1; i < linhasBrutas.length; i++) {
    const celulas = linhasBrutas[i];
    const obj = {};

    for (let j = 0; j < cabecalhos.length; j++) {
      const chave = cabecalhos[j];
      const valor = celulas[j] !== undefined && celulas[j] !== null ? celulas[j] : null;
      if (chave) {
        obj[chave] = valor;
      }
    }

    registros.push(obj);
  }

  return registros;
}

/**
 * Obtém as linhas da planilha do Google Sheets.
 * Por padrão, busca simultaneamente as abas 'BAIXA' e 'BAIXA CONNECT' via batchGet,
 * retornando um objeto { baixa: Object[], baixaConnect: Object[] }.
 *
 * @param {Object} [opcoes]
 * @param {string} [opcoes.spreadsheetId] - ID da planilha (sobrescreve a variável de ambiente)
 * @param {string} [opcoes.range]         - Intervalo único opcional (para buscas pontuais)
 * @returns {Promise<{baixa: Object[], baixaConnect: Object[]}|Object[]>}
 */
async function buscarLinhasPlanilha(opcoes = {}) {
  const spreadsheetId = opcoes.spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const rangeCustomizado = opcoes.range;

  const possuiChave = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!spreadsheetId || !possuiChave) {
    console.log('[GoogleSheets] Sem credenciais ou ID no .env. Tentando carregar planilha local como fallback...');
    const XLSX = require('xlsx');
    const path = require('path');
    const fs = require('fs');

    const caminhoPlanilha = path.join(__dirname, '../Acompanhamento de baixa - MODENS IHS.xlsx');
    if (fs.existsSync(caminhoPlanilha)) {
      const workbook = XLSX.readFile(caminhoPlanilha);
      const sheetBaixa = workbook.SheetNames.includes('BAIXA') ? workbook.Sheets['BAIXA'] : workbook.Sheets[workbook.SheetNames[0]];
      const dadosBaixa = XLSX.utils.sheet_to_json(sheetBaixa);

      let dadosConnect = [];
      if (workbook.SheetNames.includes('BAIXA CONNECT')) {
        const sheetConnect = workbook.Sheets['BAIXA CONNECT'];
        dadosConnect = XLSX.utils.sheet_to_json(sheetConnect);
      }

      console.log(`[GoogleSheets] Carregados ${dadosBaixa.length} registros de BAIXA e ${dadosConnect.length} de BAIXA CONNECT da planilha local.`);
      if (rangeCustomizado) {
        return dadosBaixa;
      }
      return {
        baixa: dadosBaixa,
        baixaConnect: dadosConnect,
      };
    }
    throw new Error(
      'Nenhuma credencial Google Sheets encontrada no .env e planilha local também não encontrada.'
    );
  }

  console.log(`[GoogleSheets] Autenticando com Conta de Serviço...`);
  const auth = obterClienteAutenticacao();
  const sheets = google.sheets({ version: 'v4', auth });

  // Se um range específico foi solicitado (por exemplo, em script legado ou teste pontual)
  if (rangeCustomizado) {
    console.log(`[GoogleSheets] Lendo planilha ID ${spreadsheetId}, intervalo único "${rangeCustomizado}"...`);
    const resposta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeCustomizado,
    });
    const registros = converterMatrizParaObjetos(resposta.data.values);
    console.log(`[GoogleSheets] Retornados ${registros.length} registros do intervalo ${rangeCustomizado}.`);
    return registros;
  }

  // Modo padrão: busca simultânea das abas BAIXA e BAIXA CONNECT via batchGet
  const ranges = ["'BAIXA'!A1:Z", "'BAIXA CONNECT'!A1:Z"];
  console.log(`[GoogleSheets] Lendo planilha ID ${spreadsheetId}, intervalos batch: ${JSON.stringify(ranges)}...`);

  const resposta = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges,
  });

  const valueRanges = resposta.data.valueRanges || [];
  const linhasBaixa = valueRanges[0] && valueRanges[0].values ? valueRanges[0].values : [];
  const linhasConnect = valueRanges[1] && valueRanges[1].values ? valueRanges[1].values : [];

  const baixa = converterMatrizParaObjetos(linhasBaixa);
  const baixaConnect = converterMatrizParaObjetos(linhasConnect);

  console.log(`[GoogleSheets] Sincronização concluída: ${baixa.length} registros de BAIXA e ${baixaConnect.length} registros de BAIXA CONNECT.`);

  return {
    baixa,
    baixaConnect,
  };
}

module.exports = { buscarLinhasPlanilha, obterClienteAutenticacao, converterMatrizParaObjetos };

