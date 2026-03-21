const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { pool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Multer para upload de ficheiros
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limite
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas ficheiros de imagem e documentos são permitidos'));
    }
  }
});

// Servir ficheiros estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ==================== AUTENTICAÇÃO ====================
app.post('/api/auth/registro', async (req, res) => {
  try {
    const { email, password, nome_completo, nuit, contacto, genero } = req.body;

    const passwordHash = bcrypt.hashSync(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Criar utilizador
      const userRes = await client.query(
        'INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
        [email, passwordHash, 'candidato']
      );

      const userId = userRes.rows[0].id;

      // Criar perfil
      await client.query(
        `INSERT INTO public.perfis (id, nome_completo, nuit, contacto_principal, genero) 
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, nome_completo, nuit, contacto, genero]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Registro realizado com sucesso',
        user_id: userId
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro no registro do utilizador' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT u.*, p.nome_completo FROM public.utilizadores u LEFT JOIN public.perfis p ON u.id = p.id WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const passwordValid = bcrypt.compareSync(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await pool.query(
      'UPDATE public.utilizadores SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        nome_completo: user.nome_completo
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro no processo de login' });
  }
});

// ==================== GESTÃO DE CANDIDATURAS ====================
// Listar todas as candidaturas
app.get('/api/candidaturas', async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
             p.nome as processo_nome,
             cat.nome as categoria_nome,
             u.email,
             pf.nome_completo
      FROM public.candidaturas c
      LEFT JOIN public.processos_eleitorais p ON c.processo_id = p.id
      LEFT JOIN public.categorias_cargo cat ON c.categoria_id = cat.id
      LEFT JOIN public.utilizadores u ON c.utilizador_id = u.id
      LEFT JOIN public.perfis pf ON u.id = pf.id
      ORDER BY c.criado_em DESC
    `;

    const result = await pool.query(query);
    res.json({ candidaturas: result.rows });
  } catch (err) {
    console.error('Erro ao listar candidaturas:', err);
    res.status(500).json({ error: 'Erro ao listar candidaturas' });
  }
});

// Obter detalhes de uma candidatura específica
app.get('/api/candidaturas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT c.*,
             p.nome as processo_nome,
             cat.nome as categoria_nome,
             u.email,
             pf.nome_completo,
             pf.contacto_principal,
             pf.nuit,
             pf.bi_numero,
             prov.nome as provincia_nome,
             dist.nome as distrito_nome,
             post.nome as posto_nome,
             loc.nome as localidade_nome
      FROM public.candidaturas c
      LEFT JOIN public.processos_eleitorais p ON c.processo_id = p.id
      LEFT JOIN public.categorias_cargo cat ON c.categoria_id = cat.id
      LEFT JOIN public.utilizadores u ON c.utilizador_id = u.id
      LEFT JOIN public.perfis pf ON u.id = pf.id
      LEFT JOIN public.provincias prov ON c.provincia_actuacao_id = prov.id
      LEFT JOIN public.distritos dist ON c.distrito_actuacao_id = dist.id
      LEFT JOIN public.postos_administrativos post ON c.posto_actuacao_id = post.id
      LEFT JOIN public.localidades loc ON c.localidade_actuacao_id = loc.id
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    res.json({ candidatura: result.rows[0] });
  } catch (err) {
    console.error('Erro ao obter detalhes da candidatura:', err);
    res.status(500).json({ error: 'Erro ao obter detalhes da candidatura' });
  }
});

// Upload de documentos para candidatura
app.post('/api/candidaturas/upload-documentos', upload.fields([
  { name: 'documento_bi', maxCount: 1 },
  { name: 'documento_certificado', maxCount: 1 },
  { name: 'documento_outros', maxCount: 5 }
]), async (req, res) => {
  try {
    const files = req.files;
    const fileUrls = {};

    if (files.documento_bi) {
      fileUrls.documento_bi_url = `/uploads/${files.documento_bi[0].filename}`;
    }
    if (files.documento_certificado) {
      fileUrls.documento_certificado_url = `/uploads/${files.documento_certificado[0].filename}`;
    }
    if (files.documento_outros) {
      fileUrls.documento_outros_urls = files.documento_outros.map(file => `/uploads/${file.filename}`);
    }

    res.json({
      success: true,
      message: 'Documentos carregados com sucesso',
      fileUrls: fileUrls
    });
  } catch (err) {
    console.error('Erro ao carregar documentos:', err);
    res.status(500).json({ error: 'Erro ao carregar documentos' });
  }
});

