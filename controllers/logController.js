const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Helper to build the SQL WHERE clause dynamically based on filters
 */
function buildWhereClause(query) {
  const { cidade, startDate, endDate, search } = query;
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  // City Filter: 'RJ' or 'SP'
  if (cidade && cidade !== 'all') {
    conditions.push(`estado = $${paramIdx++}`);
    params.push(cidade.toUpperCase());
  }

  // Date Filter: Start Date
  if (startDate) {
    conditions.push(`data_execucao >= $${paramIdx++}`);
    params.push(startDate);
  }

  // Date Filter: End Date
  if (endDate) {
    conditions.push(`data_execucao <= $${paramIdx++}`);
    params.push(endDate);
  }

  // Search Filter: OS, Matricula/Equipe, Material, or Serial (CODCPL)
  if (search) {
    const s = `%${search.trim()}%`;
    conditions.push(`(num_os ILIKE $${paramIdx} OR equipe ILIKE $${paramIdx+1} OR material ILIKE $${paramIdx+2} OR codcpl ILIKE $${paramIdx+3})`);
    params.push(s, s, s, s);
    paramIdx += 4;
  }

  const whereStr = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereStr, params };
}

/**
 * Handles GET /api/logs
 * Returns paginated, filtered logs matching queries
 */
async function getLogs(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { whereStr, params } = buildWhereClause(req.query);

    const queryParams = [...params, limit, offset];
    const logsQuery = `
      SELECT id, num_os, cliente, to_char(data_execucao, 'DD/MM/YYYY') as data_execucao_formatted, 
             equipe, material, codcpl, qtd_aplic, qtd_remov, aba_origem, motivo, status, estado, projeto
      FROM logs_consumo
      ${whereStr}
      ORDER BY data_execucao DESC, id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const logsResult = await db.query(logsQuery, queryParams);

    const countQuery = `SELECT COUNT(*) FROM logs_consumo ${whereStr}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: logsResult.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles GET /api/stats
 * Calculates KPIs, daily series, and RJ vs SP comparative counts
 */
async function getStats(req, res) {
  try {
    const { whereStr, params } = buildWhereClause(req.query);

    // 1. Calculate KPI Metrics
    const kpisQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'SUCESSO' THEN 1 END) as sucessos,
        COUNT(CASE WHEN status = 'SEM SALDO' OR status = 'ERRO' THEN 1 END) as erros
      FROM logs_consumo
      ${whereStr}
    `;
    const kpisResult = await db.query(kpisQuery, params);
    const kpisRow = kpisResult.rows[0];
    const total = parseInt(kpisRow.total, 10) || 0;
    const sucessos = parseInt(kpisRow.sucessos, 10) || 0;
    const erros = parseInt(kpisRow.erros, 10) || 0;
    const taxaSucesso = total > 0 ? parseFloat(((sucessos / total) * 100).toFixed(1)) : 0.0;

    // 2. Fetch daily status distribution (Line Chart)
    const dailyQuery = `
      SELECT 
        to_char(data_execucao, 'DD/MM') as date_label,
        data_execucao,
        COUNT(CASE WHEN status = 'SUCESSO' THEN 1 END) as sucessos,
        COUNT(CASE WHEN status = 'JÁ BAIXADO' THEN 1 END) as ja_baixado,
        COUNT(CASE WHEN status = 'SEM SALDO' OR status = 'ERRO' THEN 1 END) as sem_saldo
      FROM logs_consumo
      ${whereStr}
      GROUP BY data_execucao
      ORDER BY data_execucao ASC
    `;
    const dailyResult = await db.query(dailyQuery, params);

    // 3. Fetch comparative RJ vs SP daily imports count (Bar Chart)
    const comparisonQuery = `
      SELECT 
        to_char(data_execucao, 'DD/MM') as date_label,
        data_execucao,
        COUNT(CASE WHEN estado = 'RJ' THEN 1 END) as rj,
        COUNT(CASE WHEN estado = 'SP' THEN 1 END) as sp
      FROM logs_consumo
      ${whereStr}
      GROUP BY data_execucao
      ORDER BY data_execucao ASC
    `;
    const comparisonResult = await db.query(comparisonQuery, params);

    const formattedDaily = dailyResult.rows.map(r => ({
      date: r.date_label,
      sucesso: parseInt(r.sucessos, 10),
      jaBaixado: parseInt(r.ja_baixado, 10),
      semSaldo: parseInt(r.sem_saldo, 10)
    }));

    const formattedComparison = comparisonResult.rows.map(r => ({
      date: r.date_label,
      rj: parseInt(r.rj, 10),
      sp: parseInt(r.sp, 10)
    }));

    res.json({
      kpis: { total, sucessos, erros, taxaSucesso },
      dailyEvolution: formattedDaily,
      rjSpComparison: formattedComparison
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Handles POST /api/upload
 * Saves excel file temporarily, parses it in bulk, and clears temporary files
 */
async function uploadExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempFilePath = req.file.path;
    console.log(`Uploaded file saved temporarily to: ${tempFilePath}`);

    // Import the excel service
    const { importExcel } = require('../services/excelService');
    await importExcel(tempFilePath);

    // Clean up temporary file
    fs.unlink(tempFilePath, (err) => {
      if (err) console.error('Error deleting temporary uploaded file:', err);
    });

    res.json({ success: true, message: 'Data imported successfully' });
  } catch (err) {
    console.error('Error importing file:', err);
    res.status(500).json({ error: err.message || 'Error processing Excel file' });
  }
}

module.exports = {
  getLogs,
  getStats,
  uploadExcel
};
