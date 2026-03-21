const { pool } = require('./server/db');

async function seed() {
  const candidates = [
    ['Gilberto Machava', 'Beira', 'Central', 'Ponta Gea', '123456789', 'Masculino', '841234567', 'aprovado', 'MMV', 'PENDENTE'],
    ['Maria dos Anjos', 'Beira', 'Munhava', 'Matacuane', '987654321', 'Feminino', '829876543', 'pendente', 'MMV', 'PENDENTE'],
    ['António Cuamba', 'Dondo', 'Mafambisse', 'Mutua', '456789123', 'Masculino', '874561234', 'pendente', 'Supervisor', 'PENDENTE'],
    ['Sofia Manjate', 'Nhamatanda', 'Tica', 'Lamego', '321654987', 'Feminino', '853216549', 'aprovado', 'MMV', 'PENDENTE'],
    ['Zeca Afonso', 'Beira', 'Munhava', 'Vila Massane', '654321987', 'Masculino', '846543219', 'pendente', 'MMV', 'PENDENTE']
  ];

  try {
    console.log('Iniciando povoamento da base de dados STAE Sofala...');

    for (let c of candidates) {
      await pool.query(
        `INSERT INTO candidates (name, district_name, posto_name, localidade_name, nuit, gender, contact, status, category, training_result) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         ON CONFLICT (nuit) DO NOTHING`, c
      );
    }

    console.log("BASE DE DADOS DE SOFALA POPULADA COM SUCESSO.");
  } catch (err) {
    console.error("ERRO ao popular base de dados:", err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

seed();
