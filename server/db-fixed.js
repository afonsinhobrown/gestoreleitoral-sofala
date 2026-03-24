const { Pool } = require('pg');
require('dotenv').config();

// Configuração otimizada para Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        require: true
    },
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10
});

// Testar conexão ao iniciar
pool.on('connect', () => {
    console.log('✅ Conexão com Neon estabelecida');
});

pool.on('error', (err) => {
    console.error('❌ Erro inesperado no pool do PostgreSQL:', err);
});

// Função para testar conexão
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Teste de conexão com Neon: OK');
        const result = await client.query('SELECT NOW() as time');
        console.log('✅ Hora do servidor:', result.rows[0].time);
        client.release();
        return true;
    } catch (error) {
        console.error('❌ Falha na conexão com Neon:', error.message);
        console.error('🔧 Dica: Verifique:');
        console.error('   1. Conexão de internet');
        console.error('   2. Credenciais do Neon');
        console.error('   3. Firewall/SSL');
        return false;
    }
}

// Testar ao carregar
testConnection();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
    testConnection
};