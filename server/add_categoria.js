const { pool } = require('./db-neon-fixed');

async function run() {
  try {
    await pool.query(`INSERT INTO public.categorias_cargo (nome, descricao) VALUES ('Agente de Educação Cívica', 'Agente responsável pela educação cívica eleitoral') ON CONFLICT (nome) DO NOTHING;`);
    console.log('Categoria adicionada');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
