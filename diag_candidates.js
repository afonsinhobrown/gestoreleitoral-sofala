const { pool } = require('./server/db-neon-fixed');
async function run() {
  try {
    const res = await pool.query("SELECT id, nome_completo, estado_geral, fase_atual, categoria_id FROM public.candidaturas WHERE estado_geral = 'aprovado'");
    console.log('--- APROVADOS ---');
    console.log(JSON.stringify(res.rows, null, 2));
    
    const res2 = await pool.query("SELECT id, nome FROM public.categorias_cargo");
    console.log('--- CATEGORIAS ---');
    console.log(JSON.stringify(res2.rows, null, 2));

    const res3 = await pool.query("SELECT id, nome, categoria_id FROM public.turmas_formacao");
    console.log('--- TURMAS ---');
    console.log(JSON.stringify(res3.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
