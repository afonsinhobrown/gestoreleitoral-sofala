const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Configurando conexão ultra-resiliente com Neon...');

// Melhores práticas para Neon/Serverless: keepAlive e timeouts curtos para idle
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 30000, // 30s para conectar
    idleTimeoutMillis: 10000,      // Renovar conexões inativas mais rápido (10s)
    max: 15,                       // Limite conservador para evitar exaustão
    ssl: { rejectUnauthorized: false },
    keepAlive: true,               // Manter canal TCP aberto
    application_name: 'gestoreleitoral_api_v2'
});

// CAPTURAR ERROS NO POOL (Crítico para evitar crashes)
pool.on('error', (err, client) => {
    console.error('🚨 [POOL ERROR] Erro inesperado em cliente inativo:', err.message);
    // Não terminamos o processo, o Pool vai tentar criar novos clientes
});

// Motor de retentativa para Queries (Absorve instabilidades temporárias)
const safeQuery = async (text, params, retries = 3) => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await pool.query(text, params);
        } catch (error) {
            lastError = error;
            const isConnectionError = 
                error.message.includes('terminated unexpectedly') || 
                error.message.includes('timeout') ||
                error.code === 'ECONNRESET' || 
                error.code === '57P01'; // admin_shutdown (Neon scaling)

            if (isConnectionError && i < retries - 1) {
                const wait = Math.pow(2, i) * 500;
                console.warn(`⚠️  Falha na query (${error.message}). Re-tentando em ${wait}ms... (${i + 1}/${retries})`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            throw error;
        }
    }
};

async function testConnection(retries = 3) {
    let client = null;
    try {
        console.log('🧪 Verificando heartbeat do banco de dados...');
        client = await pool.connect();
        const result = await client.query('SELECT NOW() as time');
        console.log('✅ Heartbeat estável:', result.rows[0].time);
        return true;
    } catch (error) {
        console.error('❌ Heartbeat falhou:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// Heartbeat inicial
testConnection();

module.exports = {
    query: safeQuery,
    pool,
    testConnection
};