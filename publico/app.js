// State Management
const state = {
  cidade: 'all',
  startDate: '',
  endDate: '',
  search: '',
  page: 1,
  limit: 10,
  totalPages: 1,
  totalRecords: 0,
  dailyChart: null,
  errorChart: null,
  comparisonChart: null
};

// API Base URL config (redirect requests to backend server if hosted elsewhere like Live Server)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '3000'
  ? 'http://localhost:3000'
  : '';

// UI Selectors
const elCityButtons = document.querySelectorAll('#city-filter-group .btn-toggle');
const elStartDate = document.getElementById('start-date');
const elEndDate = document.getElementById('end-date');
const elSearchInput = document.getElementById('search-input');
const elBtnClearFilters = document.getElementById('btn-clear-filters');
const elBtnSyncSheets = document.getElementById('btn-sync-sheets');
const elBtnExportCsv = document.getElementById('btn-export-csv');
const elBtnSendEmail = document.getElementById('btn-send-email');

const elKpiTotal = document.getElementById('kpi-total');
const elKpiSuccesses = document.getElementById('kpi-successes');
const elKpiErrors = document.getElementById('kpi-errors');
const elKpiRate = document.getElementById('kpi-rate');

const elTableBody = document.getElementById('table-body');
const elRecordCounter = document.getElementById('record-counter');
const elPaginationControls = document.getElementById('pagination-controls');

const elLoadingOverlay = document.getElementById('loading-overlay');
const elLoadingOverlayText = document.getElementById('loading-overlay-text');
const elSyncPercentText = document.getElementById('sync-percent-text');
const elSyncProgressBar = document.getElementById('sync-progress-bar');
const elSyncStatusDetail = document.getElementById('sync-status-detail');
const elSyncTimeLabel = document.getElementById('sync-time-label');

