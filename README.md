# Painel de Logs de Consumo - Operação IHS

## Descrição Geral
Este sistema foi projetado para consolidar, analisar e apresentar as métricas e logs de consumo de modems da operação IHS. Ele substitui processos manuais de importação por um fluxo totalmente automatizado, servindo de interface analítica para a tomada de decisões operacionais.

---

## Arquitetura de Dados

A arquitetura do sistema é do tipo in-memory (stateless em disco), utilizando o Google Sheets como única fonte da verdade e o servidor Express como processador e cache de alta performance.

### Fluxo de Dados:
1. **Google Sheets:** Onde as informações de baixas de modems são atualizadas continuamente pela operação.
2. **Serviço de Sincronização (Background & Trigger):** A API do Google Sheets é consumida por meio de autenticação de conta de serviço (Service Account).
3. **Módulo de Armazenamento em Memória:** Os registros lidos são sanitizados, formatados e cacheados em memória RAM na inicialização do servidor e periodicamente a cada intervalo configurado.
4. **Camada de Controladores:** Executa filtros de pesquisa, agregações para geração de KPIs e paginação de dados diretamente no cache de memória utilizando rotinas Javascript nativas e velozes.
5. **Dashboard:** Interface visual (HTML5, Vanilla CSS, Chart.js) que consome a API do servidor e renderiza gráficos comparativos diários e tabelas analíticas.

---

## Estrutura de Diretórios e Arquivos

O projeto está organizado conforme a seguinte estrutura:

```
baixaIHs/
├── controladores/
│   ├── controlador_log.js         # Filtragem, paginação e estatísticas in-memory
│   └── controlador_relatorio.js   # Fluxo de montagem de planilhas e envio de relatórios
├── publico/
│   ├── index.html                 # Interface HTML do painel do usuário
│   ├── app.js                     # Lógica de atualização e renderização de gráficos
│   └── style.css                  # Folha de estilos e temas do painel
├── rotas/
│   └── rotas_api.js               # Mapeamento de endpoints HTTP da API
├── scripts_teste/
│   ├── testar_envio_relatorio.js  # Utilitário de teste para despacho de e-mails de relatório
│   ├── testar_sincronizacao.js    # Utilitário de validação de leitura do Google Sheets
│   └── testar_smtp.js             # Utilitário de conexão e validação de SMTP remetente
├── servicos/
│   ├── armazenamento_dados.js     # Cache in-memory e regras de sanitização de registros
│   ├── gerador_excel.js           # Construção binária de arquivos XLSX para relatório
│   ├── servico_email.js           # Envio de e-mail via transporte Nodemailer (SMTP)
│   └── servico_google_sheets.js   # Cliente de conexão com a API do Google Sheets
├── .env                           # Configurações locais de variáveis de ambiente
├── .gitignore                     # Controle de exclusão de arquivos no repositório Git
├── chave_service_account.json     # Chave privada de autenticação do Google Cloud
├── package.json                   # Dependências do ecossistema Node.js
└── servidor.js                    # Inicializador do Express e scheduler de auto-sincronismo
```

---

## Requisitos de Configuração

Para o correto funcionamento do sistema, copie o arquivo de credenciais da conta de serviço para o diretório raiz com o nome `chave_service_account.json` e configure as seguintes variáveis no arquivo `.env`:

```properties
# ========================================
# Configurações de Relatório de E-mail (SMTP)
# ========================================
EMAIL_USER=usuario@provedor.com
EMAIL_PASS=senha_autenticacao
EMAIL_RECIPIENT=destinatario@provedor.com
DASHBOARD_URL=https://baixaihs.onrender.com/

# ========================================
# Configurações da Google Sheets API
# ========================================
GOOGLE_SHEETS_SPREADSHEET_ID=ID_da_planilha_extraido_da_url
GOOGLE_SHEETS_RANGE=BAIXA!A1:Z
SYNC_INTERVAL_MINUTES=30
GOOGLE_APPLICATION_CREDENTIALS=./chave_service_account.json
```

---

## Configuração do Google Cloud e Planilha

1. **Conta de Serviço:** Crie uma conta de serviço no Google Cloud Console, ative a Google Sheets API para o projeto correspondente e exporte a chave privada em formato JSON.
2. **Nome da Chave:** Renomeie a chave obtida para `chave_service_account.json` e armazene na raiz do projeto.
3. **Permissão na Planilha:** Na planilha do Google Sheets que contém os dados da operação, clique em compartilhar e adicione o endereço de e-mail da conta de serviço como leitor.
4. **Formato da Planilha:** A aba padrão contendo as linhas de dados deve se chamar `BAIXA`. O cabeçalho deve estar posicionado na primeira linha com as seguintes colunas:
   `CODCT`, `PROJETO`, `NUM_OS`, `NUM_CLIENTE`, `DATA_EXECUCAO`, `TAREFA`, `EQUIPE`, `CODMAT`, `CODCPL`, `QTDE_APLIC`, `APLICANIEL`, `QTDE_REMOV`, `MOTIVO`, `UF`.

---

## Execução do Sistema

### Instalação de dependências:
```bash
npm install
```

### Inicialização do servidor em modo de desenvolvimento/produção:
```bash
npm start
```

O servidor Express subirá no endereço `http://localhost:3000`. O sincronismo programado com o Google Sheets executará uma leitura diagnóstica após 10 segundos de execução do servidor, repetindo a operação de forma automática a cada intervalo de minutos configurado.

---

## Scripts de Teste e Validação

Foram disponibilizados scripts específicos no diretório `scripts_teste/` para auxiliar na checagem de conectividade do sistema.

### Testar Leitura do Google Sheets:
Este script valida a leitura dos registros do Google Sheets aplicando as regras de parse de tipos sem realizar alterações no estado do servidor.
```bash
node scripts_teste/testar_sincronizacao.js
```

### Testar Conexão de E-mail (SMTP):
Este script valida a autenticação SMTP com as credenciais do remetente e envia um e-mail básico para fins de diagnóstico.
```bash
node scripts_teste/testar_smtp.js
```

### Testar Despacho de Relatório Analítico:
Este script testa o fluxo de envio chamando o controlador do servidor Express local, solicitando a geração e envio do relatório completo com a tabela XLSX anexa.
```bash
node scripts_teste/testar_envio_relatorio.js
```
