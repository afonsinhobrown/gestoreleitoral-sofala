// Script para verificar e criar tabelas STAE faltantes
const { pool } = require('./db-neon-fixed');
const fs = require('fs');
const path = require('path');

async function verificarECriarTabelas() {
    console.log('--- VERIFICANDO E CRIANDO TABELAS STAE ---');
    const client = await pool.connect();

    try {
        // 1. Verificar quais tabelas existem
        const tabelasExistentes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log('📊 Tabelas existentes no banco de dados:');
        tabelasExistentes.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });

        // 2. Verificar se as tabelas STAE existem
        const tabelasSTAE = ['candidaturas', 'turmas_formacao', 'utilizadores', 'perfis'];
        const tabelasFaltantes = [];

        for (const tabela of tabelasSTAE) {
            const existe = tabelasExistentes.rows.some(row => row.table_name === tabela);
            if (!existe) {
                tabelasFaltantes.push(tabela);
                console.log(`❌ Tabela faltante: ${tabela}`);
            } else {
                console.log(`✅ Tabela existente: ${tabela}`);
            }
        }

        if (tabelasFaltantes.length === 0) {
            console.log('--- ✅ TODAS AS TABELAS STAE JÁ EXISTEM ---');
            return;
        }

        console.log(`\n--- 🚀 CRIANDO ${tabelasFaltantes.length} TABELAS FALTANTES ---`);

        // 3. Ler o schema completo
        const schemaPath = path.join(__dirname, '..', 'schema_completo.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // 4. Extrair apenas os comandos CREATE TABLE para as tabelas faltantes
        const linhas = schema.split('\n');
        let comandosParaExecutar = [];
        let dentroCreateTable = false;
        let createTableBuffer = '';

        for (const linha of linhas) {
            if (linha.trim().toUpperCase().startsWith('CREATE TABLE')) {
                dentroCreateTable = true;
                createTableBuffer = linha + '\n';
            } else if (dentroCreateTable && linha.trim() === ');') {
                createTableBuffer += linha;
                dentroCreateTable = false;

                // Verificar se é uma tabela STAE que está faltando
                const match = createTableBuffer.match(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/i);
                if (match) {
                    const nomeTabela = match[1];
                    if (tabelasFaltantes.includes(nomeTabela)) {
                        comandosParaExecutar.push(createTableBuffer);
                        console.log(`📝 Preparando criação da tabela: ${nomeTabela}`);
                    }
                }
            } else if (dentroCreateTable) {
                createTableBuffer += linha + '\n';
            }
        }

        // 5. Executar os comandos
        if (comandosParaExecutar.length > 0) {
            await client.query('BEGIN');

            for (const comando of comandosParaExecutar) {
                console.log(`\n🔨 Executando: ${comando.split('\n')[0].substring(0, 80)}...`);
                try {
                    await client.query(comando);
                    console.log(`✅ Tabela criada com sucesso`);
                } catch (err) {
                    console.error(`❌ Erro ao criar tabela: ${err.message}`);
                    throw err;
                }
            }

            await client.query('COMMIT');
            console.log('\n--- ✅ TODAS AS TABELAS STAE CRIADAS COM SUCESSO ---');
            console.log('--- 🎯 O sistema de avaliação está pronto para uso ---');
        } else {
            console.log('--- ⚠️ Nenhum comando CREATE TABLE encontrado para as tabelas faltantes ---');
        }

    } catch (err) {
        console.error('--- ❌ ERRO:', err.message);
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Erro no rollback:', rollbackErr.message);
        }
    } finally {
        client.release();
        pool.end();
        console.log('--- Conexão encerrada ---');
    }
}

// Executar
verificarECriarTabelas().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});