// Debounce helper for search input
let searchTimeout;
function debounce(func, delay = 400) {
  return function (...args) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Format numbers like 1411 to 1.411 (Brazilian standard)
function formatNumber(num) {
  return new Intl.NumberFormat('pt-BR').format(num);
}

// Convert Date string (YYYY-MM-DD) to DD/MM/YYYY for export
function formatCSVDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// API Calls
async function fetchStats() {
  try {
    const params = new URLSearchParams({
      cidade: state.cidade,
      startDate: state.startDate,
      endDate: state.endDate,
      search: state.search
    });
    
    const response = await fetch(`${API_BASE}/api/stats?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return null;
  }
}

async function fetchLogs() {
  try {
    const params = new URLSearchParams({
      cidade: state.cidade,
      startDate: state.startDate,
      endDate: state.endDate,
      search: state.search,
      page: state.page,
      limit: state.limit
    });

    const response = await fetch(`${API_BASE}/api/logs?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    return await response.json();
  } catch (error) {
    console.error('Error fetching logs:', error);
    return null;
  }
}

// Load and Refresh Data
async function refreshDashboard() {
  // Show a light loading indicator on table/charts if needed, or overlay
  const [statsData, logsData] = await Promise.all([
    fetchStats(),
    fetchLogs()
  ]);

  if (statsData) {
    renderKPIs(statsData.kpis, statsData.dailyEvolution);
    renderCharts(statsData.dailyEvolution, statsData.errorReasons, statsData.rjSpComparison);
  }

  if (logsData) {
    state.totalRecords = logsData.total;
    state.totalPages = Math.ceil(logsData.total / state.limit);
    renderTable(logsData.data, logsData.total);
  }
}

// Render KPIs
function renderKPIs(kpis, dailyEvolution) {
  let totalDia = kpis.total;
  let sucessosDia = kpis.sucessos;
  let taxaDia = kpis.taxaSucesso;

  // Garantia direta a partir da evolução diária
  if (dailyEvolution && dailyEvolution.length > 0) {
    const ultimoDia = dailyEvolution[dailyEvolution.length - 1];
    const totalUltimoDia = (ultimoDia.sucesso || 0) + (ultimoDia.jaBaixado || 0) + (ultimoDia.semSaldo || 0);
    const sucessosUltimoDia = ultimoDia.sucesso || 0;
    
    totalDia = totalUltimoDia;
    sucessosDia = sucessosUltimoDia;
    taxaDia = totalUltimoDia > 0 ? parseFloat(((sucessosUltimoDia / totalUltimoDia) * 100).toFixed(1)) : 0.0;
  }

  if (elKpiTotal) elKpiTotal.innerText = formatNumber(totalDia);
  if (elKpiSuccesses) elKpiSuccesses.innerText = formatNumber(sucessosDia);
  if (elKpiRate) elKpiRate.innerText = `${taxaDia}%`;
}

// Render Charts (Chart.js)
function renderCharts(dailyData, errorData, comparisonData) {
  // 1. Line Chart: Daily Status Evolution
  const ctxDaily = document.getElementById('chart-daily-evolution').getContext('2d');
  
  if (state.dailyChart) {
    state.dailyChart.destroy();
  }

  const labels = dailyData.map(d => d.date);
  const successes = dailyData.map(d => d.sucesso);
  const jaBaixado = dailyData.map(d => d.jaBaixado);
  const semSaldo = dailyData.map(d => d.semSaldo);

  state.dailyChart = new Chart(ctxDaily, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sucesso',
          data: successes,
          borderColor: '#0284c7', // Azul cerúleo
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Já Baixado',
          data: jaBaixado,
          borderColor: '#ea580c', // Orange
          backgroundColor: 'rgba(234, 88, 12, 0.05)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Sem Saldo',
          data: semSaldo,
          borderColor: '#ef4444', // red
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: 'Outfit', size: 11, weight: '500' }
          }
        },
        tooltip: {
          padding: 12,
          titleFont: { family: 'Outfit', size: 13, weight: '600' },
          bodyFont: { family: 'Outfit', size: 12 },
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Outfit', size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Outfit', size: 11 } }
        }
      }
    }
  });



  // 3. Comparison Bar Chart: RJ vs SP day-by-day (parallel columns side-by-side)
  const ctxComparison = document.getElementById('chart-rj-sp-comparison').getContext('2d');
  
  if (state.comparisonChart) {
    state.comparisonChart.destroy();
  }

  const compLabels = comparisonData ? comparisonData.map(c => c.date) : [];
  const rjCounts = comparisonData ? comparisonData.map(c => c.rj) : [];
  const spCounts = comparisonData ? comparisonData.map(c => c.sp) : [];

  // Inline plugin to draw values on top of each bar
  const datalabelsPlugin = {
    id: 'datalabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = 'bold 11px Outfit';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value > 0) {
            ctx.fillStyle = '#1e293b'; // slate-800
            ctx.fillText(value, bar.x, bar.y - 4);
          }
        });
      });
      ctx.restore();
    }
  };

  // Plugin to draw a solid white background behind the chart (prevents transparent PNG issues in email clients)
  const whiteBackgroundPlugin = {
    id: 'whiteBackground',
    beforeDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };

  state.comparisonChart = new Chart(ctxComparison, {
    type: 'bar',
    data: {
      labels: compLabels,
      datasets: [
        {
          label: 'Rio de Janeiro (RJ)',
          data: rjCounts,
          backgroundColor: '#0284c7', // Azul cerúleo
          borderColor: '#0369a1',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6
        },
        {
          label: 'São Paulo (SP)',
          data: spCounts,
          backgroundColor: '#ea580c', // Orange
          borderColor: '#d97706',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: 'Outfit', size: 11, weight: '500' }
          }
        },
        tooltip: {
          padding: 12,
          titleFont: { family: 'Outfit', size: 12, weight: '600' },
          bodyFont: { family: 'Outfit', size: 12 },
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grace: '10%', // Add 10% spacing at top so labels fit
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Outfit', size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Outfit', size: 11 } }
        }
      }
    },
    plugins: [datalabelsPlugin, whiteBackgroundPlugin]
  });
}

