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
 * Obtém as linhas de uma planilha do Google Sheets e as retorna como um array
 * de objetos mapeados pelos nomes de coluna do cabeçalho em letras maiúsculas.
 *
 * @param {Object} [opcoes]
 * @param {string} [opcoes.spreadsheetId] - ID da planilha (sobrescreve a variável de ambiente)
 * @param {string} [opcoes.range]         - Intervalo (sobrescreve a variável de ambiente)
 * @returns {Promise<Object[]>} Registros mapeados
 */
async function buscarLinhasPlanilha(opcoes = {}) {
  const spreadsheetId = opcoes.spreadsheetId || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const range = opcoes.range || process.env.GOOGLE_SHEETS_RANGE || 'BAIXA!A1:Z';

  if (!spreadsheetId) {
    throw new Error(
      'A variável GOOGLE_SHEETS_SPREADSHEET_ID não está configurada no .env.'
    );
  }

  console.log(`[GoogleSheets] Autenticando com Conta de Serviço...`);
  const auth = obterClienteAutenticacao();

  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`[GoogleSheets] Lendo planilha ID ${spreadsheetId}, intervalo "${range}"...`);
  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const linhasBrutas = resposta.data.values;

  if (!linhasBrutas || linhasBrutas.length < 2) {
    console.log('[GoogleSheets] Nenhuma linha de dados encontrada na planilha.');
    return [];
  }

  // A primeira linha contém os cabeçalhos normalizados (sem espaços e em maiúsculas)
  const cabecalhos = linhasBrutas[0].map(h => String(h).trim().toUpperCase());

  const registros = [];
  for (let i = 1; i < linhasBrutas.length; i++) {
    const celulas = linhasBrutas[i];
    const obj = {};

    for (let j = 0; j < cabecalhos.length; j++) {
      const chave = cabecalhos[j];
      const valor = celulas[j] !== undefined ? celulas[j] : null;
      if (chave) {
        obj[chave] = valor;
      }
    }

    registros.push(obj);
  }

  console.log(`[GoogleSheets] Retornados ${registros.length} registros da API do Google Sheets.`);
  return registros;
}

module.exports = { buscarLinhasPlanilha, obterClienteAutenticacao };
