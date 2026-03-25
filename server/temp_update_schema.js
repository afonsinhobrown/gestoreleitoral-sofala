
require('dotenv').config();
const { pool } = require('./db-neon-fixed');

async function updateSchema() {
    console.log('--- ATUALIZANDO SCHEMA ---');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('Adicionando colunas em public.perfis...');
        await client.query('ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS primeiro_nome TEXT, ADD COLUMN IF NOT EXISTS apelido TEXT;');
        
        console.log('Adicionando colunas em public.candidaturas...');
        await client.query('ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS primeiro_nome TEXT, ADD COLUMN IF NOT EXISTS apelido TEXT;');
        
        await client.query('COMMIT');
        console.log('✅ Schema atualizado com sucesso.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao atualizar schema:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

updateSchema();
