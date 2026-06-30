const db = require('./db');

async function test() {
  const search = 'SMBS00535BB7';
  const s = `%${search.trim()}%`;
  
  // Test query
  const query = `
    SELECT id, num_os, cliente, to_char(data_execucao, 'DD/MM/YYYY') as data_execucao_formatted, 
           equipe, material, codcpl, qtd_aplic, qtd_remov, aba_origem, motivo, status, estado, projeto
    FROM logs_consumo
    WHERE (num_os ILIKE $1 OR equipe ILIKE $2 OR material ILIKE $3 OR codcpl ILIKE $4)
  `;

  try {
    await db.initDb();
    console.log(`Searching database for: "${search}"...`);
    const res = await db.query(query, [s, s, s, s]);
    console.log(`Found ${res.rows.length} matching rows:`);
    console.log(res.rows);
  } catch (err) {
    console.error('Error during query:', err);
  } finally {
    await db.pool.end();
  }
}

test();
