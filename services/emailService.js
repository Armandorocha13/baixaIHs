const nodemailer = require('nodemailer');

/**
 * Dispatches the report email with inline chart and XLSX analytical spreadsheet attachment.
 * @param {string} recipientEmail Recipient email address
 * @param {Buffer} chartBuffer Binary chart PNG buffer
 * @param {Buffer} excelBuffer Binary excel XLSX buffer
 * @param {string} filterCity Active city filter name (display friendly)
 * @param {Object} kpis Current summary KPI stats
 */
async function sendEmailReport(recipientEmail, chartBuffer, excelBuffer, filterCity, kpis) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const dashboardUrl = process.env.DASHBOARD_URL || 'https://baixaihs.onrender.com/';

  if (!emailUser || !emailPass) {
    throw new Error('CRITICAL ERROR: SMTP credentials (EMAIL_USER / EMAIL_PASS) are not defined in env variables!');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.kinghost.net',
    port: 465,
    secure: true,
    family: 4,
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const attachments = [
    {
      filename: 'comparativo_diario.png',
      content: chartBuffer,
      cid: 'comparisonChart'
    },
    {
      filename: `relatorio_baixas_IHS_${new Date().toISOString().split('T')[0]}.xlsx`,
      content: excelBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  ];

  // Compile HTML styled email body
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <h2 style="color: #1e3a8a; margin-top: 0; margin-bottom: 10px;">Relatório de Acompanhamento de Baixas</h2>
      <p style="font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Filtro de Cidade ativo: <strong>${filterCity}</strong></p>

      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
        Olá,<br><br>
        Segue o resumo diário de acompanhamento de baixas de modems da operação IHS. A planilha detalhada com a exportação da tabela analítica está disponível em anexo.<br><br>
        Para interagir com os filtros e visualizar os dados completos, acesse o painel online:<br>
        <a href="${dashboardUrl}" style="color: #065f46; text-decoration: underline; font-weight: bold;">${dashboardUrl}</a>
      </p>

      <!-- KPI Box Grid (HTML Table for email compatibility) -->
      <div style="margin-bottom: 24px;">
        <table style="width: 100%; border-spacing: 12px; margin-left: -12px; margin-right: -12px;">
          <tr>
            <td style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #1e40af; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">TOTAL IMPORTADO</span>
              <span style="font-size: 22px; color: #1e3a8a; font-weight: bold;">${kpis.total}</span>
            </td>
            <td style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #065f46; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">TOTAL SUCESSOS</span>
              <span style="font-size: 22px; color: #0f5132; font-weight: bold;">${kpis.sucessos}</span>
            </td>
            <td style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 16px; text-align: center; width: 33.3%;">
              <span style="font-size: 10px; color: #6b21a8; font-weight: bold; display: block; margin-bottom: 4px; text-transform: uppercase;">TAXA DE SUCESSO</span>
              <span style="font-size: 22px; color: #581c87; font-weight: bold;">${kpis.taxa}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Embedded Chart -->
      <h3 style="color: #334155; font-size: 14px; margin-bottom: 12px; font-weight: bold;">Comparativo Diário de Importações: RJ × SP</h3>
      <div style="text-align: center; margin-bottom: 24px; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px; background-color: #ffffff;">
        <img src="cid:comparisonChart" style="width: 100%; max-width: 550px; height: auto; display: block; margin: 0 auto;" />
      </div>

      <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center; margin-top: 24px;">
        Gerado automaticamente pelo Painel de Acompanhamento de Baixas IHS.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Painel IHS" <${emailUser}>`,
    to: recipientEmail,
    subject: `Relatório de Logs de Consumo - MODEM [${filterCity}]`,
    html: emailHtml,
    attachments: attachments
  });
}

module.exports = { sendEmailReport };
