const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_lxzyje16DKdf@ep-empty-sun-at91a66s-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function main() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    // Query tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in public schema:', res.rows.map(r => r.table_name));

    // If there are tables, let's query the column details of those tables
    for (let table of res.rows) {
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}'
      `);
      console.log(`\nColumns in table '${table.table_name}':`, colRes.rows);
      
      const countRes = await client.query(`SELECT COUNT(*) FROM "${table.table_name}"`);
      console.log(`Row count in table '${table.table_name}':`, countRes.rows[0].count);
    }

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    await client.end();
  }
}

main();


