const express = require('express');
const controladorLog = require('../controladores/controlador_log');
const controladorRelatorio = require('../controladores/controlador_relatorio');

const roteador = express.Router();

// Definição das rotas e vinculação com os métodos do controlador
roteador.get('/logs', controladorLog.obterLogs);
roteador.get('/stats', controladorLog.obterEstatisticas);
roteador.post('/sync', controladorLog.sincronizarPlanilha);
roteador.get('/sync-status', controladorLog.obterStatusSincronismo);
roteador.post('/send-report', controladorRelatorio.enviarRelatorio);

module.exports = roteador;
