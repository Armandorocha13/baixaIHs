/**
 * Script de teste: valida a conexão e a leitura da Google Sheets API
 * sem realizar modificações no estado ou banco de dados do sistema.
 *
 * Como rodar:
 *   node scripts_teste/testar_sincronizacao.js
 */
require('dotenv').config();
const { buscarLinhasPlanilha } = require('../servicos/servico_google_sheets');
const { parseDate, getStatus, safeInt } = require('../servicos/armazenamento_dados');

async function main() {
  console.log('=== Teste de Leitura e Autenticação Google Sheets ===\n');

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const possuiChave = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  console.log(`ID da planilha configurado:  ${spreadsheetId ? '✅ Sim' : '❌ Não'}`);
  console.log(`Credenciais autenticação:    ${possuiChave ? '✅ Sim' : '❌ Não'}`);

  if (!spreadsheetId || !possuiChave) {
    console.error('\n⛔ Erro na configuração do arquivo .env. Corrija para continuar.');
    process.exit(1);
  }

  console.log('\nBuscando linhas da planilha do Google Sheets...');
  const registros = await buscarLinhasPlanilha();
  console.log(`✅ Foram lidas ${registros.length} linhas da aba ativa.\n`);

  if (registros.length === 0) {
    console.log('⚠️ Nenhuma linha de dados encontrada na planilha. Certifique-se de que há registros após a linha de cabeçalho.');
    process.exit(0);
  }

  console.log('--- Amostragem: primeiras 3 linhas ---');
  const amostra = registros.slice(0, 3);
  amostra.forEach((reg, i) => {
    console.log(`\nLinha ${i + 1}:`);
    console.log(`  NUM_OS:        ${reg.NUM_OS}`);
    console.log(`  NUM_CLIENTE:   ${reg.NUM_CLIENTE}`);
    console.log(`  DATA_EXECUCAO: ${reg.DATA_EXECUCAO}  → convertido: ${parseDate(reg.DATA_EXECUCAO)}`);
    console.log(`  EQUIPE:        ${reg.EQUIPE}`);
    console.log(`  CODMAT:        ${reg.CODMAT}`);
    console.log(`  CODCPL:        ${reg.CODCPL}`);
    console.log(`  QTDE_APLIC:    ${reg.QTDE_APLIC}  → safeInt: ${safeInt(reg.QTDE_APLIC)}`);
    console.log(`  QTDE_REMOV:    ${reg.QTDE_REMOV}  → safeInt: ${safeInt(reg.QTDE_REMOV)}`);
    console.log(`  MOTIVO:        ${reg.MOTIVO}  → status: ${getStatus(reg.MOTIVO)}`);
    console.log(`  UF:            ${reg.UF || reg.ESTADO}`);
    console.log(`  PROJETO:       ${reg.PROJETO}`);
  });

  console.log('\n--- Cabeçalhos de coluna detectados ---');
  const chaves = Object.keys(registros[0]);
  console.log(chaves.join(', '));

  console.log('\n✅ Teste de conexão e leitura finalizado com sucesso.');
}

main().catch(err => {
  console.error('Falha ao testar leitura da API do Google Sheets:', err);
  process.exit(1);
});
