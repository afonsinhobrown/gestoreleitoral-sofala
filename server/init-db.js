const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('--- Reiniciando Base de Dados STAE (Limpeza Total) ---');
  const client = await pool.connect();
  try {
    console.log('--- Recriando Tabelas Reais ---');
    await client.query('BEGIN');
    
    // Limpeza radical para aplicar novas colunas (QR Code, Foto)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    await client.query('GRANT ALL ON SCHEMA public TO neondb_owner;');
    
    await client.query(schema);
    await client.query('COMMIT');
    console.log('--- Sucesso! Esquema 2.0 (QR e Fotos) Aplicado no Neon DB ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('--- Erro na Reestruturação:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

initializeDatabase();
