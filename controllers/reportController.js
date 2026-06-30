const { buildExcelDashboard } = require('../services/excelBuilder');
const { sendEmailReport } = require('../services/emailService');

/**
 * Handles POST /api/send-report
 * Generates an Excel workbook and dispatches the HTML report with inline image & spreadsheet attachment
 */
async function sendReport(req, res) {
  const { recipientEmail, chartImage, logsData, cidade, kpis } = req.body;
  
  if (!chartImage || !kpis) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const targetEmail = recipientEmail || process.env.EMAIL_RECIPIENT || 'thiagosouza@ffainfraestrutura.com.br, victorrodrigues@ffainfraestrutura.com.br, armandolima@ffainfraestrutura.com.br';

  try {
    console.log(`Preparing to send report email to: ${targetEmail}`);

    // Parse base64 chart image data URL
    const base64Data = chartImage.replace(/^data:image\/png;base64,/, '');
    const chartBuffer = Buffer.from(base64Data, 'base64');

    // Generate Excel workbook attachment in memory (.xlsx)
    const excelBuffer = await buildExcelDashboard(logsData || []);

    const filterCity = cidade === 'all' ? 'Todas (RJ & SP)' : cidade.toUpperCase();

    // Trigger email send service
    await sendEmailReport(targetEmail, chartBuffer, excelBuffer, filterCity, kpis);

    console.log(`Report email successfully sent to ${targetEmail}`);
    res.json({ success: true, message: 'Report email sent successfully' });

  } catch (err) {
    console.error('Error dispatching email report controller:', err);
    res.status(500).json({ error: err.message || 'Error dispatching email' });
  }
}

module.exports = {
  sendReport
};
