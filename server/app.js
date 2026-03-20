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
app.use(express.json());

// 1. Login Geral
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Inexistente' });
    const user = userRes.rows[0];
    const profileRes = await pool.query('SELECT * FROM profiles WHERE id = $1', [user.id]);
    res.json({ id: user.id, email: user.email, role: user.role, profile: profileRes.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Erro de Servidor' }); }
});

// 2. Perfil do Candidato (Funil)
app.get('/api/candidate/full-profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const appRes = await pool.query(`
      SELECT a.*, e.name as event_name, p.nuit
      FROM applications a 
      JOIN events e ON a.event_id = e.id 
      JOIN profiles p ON a.user_id = p.id
      WHERE a.user_id = $1
    `, [userId]);
    if (appRes.rows.length === 0) return res.json({ status: 'sem_candidatura' });
    const application = appRes.rows[0];
    const groupRes = await pool.query('SELECT g.* FROM groups g JOIN group_members gm ON g.id = gm.group_id WHERE gm.application_id = $1', [application.id]);
    res.json({ application, group: groupRes.rows[0] || null });
  } catch (err) { res.status(500).json({ error: 'Erro de Dados' }); }
});

// 3. ROTA ADMINISTRATIVA: Todas as Candidaturas (Corrigida para Nacional)
app.get('/api/admin/applications', async (req, res) => {
  try {
    const apps = await pool.query(`
      SELECT 
        u.id as user_id, u.email, 
        p.full_name, 
        a.id as application_id, a.category, a.status, a.current_phase,
        d.name as district,
        pro.name as province
      FROM users u
      JOIN profiles p ON u.id = p.id
      JOIN applications a ON u.id = a.user_id
      JOIN districts d ON a.district_id = d.id
      JOIN provinces pro ON a.province_id = pro.id
      WHERE u.role = 'candidato'
      ORDER BY a.created_at DESC
    `);
    res.json(apps.rows);
  } catch (err) {
    console.error('Erro na Query Nacional:', err.message);
    res.status(500).json({ error: 'Erro ao carregar lista nacional' });
  }
});

// 4. Aprovação para Formação
app.post('/api/admin/approve-training', async (req, res) => {
  const { appId } = req.body;
  try {
    await pool.query("UPDATE applications SET status = 'aprovado_formacao', current_phase = 'formação' WHERE id = $1", [appId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro na aprovação' }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`--- API NACIONAL STAE 2.0 ACTIVA NA PORTA ${PORT} ---`);
});