// Render Table Rows and Pagination
function renderTable(logs, total) {
  elTableBody.innerHTML = '';

  if (logs.length === 0) {
    elTableBody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center py-4 text-muted">Nenhum registro encontrado para os filtros selecionados.</td>
      </tr>
    `;
    elRecordCounter.innerText = 'Mostrando 0 de 0 registros';
    elPaginationControls.innerHTML = '';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Status Class & Label Mapping
    let statusClass = 'badge-info';
    if (log.status === 'SUCESSO') statusClass = 'badge-success';
    if (log.status === 'JÁ BAIXADO') statusClass = 'badge-warning';
    if (log.status === 'SEM SALDO' || log.status === 'ERRO') statusClass = 'badge-danger';

    tr.innerHTML = `
      <td>${log.num_os || '-'}</td>
      <td class="text-light">${log.cliente || '-'}</td>
      <td>${log.data_execucao_formatted || '-'}</td>
      <td>${log.equipe || '-'}</td>
      <td>${log.material || '-'}</td>
      <td>${log.codcpl || '-'}</td>
      <td>${log.qtd_aplic !== null ? log.qtd_aplic : '-'}</td>
      <td>${log.qtd_remov !== null ? log.qtd_remov : '-'}</td>
      <td>${log.aba_origem || 'MODEM'}</td>
      <td>${log.motivo || '-'}</td>
      <td><span class="badge ${statusClass}">${log.status}</span></td>
      <td>${log.estado || '-'}</td>
    `;
    elTableBody.appendChild(tr);
  });

  // Update record counter text
  const startIdx = (state.page - 1) * state.limit + 1;
  const endIdx = Math.min(state.page * state.limit, total);
  elRecordCounter.innerText = `Mostrando ${startIdx}-${endIdx} de ${formatNumber(total)} registros`;

  // Render pagination buttons
  renderPagination();
}

// Render Pagination controls
function renderPagination() {
  elPaginationControls.innerHTML = '';

  // Prev Button
  const btnPrev = document.createElement('button');
  btnPrev.className = 'pagination-btn';
  btnPrev.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
  btnPrev.disabled = state.page === 1;
  btnPrev.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      refreshDashboard();
    }
  });
  elPaginationControls.appendChild(btnPrev);

  // Current page text
  const pageLabel = document.createElement('span');
  pageLabel.className = 'pagination-current';
  pageLabel.innerText = `Página ${state.page}`;
  elPaginationControls.appendChild(pageLabel);

  // Next Button
  const btnNext = document.createElement('button');
  btnNext.className = 'pagination-btn';
  btnNext.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
  btnNext.disabled = state.page === state.totalPages || state.totalPages === 0;
  btnNext.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      refreshDashboard();
    }
  });
  elPaginationControls.appendChild(btnNext);
}

// Event Listeners Configuration
function setupEventListeners() {
  // 1. City buttons toggle
  elCityButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      elCityButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      state.cidade = e.target.getAttribute('data-value');
      state.page = 1;
      refreshDashboard();
    });
  });

  // 2. Date Pickers
  elStartDate.addEventListener('change', (e) => {
    state.startDate = e.target.value;
    state.page = 1;
    refreshDashboard();
  });

  elEndDate.addEventListener('change', (e) => {
    state.endDate = e.target.value;
    state.page = 1;
    refreshDashboard();
  });

  // 3. Search input (debounced)
  elSearchInput.addEventListener('input', debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    refreshDashboard();
  }, 400));

  // 4. Clear Filters
  elBtnClearFilters.addEventListener('click', () => {
    // Reset State
    state.cidade = 'all';
    state.startDate = '';
    state.endDate = '';
    state.search = '';
    state.page = 1;

    // Reset Elements
    elCityButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('#city-filter-group .btn-toggle[data-value="all"]').classList.add('active');
    elStartDate.value = '';
    elEndDate.value = '';
    elSearchInput.value = '';

    refreshDashboard();
  });

  // 5. Sincronização com Google Sheets (sem alert)
  elBtnSyncSheets.addEventListener('click', async () => {
    await executarSincronizacao({ silencioso: false });
  });

  // 6. Export CSV of current query results (all pages matching current filter)
  elBtnExportCsv.addEventListener('click', async () => {
    try {
      // Fetch all records without pagination limits to make complete CSV matching filters
      const params = new URLSearchParams({
        cidade: state.cidade,
        startDate: state.startDate,
        endDate: state.endDate,
        search: state.search,
        page: 1,
        limit: 100000 // Big limit to fetch all matching rows
      });

      elLoadingOverlayText.innerText = 'Gerando exportação...';
      elLoadingOverlay.style.display = 'flex';

      const response = await fetch(`${API_BASE}/api/logs?${params.toString()}`);
      elLoadingOverlay.style.display = 'none';

      if (!response.ok) throw new Error('Não foi possível buscar dados para exportação.');
      const result = await response.json();
      const records = result.data;

      if (records.length === 0) {
        showToast('Nenhum registro para exportar.', 'warning');
        return;
      }

      const csvContent = buildCSVContent(records);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Auto-trigger browser download
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_logs_consumo_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      elLoadingOverlay.style.display = 'none';
      showToast(`Erro ao exportar arquivo: ${err.message}`, 'error');
    }
  });

  // 7. Enviar Relatório por E-mail (Pré-configurado para Thiago Souza com tabela analítica em anexo)
  elBtnSendEmail.addEventListener('click', async () => {
    // Capture chart image as base64
    let chartImage = '';
    if (state.comparisonChart) {
      chartImage = state.comparisonChart.toBase64Image();
    } else {
      showToast('O gráfico comparativo não está renderizado.', 'warning');
      return;
    }

    // Show loading overlay
    elLoadingOverlayText.innerText = 'Gerando relatório analítico e enviando e-mail...';
    elLoadingOverlay.style.display = 'flex';

    try {
      // Fetch all matching records to generate the analytical table CSV attachment
      const params = new URLSearchParams({
        cidade: state.cidade,
        startDate: state.startDate,
        endDate: state.endDate,
        search: state.search,
        page: 1,
        limit: 100000
      });

      const logsRes = await fetch(`${API_BASE}/api/logs?${params.toString()}`);
      if (!logsRes.ok) throw new Error('Não foi possível buscar dados da tabela para o relatório.');
      const logsResult = await logsRes.json();
      const records = logsResult.data;

      // Generate CSV content
      const csvData = buildCSVContent(records);

      // Trigger email send endpoint
      const response = await fetch(`${API_BASE}/api/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chartImage: chartImage,
          logsData: records,
          cidade: state.cidade,
          kpis: {
            total: elKpiTotal.innerText,
            sucessos: elKpiSuccesses.innerText,
            taxa: elKpiRate.innerText
          }
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Erro ao enviar o e-mail.');

      showToast('Relatório de teste enviado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast(`Falha ao enviar e-mail: ${err.message}`, 'error');
    } finally {
      elLoadingOverlay.style.display = 'none';
    }
  });
}

