'use strict';

const https = require('https');

function normalizarData(rawDate) {
  if (!rawDate) return null;
  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    const y = rawDate.getFullYear();
    const m = rawDate.getMonth() + 1;
    const d = rawDate.getDate();
    return {
      isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
      ts: new Date(y, m - 1, d).getTime()
    };
  }

  const s = String(rawDate).trim();
  if (!s) return null;

  if (s.includes('-')) {
    const parts = s.split('T')[0].split('-').map(Number);
    if (parts.length >= 3) {
      let [p1, p2, p3] = parts;
      let y = p1 > 1000 ? p1 : (p3 > 1000 ? p3 : (p3 < 100 ? p3 + 2000 : p3));
      let m = p2;
      let d = p1 > 1000 ? p3 : p1;
      return {
        isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
        ts: new Date(y, m - 1, d).getTime()
      };
    }
  }

  if (s.includes('/')) {
    const parts = s.split('/').map(Number);
    if (parts.length === 2) {
      const [d, m] = parts;
      const y = new Date().getFullYear();
      return {
        isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
        ts: new Date(y, m - 1, d).getTime()
      };
    }
    if (parts.length >= 3) {
      let [p1, p2, p3] = parts;
      let y = p3 > 1000 ? p3 : (p1 > 1000 ? p1 : (p3 < 100 ? p3 + 2000 : p3));
      let m = p2;
      let d = p1 > 1000 ? p3 : p1;
      return {
        isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
        ts: new Date(y, m - 1, d).getTime()
      };
    }
  }

  return null;
}

/**
 * Normaliza e agrupa os dados de consumo por data para RJ e SP (últimos 7 dias com dados).
 * Gera os dados no mesmo formato do painel web oficial de acompanhamento de baixas.
 */
function extrairDadosDiarios(dadosTabela = []) {
  const dailyRJ = {};
  const dailySP = {};
  const dateKeyToLabel = {};
  const dateKeyToTimestamp = {};

  dadosTabela.forEach(row => {
    // Procura a data em diferentes propriedades possíveis
    const rawDate = row.data_execucao || row.dataAplicacao || row.data || row.data_execucao_formatted;
    const parsed = normalizarData(rawDate);
    if (!parsed) return;

    dateKeyToLabel[parsed.isoDate] = (row.data_label && typeof row.data_label === 'string' && row.data_label.includes('/'))
      ? row.data_label.trim()
      : parsed.label;
    dateKeyToTimestamp[parsed.isoDate] = parsed.ts;

    const uf = (row.uf || row.estado || '').toUpperCase().trim();
    if (uf === 'RJ') {
      dailyRJ[parsed.isoDate] = (dailyRJ[parsed.isoDate] || 0) + 1;
    } else if (uf === 'SP') {
      dailySP[parsed.isoDate] = (dailySP[parsed.isoDate] || 0) + 1;
    }
  });

  const todasDatas = [...new Set([...Object.keys(dailyRJ), ...Object.keys(dailySP)])];
  todasDatas.sort((a, b) => (dateKeyToTimestamp[a] || 0) - (dateKeyToTimestamp[b] || 0));

  // Seleciona os últimos 7 dias com movimentação (janela estrita de 7 dias)
  const datasRecentes = todasDatas.slice(-7);

  return {
    labels: datasRecentes.map(d => dateKeyToLabel[d] || d),
    rj: datasRecentes.map(d => dailyRJ[d] || 0),
    sp: datasRecentes.map(d => dailySP[d] || 0)
  };
}

/**
 * Envia payload JSON via POST para a API do QuickChart e retorna o buffer binário do PNG.
 */
function fetchChartBuffer(postPayload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(postPayload);
    const options = {
      hostname: 'quickchart.io',
      port: 443,
      path: '/chart',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`[Gráfico Server] Status ${res.statusCode} na API QuickChart`);
        return resolve(null);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', (err) => {
      console.error('[Gráfico Server Erro HTTP]', err.message);
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[Gráfico Server] Timeout na requisição ao QuickChart');
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Gera um buffer PNG do gráfico de barras de comparativo diário (RJ x SP).
 * Design moderno e idêntico ao painel web oficial:
 * - Título centralizado: "Comparativo Diario de Importacoes: RJ x SP"
 * - Legenda circular no canto superior direito: "Rio de Janeiro (RJ)" e "Sao Paulo (SP)"
 * - Barras arredondadas no topo (azul cerúleo #0284c7 e laranja vibrante #ea580c)
 * - Números em negrito centralizados no topo de cada coluna (datalabels)
 * - Eixo X limpo sem linhas verticais com datas no formato DD/MM
 * - Eixo Y com linhas horizontais suaves (#f1f5f9) e escala com folga
 */
async function gerarGraficoBuffer(dadosTabela = []) {
  const { labels, rj, sp } = extrairDadosDiarios(dadosTabela);

  if (!labels || labels.length === 0) {
    return null;
  }

  const chartConfig = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Rio de Janeiro (RJ)',
          data: rj,
          backgroundColor: '#0284c7',
          borderColor: '#0369a1',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: 'bottom',
          barPercentage: 0.8,
          categoryPercentage: 0.65
        },
        {
          label: 'Sao Paulo (SP)',
          data: sp,
          backgroundColor: '#ea580c',
          borderColor: '#d97706',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: 'bottom',
          barPercentage: 0.8,
          categoryPercentage: 0.65
        }
      ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Comparativo Diario de Importacoes: RJ x SP',
          font: { size: 16, weight: 'bold' },
          color: '#1e293b',
          padding: { top: 12, bottom: 20 }
        },
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            boxHeight: 8,
            color: '#475569',
            font: { size: 11, weight: '500' }
          }
        },
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: '#1e293b',
          offset: 2,
          font: { weight: 'bold', size: 10 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grace: '15%',
          grid: { color: '#f1f5f9' },
          ticks: { color: '#64748b', font: { size: 11 }, stepSize: 20 }
        }
      }
    }
  };

  const payload = {
    backgroundColor: '#ffffff',
    width: 720,
    height: 380,
    format: 'png',
    version: '3',
    chart: chartConfig
  };

  return await fetchChartBuffer(payload);
}

module.exports = { gerarGraficoBuffer, extrairDadosDiarios };
