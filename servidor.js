require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rotasApi = require('./rotas/rotas_api');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração de Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'publico')));

// Servir logos da raiz do workspace
app.get('/logo.png', (req, res) => {
  const logoPath = path.join(__dirname, 'logo.png');
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).send('Logo não encontrado');
  }
});

app.get('/logoIhs.png', (req, res) => {
  const logoPath = path.join(__dirname, 'logoIhs.png');
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).send('Logo não encontrado');
  }
});

// Vincular Rotas HTTP
app.use('/api', rotasApi);

// Fallback para SPA no Frontend
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'publico', 'index.html'));
});

// --- Agendador de Sincronismo Automático ---
function inicializarAgendadorSincronismo() {
  const intervaloMinutos = parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 30;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    console.log('[Agendador] A variável GOOGLE_SHEETS_SPREADSHEET_ID não está definida. Auto-sync desativado.');
    return;
  }

  const intervaloMs = intervaloMinutos * 60 * 1000;
  console.log(`[Agendador] Ativado — Executando sincronismo a cada ${intervaloMinutos} minutos.`);

  // Executa uma sincronização inicial de diagnóstico 10 segundos após boot do servidor
  setTimeout(async () => {
    const { executarSincronismoAgendado } = require('./controladores/controlador_log');
    await executarSincronismoAgendado();
  }, 10_000);

  // Executa o sincronismo de tempos em tempos
  setInterval(async () => {
    const { executarSincronismoAgendado } = require('./controladores/controlador_log');
    await executarSincronismoAgendado();
  }, intervaloMs);
}

// Inicializar Servidor HTTP
function iniciar() {
  try {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });

    // Iniciar o agendador após subir o servidor Express
    inicializarAgendadorSincronismo();
  } catch (err) {
    console.error('Falha ao iniciar servidor HTTP:', err);
    process.exit(1);
  }
}

iniciar();