// Helper to build CSV string
function buildCSVContent(records) {
  const headers = ['NUMERO OS', 'CLIENTE', 'DATA EXECUCAO', 'EQUIPE (MATRICULA)', 'MATERIAL', 'CODCPL', 'QTD. APLIC', 'QTD. REMOV', 'ABA / ORIGEM', 'MOTIVO / RETORNO', 'STATUS', 'UF'];
  const csvRows = [headers.join(';')];
  records.forEach(r => {
    const row = [
      `"${r.num_os || ''}"`,
      `"${r.cliente || ''}"`,
      `"${r.data_execucao_formatted || ''}"`,
      `"${r.equipe || ''}"`,
      `"${r.material || ''}"`,
      `"${r.codcpl || ''}"`,
      r.qtd_aplic !== null ? r.qtd_aplic : 0,
      r.qtd_remov !== null ? r.qtd_remov : 0,
      `"${r.aba_origem || 'MODEM'}"`,
      `"${(r.motivo || '').replace(/"/g, '""')}"`,
      `"${r.status || ''}"`,
      `"${r.estado || ''}"`
    ];
    csvRows.push(row.join(';'));
  });
  return '\ufeff' + csvRows.join('\n');
}

// Helper Toast Notification (substitui os alerts nativos do navegador)
function showToast(mensagem, tipo = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 10000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const corBg = tipo === 'error' ? '#ef4444' : (tipo === 'success' ? '#0284c7' : '#1e293b');
  toast.style.cssText = 'background-color: ' + corBg + '; color: #ffffff; padding: 12px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15); opacity: 0; transform: translateY(10px); transition: all 0.25s ease; pointer-events: auto;';
  toast.innerText = mensagem;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Rotina de Atualização Automática e Sincronização com Progresso ---
let isSyncing = false;

async function refreshDashboardSilently() {
  try {
    const [statsData, logsData] = await Promise.all([
      fetchStats(),
      fetchLogs()
    ]);

    if (statsData) {
      renderKPIs(statsData.kpis, statsData.dailyEvolution);
      renderCharts(statsData.dailyEvolution, statsData.errorReasons, statsData.rjSpComparison);
    }

    if (logsData) {
      state.totalRecords = logsData.total;
      state.totalPages = Math.ceil(logsData.total / state.limit);
      renderTable(logsData.data, logsData.total);
    }

    atualizarLabelUltimaSincronizacao();
  } catch (e) {
    console.error('Erro na atualização silenciosa:', e);
  }
}

function atualizarLabelUltimaSincronizacao() {
  if (elSyncTimeLabel) {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    elSyncTimeLabel.innerText = 'Atualizado automaticamente às ' + hora;
  }
}

async function executarSincronizacao({ silencioso = false } = {}) {
  if (isSyncing) return;
  isSyncing = true;

  let progressInterval = null;
  let currentProgress = 0;

  function setProgress(pct, detailText) {
    currentProgress = pct;
    if (elSyncProgressBar) elSyncProgressBar.style.width = pct + '%';
    if (elSyncPercentText) elSyncPercentText.innerText = Math.round(pct) + '%';
    if (detailText && elSyncStatusDetail) elSyncStatusDetail.innerText = detailText;
  }

  if (!silencioso && elLoadingOverlay) {
    setProgress(0, 'Conectando ao Google Sheets...');
    if (elLoadingOverlayText) elLoadingOverlayText.innerText = 'Sincronizando dados com o Google Sheets';
    if (elSyncProgressBar) elSyncProgressBar.style.backgroundColor = '';
    elLoadingOverlay.style.display = 'flex';

    // Etapas simuladas fluidas enquanto o backend responde
    const steps = [
      { target: 20, detail: 'Autenticando via Service Account...', delay: 200 },
      { target: 45, detail: 'Lendo abas BAIXA e BAIXA CONNECT...', delay: 600 },
      { target: 75, detail: 'Consolidando registros de RJ e SP...', delay: 1200 },
      { target: 90, detail: 'Atualizando indicadores e comparativos...', delay: 1800 }
    ];

    let stepIdx = 0;
    progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        const s = steps[stepIdx];
        if (currentProgress < s.target) {
          setProgress(Math.min(currentProgress + 2, s.target), s.detail);
        } else {
          stepIdx++;
        }
      } else if (currentProgress < 94) {
        setProgress(currentProgress + 0.5);
      }
    }, 80);
  }

  try {
    const response = await fetch(API_BASE + '/api/sync', { method: 'POST' });
    const resData = await response.json();
    if (!response.ok) throw new Error(resData.error || 'Erro ao sincronizar com Google Sheets.');

    if (!silencioso && elLoadingOverlay) {
      if (progressInterval) clearInterval(progressInterval);
      setProgress(100, 'Concluído: ' + formatNumber(resData.importedCount || 0) + ' registros importados!');
      
      // Pausa suave para visualização do 100%
      await new Promise(resolve => setTimeout(resolve, 600));
      elLoadingOverlay.style.display = 'none';
    }

    atualizarLabelUltimaSincronizacao();

    // Recarrega o dashboard
    state.page = 1;
    await refreshDashboard();

  } catch (err) {
    console.error('[Sincronismo]', err);
    if (!silencioso && elLoadingOverlay) {
      if (progressInterval) clearInterval(progressInterval);
      setProgress(currentProgress, 'Erro: ' + err.message);
      if (elSyncProgressBar) elSyncProgressBar.style.backgroundColor = '#ef4444';
      await new Promise(resolve => setTimeout(resolve, 2000));
      elLoadingOverlay.style.display = 'none';
    }
  } finally {
    isSyncing = false;
    if (progressInterval) clearInterval(progressInterval);
  }
}

// Initializer com Atualização Automática Contínua
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();

  // 1. Carregamento inicial do dashboard
  await refreshDashboard();

  // 2. Se a base de dados em memória estiver vazia no primeiro carregamento, sincroniza automaticamente com modal
  if (state.totalRecords === 0) {
    console.log('[Auto-Init] Base vazia no boot, disparando sincronização inicial...');
    await executarSincronizacao({ silencioso: false });
  }

  // 3. Atualização automática dos gráficos e tabela a cada 30 segundos (sem travar a tela)
  setInterval(() => {
    refreshDashboardSilently();
  }, 30_000);

  // 4. Sincronização automática em segundo plano com o Google Sheets a cada 3 minutos
  setInterval(() => {
    executarSincronizacao({ silencioso: true });
  }, 3 * 60_000);

  // 5. Ao retornar o foco para a aba do navegador, atualiza automaticamente
  window.addEventListener('focus', () => {
    refreshDashboardSilently();
  });
});
