const armazenamentoDados = require('../servicos/armazenamento_dados');

// ---------------------------------------------------------------------------
// Regras auxiliares de filtragem de dados
// ---------------------------------------------------------------------------

function aplicarFiltros(registros, query) {
  const { cidade, startDate, endDate, search } = query;
  let filtrados = registros;

  // Filtro de cidade (RJ ou SP)
  if (cidade && cidade !== 'all') {
    const uf = cidade.toUpperCase();
    filtrados = filtrados.filter(r => r.estado === uf);
  }

  // Filtro de datas
  if (startDate || endDate) {
    if (startDate) {
      filtrados = filtrados.filter(r => r.data_execucao && r.data_execucao >= startDate);
    }
    if (endDate) {
      filtrados = filtrados.filter(r => r.data_execucao && r.data_execucao <= endDate);
    }
  } else {
    // Janela padrão de 10 dias a partir do registro mais recente
    const todasDatas = filtrados.map(r => r.data_execucao).filter(Boolean).sort();
    if (todasDatas.length > 0) {
      const dataMaisRecente = todasDatas[todasDatas.length - 1];
      const dataInicio = new Date(dataMaisRecente);
      dataInicio.setDate(dataInicio.getDate() - 10);
      const dataInicioISO = dataInicio.toISOString().split('T')[0];
      filtrados = filtrados.filter(r => r.data_execucao && r.data_execucao >= dataInicioISO && r.data_execucao <= dataMaisRecente);
    }
  }

  // Filtro de busca parcial (OS, equipe, material, codcpl)
  if (search) {
    const termo = search.trim().toLowerCase();
    filtrados = filtrados.filter(r =>
      (r.num_os && r.num_os.toLowerCase().includes(termo)) ||
      (r.equipe && r.equipe.toLowerCase().includes(termo)) ||
      (r.material && r.material.toLowerCase().includes(termo)) ||
      (r.codcpl && r.codcpl.toLowerCase().includes(termo))
    );
  }

  return filtrados;
}

// ---------------------------------------------------------------------------
// Rotas de controle
// ---------------------------------------------------------------------------

/**
 * GET /api/logs
 * Retorna os logs filtrados e ordenados de forma paginada do cache em memória.
 */
async function obterLogs(req, res) {
  try {
    const pagina = parseInt(req.query.page, 10) || 1;
    const limite = parseInt(req.query.limit, 10) || 10;

    const registros = armazenamentoDados.getRecords();
    const filtrados = aplicarFiltros(registros, req.query);

    // Ordenação Decrescente por Data de Execução
    const ordenados = [...filtrados].sort((a, b) => {
      if (a.data_execucao && b.data_execucao) {
        const cmp = b.data_execucao.localeCompare(a.data_execucao);
        if (cmp !== 0) return cmp;
      }
      return 0;
    });

    const total = ordenados.length;
    const offset = (pagina - 1) * limite;
    const paginados = ordenados.slice(offset, offset + limite);

    res.json({
      data: paginados,
      total,
      page: pagina,
      limit: limite
    });
  } catch (err) {
    console.error('Erro ao obter logs:', err);
    res.status(500).json({ error: 'Erro Interno do Servidor' });
  }
}

/**
 * GET /api/stats
 * Calcula os KPIs do painel, a evolução diária de status e a comparação por estado (RJ x SP).
 */
