const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const updateSchema = async () => {
  const client = await pool.connect();
  try {
    console.log('🔄 Iniciando atualização do esquema estatutário...');
    await client.query('BEGIN');

    // 1. Criar Tabela de Categorias
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.categorias_cargo (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome TEXT UNIQUE NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Criar Tabela de Processos Eleitorais e Garantir Colunas
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.processos_eleitorais (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nome TEXT NOT NULL,
        ano INTEGER NOT NULL,
        estado TEXT DEFAULT 'activo',
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      ALTER TABLE public.processos_eleitorais 
      ADD COLUMN IF NOT EXISTS tipo TEXT CHECK (tipo IN ('Recenseamento', 'Votação'))
    `);

    // 3. Inserir Categorias Oficiais
    await client.query(`
      INSERT INTO public.categorias_cargo (nome, descricao) VALUES 
      ('Brigadista', 'Atuam no processo de recenseamento eleitoral'),
      ('Agente de Educação Cívica', 'Promovem a sensibilização dos eleitores'),
      ('MMV', 'Membros das Mesas de Voto')
      ON CONFLICT (nome) DO NOTHING
    `);

    // 4. Inserir Processos Reais
    await client.query(`
      INSERT INTO public.processos_eleitorais (nome, tipo, ano, estado) VALUES 
      ('Recenseamento Eleitoral 2024', 'Recenseamento', 2024, 'concluido'),
      ('Votação Eleições Gerais 2024', 'Votação', 2024, 'activo')
      ON CONFLICT DO NOTHING
    `);

    // 5. Ajustar Candidaturas e Turmas
    await client.query(`
      ALTER TABLE public.candidaturas 
      ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES public.processos_eleitorais(id)
    `);

    await client.query(`
      ALTER TABLE public.turmas_formacao
      ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES public.processos_eleitorais(id)
    `);

    await client.query('COMMIT');
    console.log('✅ Esquema atualizado e dados base inseridos com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na atualização:', err.message);
  } finally {
    client.release();
    process.exit();
  }
};

updateSchema();
