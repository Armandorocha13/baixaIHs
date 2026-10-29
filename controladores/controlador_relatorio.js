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

  const emailDestinatario = recipientEmail || process.env.EMAIL_RECIPIENT || 'mandoqxo@gmail.com, thiagosouza@ffainfraestrutura.com.br, victorrodrigues@ffainfraestrutura.com.br, armandolima@ffainfraestrutura.com.br, priscilasouza@ffainfraestrutura.com.br, douglasfaria@ffainfraestrutura.com.br, tamiresmello@ffainfraestrutura.com.br, eduardooliveira@ffainfraestrutura.com.br, alinenascimento@ffainfraestrutura.com.br, joseguimaraes@ffainfraestrutura.com.br, raimundolima@ffainfraestrutura.com.br';

  try {
    console.log(`[Relatório] Preparando envio de relatório por e-mail para: ${emailDestinatario}`);

    // Constrói a planilha Excel em memória utilizando a totalidade dos dados presentes no cache
    const armazenamentoDados = require('../servicos/armazenamento_dados');
    const todosRegistros = armazenamentoDados.getRecords();
    const bufferExcel = await criarPlanilhaLogs(todosRegistros);

    // Gera o gráfico oficial com as cores garantidas no servidor (RJ: Azul Claro #38bdf8, SP: Azul Escuro #1e3a8a)
    let bufferGrafico = null;
    try {
      const { gerarGraficoBuffer } = require('../servicos/grafico_servidor');
      bufferGrafico = await gerarGraficoBuffer(todosRegistros);
    } catch (e) {
      console.warn('[Relatório] Falha ao gerar gráfico server-side, utilizando fallback do cliente:', e.message);
    }

    // Se a geração remota falhar, utiliza como fallback o gráfico enviado pelo navegador
    if (!bufferGrafico && chartImage) {
      const dadosBase64 = chartImage.replace(/^data:image\/png;base64,/, '');
      bufferGrafico = Buffer.from(dadosBase64, 'base64');
    }

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