async function obterEstatisticas(req, res) {
  try {
    const registros = armazenamentoDados.getRecords();
    const filtrados = aplicarFiltros(registros, req.query);

    // 1. Métricas de KPIs
    const total = filtrados.length;
    const sucessos = filtrados.filter(r => r.status === 'SUCESSO').length;
    const erros = filtrados.filter(r => r.status === 'SEM SALDO' || r.status === 'ERRO').length;
    const taxaSucesso = total > 0 ? parseFloat(((sucessos / total) * 100).toFixed(1)) : 0.0;

    // 2. Distribuição diária por status (Gráfico de Linha)
    const mapaDiario = {};
    for (const r of filtrados) {
      const chave = r.data_execucao || 'desconhecida';
      if (!mapaDiario[chave]) {
        mapaDiario[chave] = { date: r.data_label, data_execucao: chave, sucesso: 0, jaBaixado: 0, semSaldo: 0 };
      }
      if (r.status === 'SUCESSO') mapaDiario[chave].sucesso++;
      else if (r.status === 'JÁ BAIXADO') mapaDiario[chave].jaBaixado++;
      else if (r.status === 'SEM SALDO' || r.status === 'ERRO') mapaDiario[chave].semSaldo++;
    }
    const evolucaoDiaria = Object.values(mapaDiario).sort((a, b) => a.data_execucao.localeCompare(b.data_execucao));

    // 3. Comparativo RJ vs SP por dia (Gráfico de Barras)
    const mapaComparativo = {};
    for (const r of filtrados) {
      const chave = r.data_execucao || 'desconhecida';
      if (!mapaComparativo[chave]) {
        mapaComparativo[chave] = { date: r.data_label, data_execucao: chave, rj: 0, sp: 0 };
      }
      if (r.estado === 'RJ') mapaComparativo[chave].rj++;
      else if (r.estado === 'SP') mapaComparativo[chave].sp++;
    }
    const comparativoRjSp = Object.values(mapaComparativo).sort((a, b) => a.data_execucao.localeCompare(b.data_execucao));

    res.json({
      kpis: { total, sucessos, erros, taxaSucesso },
      dailyEvolution: evolucaoDiaria,
      rjSpComparison: comparativoRjSp
    });
  } catch (err) {
    console.error('Erro ao obter estatísticas:', err);
    res.status(500).json({ error: 'Erro Interno do Servidor' });
  }
}

/**
 * POST /api/sync
 * Força o sincronismo imediato lendo da Google Sheets API para o cache em memória.
 */
async function sincronizarPlanilha(req, res) {
  try {
    console.log('[Sincronismo] Forçando sincronismo manual via requisição...');
    const { buscarLinhasPlanilha } = require('../servicos/servico_google_sheets');

    const linhasBrutas = await buscarLinhasPlanilha();
    const quantidadeImportada = armazenamentoDados.setRecords(linhasBrutas);

    console.log(`[Sincronismo] Concluído com sucesso: ${quantidadeImportada} registros carregados.`);
    res.json({
      success: true,
      message: `Sincronização concluída: ${quantidadeImportada} registros importados.`,
      importedCount: quantidadeImportada
    });
  } catch (err) {
    console.error('[Sincronismo] Falha ao executar sincronismo manual:', err);
    res.status(500).json({ error: err.message || 'Erro ao sincronizar com Google Sheets' });
  }
}

/**
 * GET /api/sync-status
 * Retorna as informações do agendador automático e hora do último sync.
 */
async function obterStatusSincronismo(req, res) {
  try {
    const intervaloMinutos = parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 30;
    const ultimaSincronizacao = armazenamentoDados.getLastSyncTime();

    res.json({
      autoSyncEnabled: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
      intervalMinutes: intervaloMinutos,
      totalRecords: armazenamentoDados.getRecordCount(),
      lastSync: ultimaSincronizacao ? ultimaSincronizacao.toISOString() : null
    });
  } catch (err) {
    console.error('Erro ao obter status de sincronismo:', err);
    res.status(500).json({ error: 'Erro Interno do Servidor' });
  }
}

/**
 * Executa o sincronismo agendado automaticamente (chamado em background pelo scheduler).
 */
async function executarSincronismoAgendado() {
  try {
    console.log('[Agendador] Iniciando sincronização programada...');
    const { buscarLinhasPlanilha } = require('../servicos/servico_google_sheets');

    const linhasBrutas = await buscarLinhasPlanilha();
    const quantidadeImportada = armazenamentoDados.setRecords(linhasBrutas);
    console.log(`[Agendador] Concluído com sucesso: ${quantidadeImportada} registros carregados.`);
  } catch (err) {
    console.error('[Agendador] Erro durante o sincronismo em segundo plano:', err);
  }
}

module.exports = {
  obterLogs,
  obterEstatisticas,
  sincronizarPlanilha,
  obterStatusSincronismo,
  executarSincronismoAgendado
};
