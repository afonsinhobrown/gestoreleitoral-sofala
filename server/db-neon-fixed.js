const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Configurando conexão com Neon...');
console.log('📡 Connection string:', process.env.DATABASE_URL ? 'Presente' : 'Faltando');

// Configuração específica para Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
        require: true
    },
    connectionTimeoutMillis: 30000, // 30 segundos
    idleTimeoutMillis: 60000, // 1 minuto
    max: 10,
    allowExitOnIdle: true
});

// Testar conexão imediatamente
async function testConnection() {
    console.log('🧪 Testando conexão com Neon...');
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT NOW() as time, version() as version');
        console.log('✅ Conexão estabelecida com sucesso!');
        console.log('   Hora do servidor:', result.rows[0].time);
        console.log('   Versão PostgreSQL:', result.rows[0].version.split('\n')[0]);

        // Verificar se tabelas existem
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log(`📊 Tabelas encontradas: ${tables.rows.length}`);
        tables.rows.forEach((row, i) => {
            if (i < 5) console.log(`   - ${row.table_name}`);
        });
        if (tables.rows.length > 5) console.log(`   ... e mais ${tables.rows.length - 5} tabelas`);

        return true;
    } catch (error) {
        console.error('❌ Falha na conexão:', error.message);
        console.error('🔍 Detalhes do erro:', error.code);

        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Dica: Servidor PostgreSQL não está respondendo');
        } else if (error.code === '28P01') {
            console.error('💡 Dica: Senha incorreta ou usuário não existe');
        } else if (error.code === '3D000') {
            console.error('💡 Dica: Banco de dados não existe');
        } else if (error.code === 'ENOTFOUND') {
            console.error('💡 Dica: Host não encontrado - verifique a URL');
        }

        return false;
    } finally {
        client.release();
    }
}

// Executar teste
testConnection().then(success => {
    if (success) {
        console.log('🚀 Banco de dados pronto para uso!');
    } else {
        console.log('⚠️  Problemas com a conexão. O sistema pode não funcionar corretamente.');
    }
});

// Exportar pool com tratamento de erro
module.exports = {
    query: async (text, params) => {
        try {
            return await pool.query(text, params);
        } catch (error) {
            console.error('❌ Erro na query:', error.message);
            console.error('   Query:', text.substring(0, 100) + '...');
            throw error;
        }
    },
    pool,
    testConnection
};