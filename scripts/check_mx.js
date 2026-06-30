const dns = require('dns');

dns.resolveMx('ffainfraestrutura.com.br', (err, addresses) => {
  if (err) {
    console.error('Error resolving MX records:', err);
    return;
  }
  console.log('MX Records for ffainfraestrutura.com.br:');
  console.log(addresses);
});
