const nodemailer = require('nodemailer');

const emailUser = 'armandolima@ffainfraestrutura.com.br';
const emailPass = 'VpP8r7qD!QpbN6Og';

console.log('Iniciando conexões SMTP para o servidor KingHost...');

const transportador = nodemailer.createTransport({
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

async function main() {
  try {
    console.log('Validando autenticação no servidor de e-mail...');
    await transportador.verify();
    console.log('Conexão SMTP validada com sucesso!');

    console.log('Enviando e-mail de teste para mandoqxo@gmail.com...');
    const info = await transportador.sendMail({
      from: `"Painel IHS" <${emailUser}>`,
      to: 'mandoqxo@gmail.com',
      subject: 'Teste de Autenticação SMTP - Painel IHS',
      text: 'Olá. Este é um teste para validar o canal SMTP da KingHost e a conexão corporativa.',
      html: '<p>Olá.</p><p>Este é um teste formal para validar o canal SMTP da KingHost e a conexão corporativa.</p>'
    });

    console.log('E-mail enviado com sucesso!');
    console.log('ID do e-mail:', info.messageId);
  } catch (error) {
    console.error('Falha na autenticação SMTP:', error);
  }
}

main();
