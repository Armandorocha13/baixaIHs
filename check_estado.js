require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    // Check distribution by estado
    const res1 = await pool.query('SELECT estado, COUNT(*) as total FROM logs_consumo GROUP BY estado ORDER BY total DESC');
    console.log('=== Distribuição por estado ===');
    res1.rows.forEach(row => console.log('  ' + row.estado + ': ' + row.total));

    // Check a few sample rows to see estado values
    const res2 = await pool.query('SELECT num_os, estado, projeto FROM logs_consumo LIMIT 10');
    console.log('\n=== Amostra de registros ===');
    res2.rows.forEach(row => console.log('  OS: ' + row.num_os + ' | Estado: ' + row.estado + ' | Projeto: ' + row.projeto));

    // Check if there are any SP records
    const res3 = await pool.query("SELECT COUNT(*) as total FROM logs_consumo WHERE estado = 'SP'");
    console.log('\n=== Total SP ===');
    console.log('  ' + res3.rows[0].total);

    await pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

main();
