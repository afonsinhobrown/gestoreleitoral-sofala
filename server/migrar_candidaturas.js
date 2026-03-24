const { pool } = require('./db-neon-fixed');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE public.candidaturas DROP CONSTRAINT IF EXISTS candidaturas_utilizador_id_fkey;
      ALTER TABLE public.candidaturas ALTER COLUMN utilizador_id DROP NOT NULL;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS nome_completo TEXT;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS nuit TEXT;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS bi_numero TEXT;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS telefone TEXT;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE public.candidaturas ADD COLUMN IF NOT EXISTS genero TEXT;

      -- Make notificacoes.destinatario_id nullable if it was constrained 
      ALTER TABLE public.notificacoes ALTER COLUMN destinatario_id DROP NOT NULL;
    `);
    console.log('Migração das candidaturas concluída com sucesso!');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
