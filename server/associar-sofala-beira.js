const { pool } = require('./db-neon-fixed');

async function associarDados() {
  const client = await pool.connect();
  try {
    // 1. Encontrar IDs reais
    const sofalaRes = await client.query("SELECT id FROM public.provincias WHERE nome ILIKE '%sofala%' LIMIT 1");
    const beiraRes = await client.query("SELECT id FROM public.distritos WHERE nome ILIKE '%beira%' LIMIT 1");

    if (sofalaRes.rows.length === 0) {
      console.error('❌ Província Sofala não encontrada!');
      const todasProv = await client.query("SELECT id, nome FROM public.provincias LIMIT 20");
      console.log('Províncias disponíveis:', todasProv.rows);
      return;
    }
    if (beiraRes.rows.length === 0) {
      console.error('❌ Distrito Beira não encontrado!');
      const todosDistritos = await client.query("SELECT id, nome FROM public.distritos LIMIT 30");
      console.log('Distritos disponíveis:', todosDistritos.rows);
      return;
    }

    const sofalaId = sofalaRes.rows[0].id;
    const beiraId = beiraRes.rows[0].id;
    console.log(`✅ Sofala ID: ${sofalaId}`);
    console.log(`✅ Beira ID: ${beiraId}`);

    // 2. Actualizar candidaturas
    const candResult = await client.query(
      `UPDATE public.candidaturas SET provincia_id = $1, distrito_id = $2 RETURNING id`,
      [sofalaId, beiraId]
    );
    console.log(`✅ ${candResult.rowCount} candidaturas associadas a Sofala/Beira`);

    // 3. Verificar utilizador da Beira
    const beiraUserRes = await client.query(
      `SELECT u.id, u.email, u.role, p.nome_completo, p.distrito_id, p.provincia_id 
       FROM public.utilizadores u 
       LEFT JOIN public.perfis p ON u.id = p.id 
       WHERE u.email ILIKE '%beira%' LIMIT 1`
    );
    if (beiraUserRes.rows.length > 0) {
      const u = beiraUserRes.rows[0];
      console.log(`\n👤 Utilizador Beira:`);
      console.log(`   distrito_id no perfil: ${u.distrito_id}`);
      console.log(`   Beira real ID:         ${beiraId}`);
      console.log(`   COINCIDEM: ${String(u.distrito_id) === String(beiraId)}`);
      
      if (String(u.distrito_id) !== String(beiraId)) {
        console.log('🔧 A corrigir perfil do utilizador Beira...');
        await client.query(
          `UPDATE public.perfis SET provincia_id = $1, distrito_id = $2 WHERE id = $3`,
          [sofalaId, beiraId, u.id]
        );
        console.log('✅ Perfil corrigido!');
      }
    } else {
      console.log('⚠️ Utilizador beira não encontrado. A criar...');
      const bcrypt = require('bcrypt');
      const hash = bcrypt.hashSync('beira123', 10);
      const newUser = await client.query(
        `INSERT INTO public.utilizadores (email, password_hash, role) VALUES ('beira', $1, 'administrador_distrital') 
         ON CONFLICT (email) DO UPDATE SET password_hash = $1 RETURNING id`,
        [hash]
      );
      await client.query(
        `INSERT INTO public.perfis (id, nome_completo, provincia_id, distrito_id) VALUES ($1, 'Admin Distrital Beira', $2, $3)
         ON CONFLICT (id) DO UPDATE SET provincia_id = $2, distrito_id = $3`,
        [newUser.rows[0].id, sofalaId, beiraId]
      );
      console.log('✅ Utilizador Beira criado/actualizado!');
    }

    // 4. Resumo final
    const candCount = await client.query(`SELECT COUNT(*) FROM public.candidaturas WHERE distrito_id = $1`, [beiraId]);
    console.log(`\n📊 Total candidaturas na Beira: ${candCount.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
}

associarDados().catch(console.error);
