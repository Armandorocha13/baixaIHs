const nodemailer = require('nodemailer');

const emailUser = 'armandolima@ffainfraestrutura.com.br';
const emailPass = 'VpP8r7qD!QpbN6Og';

console.log('Setting up Nodemailer transporter for KingHost SMTP...');

const transporter = nodemailer.createTransport({
  host: 'smtp.kinghost.net',
  port: 465,
  secure: true, // true for 465, false for other ports
  family: 4,
  auth: {
    user: emailUser,
    pass: emailPass
  },
  tls: {
    // Do not fail on invalid certificates (often helpful for corporate email setups)
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection established successfully!');

    console.log('Sending test email to mandoqxo@gmail.com...');
    const info = await transporter.sendMail({
      from: `"Painel IHS" <${emailUser}>`,
      to: 'mandoqxo@gmail.com',
      subject: 'Teste de Autenticação SMTP - Painel IHS',
      text: 'Olá! Este é um e-mail de teste para verificar se as credenciais SMTP da KingHost e a conexão estão funcionando perfeitamente. Se você recebeu isso, a automação está pronta!',
      html: '<p>Olá!</p><p>Este é um e-mail de teste para verificar se as credenciais SMTP da KingHost e a conexão estão funcionando perfeitamente.</p><p>Se você recebeu isso, a automação está pronta!</p>'
    });

    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('SMTP test failed:', error);
  }
}

main();
