const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seedNationalData() {
  const client = await pool.connect();
  try {
    console.log('--- Iniciando Povoamento NACIONAL STAE Moçambique ---');
    await client.query('BEGIN');

    // Limpar tabelas existentes
    await client.query('TRUNCATE public.candidates, public.groups, public.group_members, public.provinces, public.districts, public.users CASCADE');

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

    // 4. Candidatos de exemplo para o sistema
    const candidates = [
      ['Gilberto Machava', 'Beira', 'Central', 'Ponta Gea', '123456789', 'Masculino', '841234567', 'aprovado', 'MMV', 'PENDENTE'],
      ['Maria dos Anjos', 'Beira', 'Munhava', 'Matacuane', '987654321', 'Feminino', '829876543', 'pendente', 'MMV', 'PENDENTE'],
      ['António Cuamba', 'Dondo', 'Mafambisse', 'Mutua', '456789123', 'Masculino', '874561234', 'pendente', 'Supervisor', 'PENDENTE'],
      ['Sofia Manjate', 'Nhamatanda', 'Tica', 'Lamego', '321654987', 'Feminino', '853216549', 'aprovado', 'MMV', 'PENDENTE'],
      ['Zeca Afonso', 'Beira', 'Munhava', 'Vila Massane', '654321987', 'Masculino', '846543219', 'pendente', 'MMV', 'PENDENTE']
    ];

    for (let c of candidates) {
      await client.query(
        `INSERT INTO public.candidates (name, district_name, posto_name, localidade_name, nuit, gender, contact, status, category, training_result) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        c
      );
    }

    await client.query('COMMIT');
    console.log('--- Sucesso! Sistema Nacional pronto (Sofala Povoada) ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('--- Erro no povoamento nacional:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedNationalData()
    .then(() => {
      console.log('Seed concluído com sucesso.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seed falhou:', err);
      process.exit(1);
    });
}

module.exports = { seedNationalData };
