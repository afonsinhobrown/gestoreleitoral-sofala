const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seedNationalData() {
  const client = await pool.connect();
  try {
    console.log('--- Iniciando Povoamento NACIONAL STAE Moçambique ---');
    await client.query('BEGIN');
    await client.query('TRUNCATE public.provinces, public.users, public.groups CASCADE');

    // 1. Províncias Oficiais
    const provinces = [
      'Cabo Delgado', 'Niassa', 'Nampula', 'Tete', 'Zambézia', 
      'Manica', 'Sofala', 'Inhambane', 'Gaza', 'Maputo Província', 'Maputo Cidade'
    ];
    
    const provMap = {};
    for (const name of provinces) {
       const res = await client.query('INSERT INTO public.provinces (name) VALUES ($1) RETURNING id', [name]);
       provMap[name] = res.rows[0].id;
    }

    // 2. Distritos de Sofala (Estudo de Caso)
    const sofalaId = provMap['Sofala'];
    const districtsRes = await client.query(
       "INSERT INTO public.districts (province_id, name) VALUES ($1, $2), ($1, $3), ($1, $4) RETURNING id, name",
       [sofalaId, 'Beira', 'Dondo', 'Nhamatanda']
    );
    const beiraId = districtsRes.rows.find(d => d.name === 'Beira').id;

    // 3. Administrador Provincial (Afonso em Sofala)
    const adminHash = bcrypt.hashSync('stae.admin', 10);
    const afonsoRes = await client.query(
      'INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      ['afonso@stae.gov.mz', adminHash, 'administrador_provincial']
    );
    await client.query(
      'INSERT INTO public.profiles (id, full_name, province_id) VALUES ($1, $2, $3)',
      [afonsoRes.rows[0].id, 'Afonso (Director Provincial Sofala)', sofalaId]
    );

    // 4. Candidato Real (Gilberto Machava na Beira)
    const gilHash = bcrypt.hashSync('stae2024', 10);
    const gilRes = await client.query(
      'INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      ['gilberto@stae.gov.mz', gilHash, 'candidato']
    );
    await client.query(
      'INSERT INTO public.profiles (id, full_name, photo_url, qr_code_data, province_id, district_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [gilRes.rows[0].id, 'Gilberto Salomão Zeferino Machava', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Gilberto', 'STAE-2024-GIL-001', sofalaId, beiraId]
    );

    // 5. Evento e Candidatura
    const evRes = await client.query("INSERT INTO public.events (name, year) VALUES ($1, $2) RETURNING id", ['Votação Geral 2024', 2024]);
    const evId = evRes.rows[0].id;

    await client.query(
      'INSERT INTO public.applications (user_id, event_id, category, province_id, district_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [gilRes.rows[0].id, evId, 'Membro de Mesa de Voto (MMV)', sofalaId, beiraId, 'pendente']
    );

    await client.query('COMMIT');
    console.log('--- Sucesso! Sistema Nacional pronto no Neon DB (Sofala Povoada) ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('--- Erro no povoamento nacional:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

seedNationalData();
