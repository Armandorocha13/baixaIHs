// Script utilitário para validar o endpoint completo de geração e envio de relatório
const API_BASE = 'http://localhost:3000';
const destinatario = 'mandoqxo@gmail.com';

// PNG de 1x1 pixel transparente
const dummyChartBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function rodar() {
  console.log('=== Iniciando Teste de Envio de Relatório ===');
  
  let kpis = { total: '1', sucessos: '1', taxa: '100.0%' };

  try {
    console.log(`Buscando logs de diagnóstico ativos em ${API_BASE}/api/logs...`);
    const respostaLogs = await fetch(`${API_BASE}/api/logs?limit=10`);
    if (respostaLogs.ok) {
      const logsJson = await respostaLogs.json();
      console.log(`Registros encontrados no servidor local: ${logsJson.data ? logsJson.data.length : 0}`);
    }

    const respostaEstatisticas = await fetch(`${API_BASE}/api/stats`);
    if (respostaEstatisticas.ok) {
      const statsJson = await respostaEstatisticas.json();
      if (statsJson.kpis) {
        kpis = {
          total: String(statsJson.kpis.total),
          sucessos: String(statsJson.kpis.sucessos),
          taxa: `${statsJson.kpis.taxaSucesso}%`
        };
      }
    }
  } catch (err) {
    console.log('Não foi possível obter dados reais do servidor local. Enviando dados estáticos.');
  }

  console.log(`Disparando chamada de API de e-mail para ${destinatario}...`);
  try {
    const resposta = await fetch(`${API_BASE}/api/send-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientEmail: destinatario,
        chartImage: dummyChartBase64,
        cidade: 'all',
        kpis: kpis
      })
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      throw new Error(dados.error || 'O servidor retornou um erro.');
    }
    console.log('Sucesso! Resposta da API:', dados);
  } catch (err) {
    console.error('Falha no envio de e-mail:', err);
  }
}

rodar();
