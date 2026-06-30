require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lxzyje16DKdf@ep-empty-sun-at91a66s-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Neon server connection in some Node environments
  }
});

// Prevent unhandled errors on idle clients from crashing the server
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message || err);
});

// Test connection and initialize table
async function initDb() {
  const initSchemaQuery = `
    CREATE TABLE IF NOT EXISTS logs_consumo (
        id SERIAL PRIMARY KEY,
        num_os VARCHAR(50),
        cliente VARCHAR(100),
        data_execucao DATE,
        equipe VARCHAR(50),
        material VARCHAR(50),
        codcpl VARCHAR(50),
        qtd_aplic INT,
        qtd_remov INT,
        aba_origem VARCHAR(50) DEFAULT 'MODEM',
        motivo VARCHAR(255),
        status VARCHAR(50),
        estado VARCHAR(10),
        projeto VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_logs_cidade ON logs_consumo(estado);
    CREATE INDEX IF NOT EXISTS idx_logs_data ON logs_consumo(data_execucao);
    CREATE INDEX IF NOT EXISTS idx_logs_search ON logs_consumo(num_os, equipe, material);
  `;

  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database.');
    await client.query(initSchemaQuery);
    console.log('Database tables and indexes initialized.');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database or initializing schema:', err);
    throw err;
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  initDb
};
