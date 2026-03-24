// MIGRAÇÃO PARA ADICIONAR CAMPOS DE AVALIAÇÃO
// Script não-destrutivo que apenas adiciona colunas faltantes

const { pool } = require('./db-neon-fixed.js');

async function migrarAvaliacao() {
    console.log('--- MIGRAÇÃO: Adicionando campos de avaliação documental e entrevista ---');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar se a tabela candidaturas existe
        const tabelaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'candidaturas'
      )
    `);

        if (!tabelaExiste.rows[0].exists) {
            console.log('ERRO: Tabela "candidaturas" não existe. Execute init-db.js primeiro.');
            await client.query('ROLLBACK');
            return;
        }

        // Lista de colunas a adicionar (com verificação se já existem)
        const colunasParaAdicionar = [
            // Critérios de avaliação documental
            { nome: 'criterio_validade_bi', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_validade_certificado', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_legibilidade', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_completude', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_autenticidade', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'pontuacao_documentacao', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'motivo_reprovacao', tipo: 'TEXT' },

            // Entrevista
            { nome: 'entrevista_realizada', tipo: 'BOOLEAN DEFAULT FALSE' },
            { nome: 'data_entrevista', tipo: 'TIMESTAMP WITH TIME ZONE' },
            { nome: 'entrevistador_id', tipo: 'UUID REFERENCES public.utilizadores(id)' },
            { nome: 'pontuacao_entrevista', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'observacoes_entrevista', tipo: 'TEXT' },

            // Critérios de avaliação na entrevista
            { nome: 'criterio_comunicacao', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_conhecimento', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_atitude', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_experiencia', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'criterio_motivacao', tipo: 'INTEGER DEFAULT 0' },

            // Avaliação final
            { nome: 'pontuacao_final', tipo: 'INTEGER DEFAULT 0' },
            { nome: 'resultado_final', tipo: 'TEXT DEFAULT \'pendente\'' },
            { nome: 'recomendacoes', tipo: 'TEXT' }
        ];

        let colunasAdicionadas = 0;

        for (const coluna of colunasParaAdicionar) {
            // Verificar se a coluna já existe
            const colunaExiste = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'candidaturas' 
          AND column_name = '${coluna.nome}'
        )
      `);

            if (!colunaExiste.rows[0].exists) {
                console.log(`Adicionando coluna: ${coluna.nome} (${coluna.tipo})`);
                await client.query(`
          ALTER TABLE public.candidaturas 
          ADD COLUMN ${coluna.nome} ${coluna.tipo}
        `);
                colunasAdicionadas++;
            } else {
                console.log(`Coluna já existe: ${coluna.nome}`);
            }
        }

        await client.query('COMMIT');
        console.log(`--- MIGRAÇÃO CONCLUÍDA: ${colunasAdicionadas} colunas adicionadas ---`);
        console.log('--- O sistema de avaliação documental e entrevista está pronto para uso ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('--- ERRO NA MIGRAÇÃO:', err.message);
        console.error('Detalhes:', err);
    } finally {
        client.release();
        pool.end();
    }
}

// Executar migração
migrarAvaliacao().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});