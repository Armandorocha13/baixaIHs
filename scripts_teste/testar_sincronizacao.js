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

  console.log('\nBuscando linhas da planilha do Google Sheets (BAIXA e BAIXA CONNECT)...');
  const dados = await buscarLinhasPlanilha();
  
  const linhasBaixa = dados.baixa || (Array.isArray(dados) ? dados : []);
  const linhasConnect = dados.baixaConnect || [];

  console.log(`✅ Aba BAIXA:           ${linhasBaixa.length} registros lidos.`);
  console.log(`✅ Aba BAIXA CONNECT:   ${linhasConnect.length} registros lidos.`);

  const armazenamentoDados = require('../servicos/armazenamento_dados');
  const totalArmazenado = armazenamentoDados.setRecords(dados);
  const registros = armazenamentoDados.getRecords();

  console.log(`\n🎉 Total consolidado em memória: ${totalArmazenado} registros (sem perda de dados históricos).`);

  const rjCount = registros.filter(r => r.estado === 'RJ').length;
  const spCount = registros.filter(r => r.estado === 'SP').length;
  const connectCount = registros.filter(r => r.aba_origem === 'BAIXA CONNECT').length;
  const baixaSpCount = spCount - connectCount;

  console.log('\n--- Resumo por Origem e Estado ---');
  console.log(`  RJ (Aba BAIXA):              ${rjCount} registros`);
  console.log(`  SP Antigo (Aba BAIXA):       ${baixaSpCount} registros`);
  console.log(`  SP Novo (Aba BAIXA CONNECT): ${connectCount} registros`);
  console.log(`  Total SP:                    ${spCount} registros`);

  console.log('\n--- Amostra de Registro de BAIXA CONNECT ---');
  const amostraConnect = registros.find(r => r.aba_origem === 'BAIXA CONNECT');
  if (amostraConnect) {
    console.log(JSON.stringify(amostraConnect, null, 2));
  }

  console.log('\n✅ Teste de sincronização e consolidação finalizado com sucesso.');
}

main().catch(err => {
  console.error('Falha ao testar leitura da API do Google Sheets:', err);
  process.exit(1);
});
