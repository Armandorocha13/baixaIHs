const { criarPlanilhaLogs } = require('../servicos/gerador_excel');
const { enviarRelatorioEmail } = require('../servicos/servico_email');

/**
 * POST /api/send-report
 * Processa a requisição, gera a planilha Excel XLSX em memória contendo todos os dados,
 * e despacha o e-mail contendo o gráfico embutido.
 */
async function enviarRelatorio(req, res) {
  const { recipientEmail, chartImage, cidade, kpis } = req.body;
  
  if (!chartImage || !kpis) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
  }

  const emailDestinatario = recipientEmail || process.env.EMAIL_RECIPIENT || 'thiagosouza@ffainfraestrutura.com.br, victorrodrigues@ffainfraestrutura.com.br, armandolima@ffainfraestrutura.com.br, priscilasouza@ffainfraestrutura.com.br, douglasfarias@ffainfraestrutura.com.br, tamiresmello@ffainfraestrutura.com.br, eduardooliveira@ffainfraestrutura.com.br, alinenascimento@ffainfraestrutura.com.br';

  try {
    console.log(`[Relatório] Preparando envio de relatório por e-mail para: ${emailDestinatario}`);

    // Converte os dados base64 do gráfico em Buffer binário
    const dadosBase64 = chartImage.replace(/^data:image\/png;base64,/, '');
    const bufferGrafico = Buffer.from(dadosBase64, 'base64');

    // Constrói a planilha Excel em memória utilizando a totalidade dos dados presentes no cache
    const armazenamentoDados = require('../servicos/armazenamento_dados');
    const todosRegistros = armazenamentoDados.getRecords();
    const bufferExcel = await criarPlanilhaLogs(todosRegistros);

    const filtroCidade = cidade === 'all' ? 'Todas (RJ & SP)' : cidade.toUpperCase();

    // Dispara o envio através do serviço
    await enviarRelatorioEmail(emailDestinatario, bufferGrafico, bufferExcel, filtroCidade, kpis);

    console.log(`[Relatório] E-mail enviado com sucesso para: ${emailDestinatario}`);
    res.json({ success: true, message: 'Relatório enviado por e-mail com sucesso' });

  } catch (err) {
    console.error('[Relatório] Erro no envio de e-mail através do controlador:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar e enviar e-mail' });
  }
}

module.exports = {
  enviarRelatorio
};
