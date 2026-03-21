const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { pool } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); // Permitir envio de fotos biométricas

// --- ROTAS DO SECRETARIADO TÉCNICO DE ADMINISTRAÇÃO ELEITORAL ---

// 1. SUBMISSÃO DE CANDIDATURA (PORTAL DO MEIO)
app.post('/api/candidate/apply', async (req, res) => {
  const { nome, nuit, categoria, evento, provincia, distrito, posto, localidade, photo } = req.body;
  try {
    // 1.1 Garantir Evento 2026
    const eventRes = await pool.query("INSERT INTO events (name, year) VALUES ($1, 2026) ON CONFLICT (name) DO UPDATE SET year = 2026 RETURNING id", [evento]);
    const eventId = eventRes.rows[0].id;

    // 1.2 Criar Utilizador Básico (Candidato)
    const email = `candidato_${Date.now()}@stae.gov.mz`;
    const userRes = await pool.query("INSERT INTO users (email, password_hash, role) VALUES ($1, 'stae_sofala_2026', 'candidato') RETURNING id", [email]);
    const userId = userRes.rows[0].id;

    // 1.3 Criar Perfil Biométrico
    await pool.query("INSERT INTO profiles (id, full_name, nuit, photo_url) VALUES ($1, $2, $3, $4)", [userId, nome, nuit, photo]);

    // 1.4 Criar Candidatura Oficial
    await pool.query("INSERT INTO applications (user_id, event_id, category, status) VALUES ($1, $2, $3, 'pendente')", [userId, eventId, categoria]);

    console.log(`--- CANDIDATURA DE ${nome} RECEBIDA EM SOFALA ---`);
    res.json({ success: true, message: 'Candidatura Submetida com Sucesso Nacional' });
  } catch (err) {
    console.error('Falha na Submissão:', err.message);
    res.status(500).json({ error: 'Erro de Servidor Nacional' });
  }
});

// 2. LISTAGEM ADMINISTRATIVA NACIONAL
app.get('/api/admin/applications', async (req, res) => {
  try {
    const apps = await pool.query(`
      SELECT p.full_name, p.nuit, a.category as role, a.status 
      FROM applications a 
      JOIN profiles p ON a.user_id = p.id 
      ORDER BY a.created_at DESC
    `);
    res.json(apps.rows);
  } catch (err) { res.status(500).json({ error: 'Erro Administrativo' }); }
});

// 3. LOGIN SIMPLIFICADO
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  res.json({ id: 'admin-id', role: 'administrador_provincial', email: 'afonso@stae.gov.mz' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`--- API NACIONAL STAE 2.0 - SOFALA 2026 - PORTA ${PORT} ---`);
  console.log(`=======================================================`);
});
