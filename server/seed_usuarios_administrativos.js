const { pool } = require('./db-neon-fixed');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('🚀 Iniciando seed de usuários administrativos...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Criar Usuário Central
    const centralPass = bcrypt.hashSync('central123', 10);
    const existingCentral = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', ['central']);
    let centralId;
    if (existingCentral.rows.length === 0) {
      const res = await client.query(
        'INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        ['central', centralPass, 'master_nacional']
      );
      centralId = res.rows[0].id;
      await client.query('INSERT INTO public.perfis (id, nome_completo) VALUES ($1, $2)', [centralId, 'Administrador Central']);
      console.log('✅ Usuário CENTRAL criado (Senha: central123)');
    }

    // 2. Criar Usuários Provinciais
    const provinciasRes = await client.query('SELECT * FROM public.provincias');
    for (const prov of provinciasRes.rows) {
      const email = prov.nome.toLowerCase().replace(/\s+/g, '');
      const pass = prov.nome.replace(/\s+/g, '') + '123';
      const hash = bcrypt.hashSync(pass, 10);
      
      const existing = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', [email]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          'INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
          [email, hash, 'administrador_provincial']
        );
        const uid = res.rows[0].id;
        await client.query('INSERT INTO public.perfis (id, nome_completo, provincia_id) VALUES ($1, $2, $3)', [uid, `Admin Provincial ${prov.nome}`, prov.id]);
        console.log(`✅ Usuário PROVINCIAL: ${email} (Senha: ${pass})`);
      }
    }

    // 3. Criar Usuários Distritais
    const distritosRes = await client.query('SELECT * FROM public.distritos');
    for (const dist of distritosRes.rows) {
      const email = dist.nome.toLowerCase().replace(/\s+/g, '');
      const pass = dist.nome.replace(/\s+/g, '') + '123';
      const hash = bcrypt.hashSync(pass, 10);
      
      const existing = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', [email]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          'INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
          [email, hash, 'administrador_distrital']
        );
        const uid = res.rows[0].id;
        await client.query('INSERT INTO public.perfis (id, nome_completo, distrito_id) VALUES ($1, $2, $3)', [uid, `Admin Distrital ${dist.nome}`, dist.id]);
        console.log(`✅ Usuário DISTRITAL: ${email} (Senha: ${pass})`);
      }
    }

    await client.query('COMMIT');
    console.log('--- FINALIZADO COM SUCESSO ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(console.error);
