const nodemailer = require('nodemailer');

/**
 * Dispara o relatório por e-mail contendo o gráfico de comparação embutido (inline)
 * e a planilha Excel analítica anexa.
 *
 * @param {string} destinatarios Lista de e-mails de destino separados por vírgula
 * @param {Buffer} bufferGrafico Buffer binário do gráfico PNG
 * @param {Buffer} bufferExcel Buffer binário da planilha Excel XLSX
 * @param {string} filtroCidade Nome amigável do filtro de cidade ativo
 * @param {Object} kpis Métricas de resumo de KPIs
 */
async function enviarRelatorioEmail(destinatarios, bufferGrafico, bufferExcel, filtroCidade, kpis) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const urlDashboard = process.env.DASHBOARD_URL || 'https://baixaihs.onrender.com/';

  const htmlEmail = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; margin-top: 0; margin-bottom: 10px;">Relatório de Acompanhamento de Baixas</h2>
      <p style="font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Filtro de Cidade active: <strong>${filtroCidade}</strong></p>

      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
        Olá,<br><br>
        Segue o resumo diário de acompanhamento de baixas de modems da operação IHS. A planilha detalhada com a exportação da tabela analítica está disponível em anexo.<br><br>
        Para interagir com os filtros e visualizar os dados completos, acesse o painel online:<br>
        <a href="${urlDashboard}" style="color: #065f46; text-decoration: underline; font-weight: bold;">${urlDashboard}</a>
      </p>

      <div style="margin-bottom: 24px;">
        <table style="width: 100%; border-spacing: 12px; margin-left: -12px; margin-right: -12px;">
          <tr>
            <td style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #1e40af; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">TOTAL DO DIA</span>
              <span style="font-size: 22px; color: #1e3a8a; font-weight: bold;">${kpis.total}</span>
            </td>
            <td style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #065f46; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">SUCESSOS DO DIA</span>
              <span style="font-size: 22px; color: #0f5132; font-weight: bold;">${kpis.sucessos}</span>
            </td>
            <td style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #6b21a8; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">TAXA DO DIA</span>
              <span style="font-size: 22px; color: #581c87; font-weight: bold;">${kpis.taxa}</span>
            </td>
          </tr>
        </table>
      </div>

      <h3 style="color: #334155; font-size: 14px; margin-bottom: 12px; font-weight: bold;">Comparativo Diário de Importações: RJ × SP</h3>
      <div style="text-align: center; margin-bottom: 24px; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px; background-color: #ffffff;">
        <img src="cid:comparisonChart" style="width: 100%; max-width: 550px; height: auto; display: block; margin: 0 auto;" />
      </div>

      <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center; margin-top: 24px;">
        Gerado automaticamente pelo Painel de Acompanhamento de Baixas IHS.
      </div>
    </div>
  `;

  if (resendApiKey) {
    console.log('[E-mail] Utilizando API HTTP do Resend para envio.');
    const deEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    // Divide os destinatários caso venham separados por vírgula ou ponto e vírgula
    const listaTo = destinatarios.split(/[;,]/).map(e => e.trim()).filter(Boolean);

    const attachments = [
      {
        filename: 'comparativo_diario.png',
        content: bufferGrafico.toString('base64'),
        contentId: 'comparisonChart'
      },
      {
        filename: `relatorio_baixas_IHS_${new Date().toISOString().split('T')[0]}.xlsx`,
        content: bufferExcel.toString('base64')
      }
    ];

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Painel IHS <${deEmail}>`,
        to: listaTo,
        subject: `Relatório de Logs de Consumo - MODEM [${filtroCidade}]`,
        html: htmlEmail,
        attachments: attachments
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Erro na API do Resend: ${response.status} - ${errorData.message || response.statusText}`);
    }

    console.log('[E-mail] Relatório enviado com sucesso via Resend.');
    return;
  }

  // --- Fallback SMTP Nodemailer ---
  const usuarioEmail = process.env.EMAIL_USER;
  const senhaEmail = process.env.EMAIL_PASS;

  if (!usuarioEmail || !senhaEmail) {
    throw new Error('As credenciais SMTP (EMAIL_USER / EMAIL_PASS) ou RESEND_API_KEY não estão definidas no arquivo .env.');
  }

  const transportador = nodemailer.createTransport({
    host: 'smtp.kinghost.net',
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 10000, // 10 segundos
    greetingTimeout: 10000,   // 10 segundos
    socketTimeout: 10000,     // 10 segundos
    auth: {
      user: usuarioEmail,
      pass: senhaEmail
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const anexos = [
    {
      filename: 'comparativo_diario.png',
      content: bufferGrafico,
      cid: 'comparisonChart'
    },
    {
      filename: `relatorio_baixas_IHS_${new Date().toISOString().split('T')[0]}.xlsx`,
      content: bufferExcel,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  ];

  await transportador.sendMail({
    from: `"Painel IHS" <${usuarioEmail}>`,
    to: destinatarios.replace(/;/g, ','),
    subject: `Relatório de Logs de Consumo - MODEM [${filtroCidade}]`,
    html: htmlEmail,
    attachments: anexos
  });
}

module.exports = { enviarRelatorioEmail };