// Criar nova candidatura com documentos
app.post('/api/candidaturas/completa', upload.fields([
  { name: 'documento_bi', maxCount: 1 },
  { name: 'documento_certificado', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      utilizador_id,
      processo_id,
      categoria_id,
      provincia_actuacao_id,
      distrito_actuacao_id,
      posto_actuacao_id,
      localidade_actuacao_id,
      observacoes
    } = req.body;

    const files = req.files;
    let documento_bi_url = null;
    let documento_certificado_url = null;

    if (files.documento_bi) {
      documento_bi_url = `/uploads/${files.documento_bi[0].filename}`;
    }
    if (files.documento_certificado) {
      documento_certificado_url = `/uploads/${files.documento_certificado[0].filename}`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO public.candidaturas
         (utilizador_id, processo_id, categoria_id, provincia_actuacao_id, distrito_actuacao_id,
          posto_actuacao_id, localidade_actuacao_id, documento_bi_url, documento_certificado_url,
          observacoes, fase_atual, estado_geral)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          utilizador_id, processo_id, categoria_id, provincia_actuacao_id, distrito_actuacao_id,
          posto_actuacao_id, localidade_actuacao_id, documento_bi_url, documento_certificado_url,
          observacoes || '', 'documentacao', 'pendente'
        ]
      );

      // Criar notificação para administradores
      await client.query(
        `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, candidatura_id)
         SELECT id, 'candidatura', 'Nova Candidatura',
                'Uma nova candidatura foi submetida e aguarda avaliação de documentação',
                $1
         FROM public.utilizadores WHERE role IN ('administrador_distrital', 'administrador_provincial', 'master_nacional')`,
        [result.rows[0].id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        candidatura: result.rows[0],
        message: 'Candidatura criada com sucesso. Documentos carregados.'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao criar candidatura completa:', err);
    res.status(500).json({ error: 'Erro ao criar candidatura' });
  }
});

// Criar nova candidatura (versão simples - mantida para compatibilidade)
app.post('/api/candidaturas', async (req, res) => {
  try {
    const {
      utilizador_id,
      processo_id,
      categoria_id,
      provincia_actuacao_id,
      distrito_actuacao_id,
      posto_actuacao_id,
      localidade_actuacao_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO public.candidaturas
       (utilizador_id, processo_id, categoria_id, provincia_actuacao_id, distrito_actuacao_id, posto_actuacao_id, localidade_actuacao_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [utilizador_id, processo_id, categoria_id, provincia_actuacao_id, distrito_actuacao_id, posto_actuacao_id, localidade_actuacao_id]
    );

    res.json({ success: true, candidatura: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar candidatura:', err);
    res.status(500).json({ error: 'Erro ao criar candidatura' });
  }
});

// Avaliar documentação da candidatura (versão detalhada)
app.post('/api/candidaturas/:id/avaliar-detalhada', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      documento_bi_estado,
      documento_certificado_estado,
      pontuacao_documentacao,
      criterio_validade_bi,
      criterio_validade_certificado,
      criterio_legibilidade,
      criterio_completude,
      criterio_autenticidade,
      motivo_reprovacao,
      observacoes,
      avaliado_por
    } = req.body;

    // Calcular pontuação total se não fornecida
    let pontuacao_final = pontuacao_documentacao;
    if (!pontuacao_final && criterio_validade_bi !== undefined) {
      pontuacao_final = (
        (criterio_validade_bi || 0) +
        (criterio_validade_certificado || 0) +
        (criterio_legibilidade || 0) +
        (criterio_completude || 0) +
        (criterio_autenticidade || 0)
      ) * 2; // Escala de 0-100
    }

    // Determinar estado geral baseado na avaliação
    let estado_geral = 'em_avaliacao';
    if (documento_bi_estado === 'aprovado' && documento_certificado_estado === 'aprovado') {
      estado_geral = pontuacao_final >= 60 ? 'aprovado' : 'reprovado';
    } else if (documento_bi_estado === 'reprovado' || documento_certificado_estado === 'reprovado') {
      estado_geral = 'reprovado';
    }

    const result = await pool.query(
      `UPDATE public.candidaturas
       SET documento_bi_estado = $1,
           documento_certificado_estado = $2,
           pontuacao_documentacao = $3,
           criterio_validade_bi = $4,
           criterio_validade_certificado = $5,
           criterio_legibilidade = $6,
           criterio_completude = $7,
           criterio_autenticidade = $8,
           motivo_reprovacao = $9,
           observacoes = $10,
           avaliado_por = $11,
           data_avaliacao = CURRENT_TIMESTAMP,
           estado_geral = $12,
           fase_atual = 'avaliacao',
           actualizado_em = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        documento_bi_estado,
        documento_certificado_estado,
        pontuacao_final,
        criterio_validade_bi,
        criterio_validade_certificado,
        criterio_legibilidade,
        criterio_completude,
        criterio_autenticidade,
        motivo_reprovacao,
        observacoes,
        avaliado_por,
        estado_geral,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    // Criar notificação para o candidato
    if (estado_geral === 'aprovado' || estado_geral === 'reprovado') {
      const candidatura = result.rows[0];
      const titulo = estado_geral === 'aprovado'
        ? 'Candidatura Aprovada'
        : 'Candidatura Reprovada';

      const mensagem = estado_geral === 'aprovado'
        ? `A sua candidatura foi aprovada na fase de documentação. Pontuação: ${pontuacao_final}/100`
        : `A sua candidatura foi reprovada na fase de documentação. Motivo: ${motivo_reprovacao || observacoes || 'Documentação incompleta'}`;

      await pool.query(
        `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, candidatura_id)
         VALUES ($1, 'candidatura', $2, $3, $4)`,
        [candidatura.utilizador_id, titulo, mensagem, id]
      );
    }

    res.json({
      success: true,
      candidatura: result.rows[0],
      pontuacao_final: pontuacao_final
    });
  } catch (err) {
    console.error('Erro ao avaliar documentação detalhada:', err);
    res.status(500).json({ error: 'Erro ao avaliar documentação' });
  }
});

// Avaliar documentação da candidatura (versão simples - mantida para compatibilidade)
app.post('/api/candidaturas/:id/avaliar-documentacao', async (req, res) => {
  try {
    const { id } = req.params;
    const { documento_bi_estado, documento_certificado_estado, pontuacao_documentacao, observacoes } = req.body;

    // Determinar estado geral baseado na avaliação
    let estado_geral = 'em_avaliacao';
    if (documento_bi_estado === 'aprovado' && documento_certificado_estado === 'aprovado') {
      estado_geral = 'aprovado';
    } else if (documento_bi_estado === 'reprovado' || documento_certificado_estado === 'reprovado') {
      estado_geral = 'reprovado';
    }

    const result = await pool.query(
      `UPDATE public.candidaturas
       SET documento_bi_estado = $1,
           documento_certificado_estado = $2,
           pontuacao_documentacao = $3,
           observacoes = $4,
           estado_geral = $5,
           fase_atual = 'avaliacao',
           actualizado_em = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [documento_bi_estado, documento_certificado_estado, pontuacao_documentacao, observacoes, estado_geral, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    // Criar notificação para o candidato
    if (estado_geral === 'aprovado' || estado_geral === 'reprovado') {
      const candidatura = result.rows[0];
      const titulo = estado_geral === 'aprovado'
        ? 'Candidatura Aprovada'
        : 'Candidatura Reprovada';

      const mensagem = estado_geral === 'aprovado'
        ? `A sua candidatura foi aprovada na fase de documentação. Pontuação: ${pontuacao_documentacao}`
        : `A sua candidatura foi reprovada na fase de documentação. Motivo: ${observacoes || 'Documentação incompleta'}`;

      await pool.query(
        `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, candidatura_id)
         VALUES ($1, 'candidatura', $2, $3, $4)`,
        [candidatura.utilizador_id, titulo, mensagem, id]
      );
    }

    res.json({ success: true, candidatura: result.rows[0] });
  } catch (err) {
    console.error('Erro ao avaliar documentação:', err);
    res.status(500).json({ error: 'Erro ao avaliar documentação' });
  }
});

// Avançar fase da candidatura
app.post('/api/candidaturas/:id/avancar-fase', async (req, res) => {
  try {
    const { id } = req.params;
    const { nova_fase } = req.body;

    const fases_validas = ['registro', 'documentacao', 'avaliacao', 'formacao', 'afectacao'];

    if (!fases_validas.includes(nova_fase)) {
      return res.status(400).json({ error: 'Fase inválida' });
    }

    const result = await pool.query(
      `UPDATE public.candidaturas 
       SET fase_atual = $1, actualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [nova_fase, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    res.json({ success: true, candidatura: result.rows[0] });
  } catch (err) {
    console.error('Erro ao avançar fase:', err);
    res.status(500).json({ error: 'Erro ao avançar fase da candidatura' });
  }
});

// ==================== GESTÃO DE FORMAÇÃO ====================
// Listar turmas
app.get('/api/turmas', async (req, res) => {
  try {
    const query = `
      SELECT t.*,
             p.nome as processo_nome,
             c.nome as centro_nome,
             cat.nome as categoria_nome,
             fp.nome_completo as formador_principal_nome,
             fa.nome_completo as formador_auxiliar_nome
      FROM public.turmas_formacao t
      LEFT JOIN public.processos_eleitorais p ON t.processo_id = p.id
      LEFT JOIN public.centros_formacao c ON t.centro_id = c.id
      LEFT JOIN public.categorias_cargo cat ON t.categoria_id = cat.id
      LEFT JOIN public.utilizadores up ON t.formador_principal_id = up.id
      LEFT JOIN public.perfis fp ON up.id = fp.id
      LEFT JOIN public.utilizadores ua ON t.formador_auxiliar_id = ua.id
      LEFT JOIN public.perfis fa ON ua.id = fa.id
      ORDER BY t.data_inicio DESC
    `;

    const result = await pool.query(query);
    res.json({ turmas: result.rows });
  } catch (err) {
    console.error('Erro ao listar turmas:', err);
    res.status(500).json({ error: 'Erro ao listar turmas' });
  }
});

// Obter detalhes de uma turma específica
app.get('/api/turmas/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const turmaQuery = `
      SELECT t.*,
             p.nome as processo_nome,
             c.nome as centro_nome,
             cat.nome as categoria_nome,
             fp.nome_completo as formador_principal_nome,
             fa.nome_completo as formador_auxiliar_nome
      FROM public.turmas_formacao t
      LEFT JOIN public.processos_eleitorais p ON t.processo_id = p.id
      LEFT JOIN public.centros_formacao c ON t.centro_id = c.id
      LEFT JOIN public.categorias_cargo cat ON t.categoria_id = cat.id
      LEFT JOIN public.utilizadores up ON t.formador_principal_id = up.id
      LEFT JOIN public.perfis fp ON up.id = fp.id
      LEFT JOIN public.utilizadores ua ON t.formador_auxiliar_id = ua.id
      LEFT JOIN public.perfis fa ON ua.id = fa.id
      WHERE t.id = $1
    `;

    const formandosQuery = `
      SELECT ft.*,
             c.id as candidatura_id,
             pf.nome_completo,
             pf.contacto_principal,
             ca.estado_geral as candidatura_estado
      FROM public.formandos_turma ft
      LEFT JOIN public.candidaturas c ON ft.candidatura_id = c.id
      LEFT JOIN public.utilizadores u ON c.utilizador_id = u.id
      LEFT JOIN public.perfis pf ON u.id = pf.id
      LEFT JOIN public.candidaturas ca ON ft.candidatura_id = ca.id
      WHERE ft.turma_id = $1
      ORDER BY pf.nome_completo
    `;

    const [turmaResult, formandosResult] = await Promise.all([
      pool.query(turmaQuery, [id]),
      pool.query(formandosQuery, [id])
    ]);

    if (turmaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    res.json({
      turma: turmaResult.rows[0],
      formandos: formandosResult.rows
    });
  } catch (err) {
    console.error('Erro ao obter detalhes da turma:', err);
    res.status(500).json({ error: 'Erro ao obter detalhes da turma' });
  }
});

// Criar turma
app.post('/api/turmas', async (req, res) => {
  try {
    const {
      processo_id,
      centro_id,
      nome,
      codigo,
      categoria_id,
      data_inicio,
      data_fim,
      horario,
      capacidade_maxima,
      formador_principal_id,
      formador_auxiliar_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO public.turmas_formacao 
       (processo_id, centro_id, nome, codigo, categoria_id, data_inicio, data_fim, horario, capacidade_maxima, formador_principal_id, formador_auxiliar_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [processo_id, centro_id, nome, codigo, categoria_id, data_inicio, data_fim, horario, capacidade_maxima, formador_principal_id, formador_auxiliar_id]
    );

    res.json({ success: true, turma: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar turma:', err);
    res.status(500).json({ error: 'Erro ao criar turma' });
  }
});

// Distribuir candidatos aprovados para turmas
app.post('/api/turmas/:id/distribuir-formandos', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidatura_ids } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar capacidade da turma
      const turmaRes = await client.query(
        'SELECT capacidade_maxima, vagas_preenchidas FROM public.turmas_formacao WHERE id = $1',
        [id]
      );

      if (turmaRes.rows.length === 0) {
        throw new Error('Turma não encontrada');
      }

      const turma = turmaRes.rows[0];
      const vagas_disponiveis = turma.capacidade_maxima - turma.vagas_preenchidas;

      if (candidatura_ids.length > vagas_disponiveis) {
        throw new Error(`Apenas ${vagas_disponiveis} vagas disponíveis`);
      }

      // Inserir formandos
      for (const candidatura_id of candidatura_ids) {
        await client.query(
          `INSERT INTO public.formandos_turma (turma_id, candidatura_id)
           VALUES ($1, $2)
           ON CONFLICT (turma_id, candidatura_id) DO NOTHING`,
          [id, candidatura_id]
        );
      }

      // Atualizar vagas preenchidas
      await client.query(
        'UPDATE public.turmas_formacao SET vagas_preenchidas = vagas_preenchidas + $1 WHERE id = $2',
        [candidatura_ids.length, id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `${candidatura_ids.length} formandos distribuídos com sucesso`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao distribuir formandos:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== SISTEMA DE NOTIFICAÇÕES ====================
// Listar notificações do utilizador
app.get('/api/notificacoes/:utilizador_id', async (req, res) => {
  try {
    const { utilizador_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM public.notificacoes 
       WHERE destinatario_id = $1 
       ORDER BY data_envio DESC
       LIMIT 50`,
      [utilizador_id]
    );

    res.json({ notificacoes: result.rows });
  } catch (err) {
    console.error('Erro ao listar notificações:', err);
    res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

// Marcar notificação como lida
app.post('/api/notificacoes/:id/marcar-lida', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE public.notificacoes 
       SET lida = TRUE, data_leitura = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ success: true, notificacao: result.rows[0] });
  } catch (err) {
    console.error('Erro ao marcar notificação como lida:', err);
    res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
  }
});

// ==================== DADOS DE CONFIGURAÇÃO ====================
// Endpoints para obter dados de configuração
app.get('/api/config/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.categorias_cargo ORDER BY nome');
    res.json({ categorias: result.rows });
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

app.get('/api/config/provincias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.provincias ORDER BY nome');
    res.json({ provincias: result.rows });
  } catch (err) {
    console.error('Erro ao listar províncias:', err);
    res.status(500).json({ error: 'Erro ao listar províncias' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`SISTEMA STAE SOFALA 2026 - API ACTIVA NA PORTA ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
