const fs = require('fs');
const path = require('path');
const { pool } = require('./db-neon-fixed');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'schema_completo.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  console.log('--- INICIALIZANDO BANCO DE DADOS NEON COM AVALIAÇÃO COMPLETA ---');
  console.log('--- Usando schema_completo.sql (com 15 campos de avaliação) ---');
  const client = await pool.connect();
  try {
    console.log('--- Criando tabelas com sistema de avaliação completo ---');
    await client.query('BEGIN');

    // Limpeza radical para aplicar novas colunas (QR Code, Foto)
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    await client.query('GRANT ALL ON SCHEMA public TO neondb_owner;');

    await client.query(schema);
    await client.query('COMMIT');
    console.log('--- ✅ SUCESSO! Banco de dados criado com 15 campos de avaliação ---');
    console.log('--- ✅ Tabelas criadas: candidaturas, turmas_formacao, utilizadores, etc. ---');
    console.log('--- ✅ Sistema de avaliação documental + entrevista pronto para uso ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('--- ❌ ERRO na criação do banco de dados:', err.message);
    console.error('Detalhes:', err);
  } finally {
    client.release();
    pool.end();
    console.log('--- Conexão com banco de dados encerrada ---');
  }
}

initializeDatabase();
