const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { pool } = require('./db-neon-fixed');

const app = express();
app.use(cors());
app.use(express.json());

// Migração Automática e Seed de Usuários Administrativos
(async () => {
  if (!pool) {
      console.error('❌ Pool do banco de dados não disponível para migração.');
      return;
  }
  const client = await pool.connect();
  try {
    console.log('🔄 Verificando integridade das tabelas e usuários...');
    // Tabelas...
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.modelos_equipa (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          nome TEXT NOT NULL,
          processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE,
          tipo TEXT NOT NULL,
          num_membros INTEGER NOT NULL,
          observacoes TEXT,
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS public.funcoes_modelo (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          modelo_id UUID REFERENCES public.modelos_equipa(id) ON DELETE CASCADE,
          cargo TEXT NOT NULL,
          objetivo TEXT,
          UNIQUE(modelo_id, cargo)
      );
      CREATE TABLE IF NOT EXISTS public.unidades_operacionais (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          nome TEXT NOT NULL,
          modelo_id UUID REFERENCES public.modelos_equipa(id) ON DELETE CASCADE,
          localizacao TEXT,
          status_logistico TEXT DEFAULT 'completo',
          criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS public.unidade_membros (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          unidade_id UUID REFERENCES public.unidades_operacionais(id) ON DELETE CASCADE,
          funcao_id UUID REFERENCES public.funcoes_modelo(id) ON DELETE CASCADE,
          candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE SET NULL,
          UNIQUE(unidade_id, funcao_id)
      );
    `);

    // --- SEED DE USUÁRIOS ADMINISTRATIVOS ---
    await client.query('BEGIN');
    
    // 1. Central
    const centralPass = bcrypt.hashSync('central123', 10);
    const existingCentral = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', ['central']);
    if (existingCentral.rows.length === 0) {
      const res = await client.query('INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', ['central', centralPass, 'master_nacional']);
      await client.query('INSERT INTO public.perfis (id, nome_completo) VALUES ($1, $2)', [res.rows[0].id, 'Administrador Central']);
      console.log('✅ Usuário CENTRAL criado');
    }

    // 2. Provinciais
    const provincias = await client.query('SELECT * FROM public.provincias');
    for (const prov of provincias.rows) {
      const email = prov.nome.toLowerCase().replace(/\s+/g, '');
      const pass = email + '123';
      const hash = bcrypt.hashSync(pass, 10);
      const exists = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', [email]);
      
      if (exists.rows.length === 0) {
        const res = await client.query('INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [email, hash, 'administrador_provincial']);
        await client.query('INSERT INTO public.perfis (id, nome_completo, provincia_id) VALUES ($1, $2, $3)', [res.rows[0].id, `Admin Provincial ${prov.nome}`, prov.id]);
      } else {
        await client.query('UPDATE public.utilizadores SET password_hash = $1 WHERE email = $2', [hash, email]);
      }
    }

    // 3. Distritais
    const distritos = await client.query('SELECT * FROM public.distritos');
    for (const dist of distritos.rows) {
      const email = dist.nome.toLowerCase().replace(/\s+/g, '');
      const pass = email + '123';
      const hash = bcrypt.hashSync(pass, 10);
      const exists = await client.query('SELECT id FROM public.utilizadores WHERE email = $1', [email]);
      
      if (exists.rows.length === 0) {
        const res = await client.query('INSERT INTO public.utilizadores (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id', [email, hash, 'administrador_distrital']);
        await client.query('INSERT INTO public.perfis (id, nome_completo, distrito_id) VALUES ($1, $2, $3)', [res.rows[0].id, `Admin Distrital ${dist.nome}`, dist.id]);
      } else {
        await client.query('UPDATE public.utilizadores SET password_hash = $1 WHERE email = $2', [hash, email]);
      }
    }

    // 4. ASSOCIAÇÃO GLOBAL A SOFALA E CIDADE DA BEIRA (TODOS OS DADOS NULL)
    console.log('🔄 Sincronizando dados sem localização com Sofala/Beira...');
    const sofalaRow = await client.query("SELECT id FROM public.provincias WHERE nome ILIKE '%sofala%' LIMIT 1");
    const beiraRow = await client.query("SELECT id FROM public.distritos WHERE nome ILIKE '%beira%' LIMIT 1");

    if (sofalaRow.rows.length > 0 && beiraRow.rows.length > 0) {
      const sofalaId = sofalaRow.rows[0].id;
      const beiraId = beiraRow.rows[0].id;
      console.log(`   Sofala ID: ${sofalaId}`);
      console.log(`   Beira  ID: ${beiraId}`);

      // Candidaturas (campos de actuação)
      const r1 = await client.query(
        `UPDATE public.candidaturas SET provincia_actuacao_id = $1, distrito_actuacao_id = $2
         WHERE provincia_actuacao_id IS NULL OR distrito_actuacao_id IS NULL`,
        [sofalaId, beiraId]
      );
      console.log(`   ✅ ${r1.rowCount} candidaturas actualizadas`);

      // Centros de formação
      const r2 = await client.query(
        `UPDATE public.centros_formacao SET provincia_id = $1, distrito_id = $2
         WHERE provincia_id IS NULL OR distrito_id IS NULL`,
        [sofalaId, beiraId]
      );
      console.log(`   ✅ ${r2.rowCount} centros de formação actualizados`);

      // Perfis de TODOS os utilizadores sem localização
      const r3 = await client.query(
        `UPDATE public.perfis SET provincia_id = $1, distrito_id = $2
         WHERE (provincia_id IS NULL OR distrito_id IS NULL)
           AND id IN (SELECT id FROM public.utilizadores WHERE role != 'master_nacional')`,
        [sofalaId, beiraId]
      );
      console.log(`   ✅ ${r3.rowCount} perfis actualizados`);
    } else {
      console.warn('⚠️  Sofala ou Beira não encontrados nas tabelas geográficas!');
    }

    await client.query('COMMIT');
    console.log('✅ Inicialização completa!');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ Erro na inicialização:', err.message);
  } finally {
    client.release();
  }
})();

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

// Helper para validar UUID
const isUUID = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
      'SELECT u.*, p.nome_completo, p.provincia_id, p.distrito_id FROM public.utilizadores u LEFT JOIN public.perfis p ON u.id = p.id WHERE u.email = $1',
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
        nome_completo: user.nome_completo,
        provincia_id: user.provincia_id,
        distrito_id: user.distrito_id
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
             c.distrito_actuacao_id as distrito_id,
             c.provincia_actuacao_id as provincia_id,
             p.nome as processo_nome,
             cat.nome as categoria_nome,
             COALESCE(c.email, u.email) as email,
             COALESCE(c.nome_completo, pf.nome_completo) as nome_completo
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
             COALESCE(c.email, u.email) as email,
             COALESCE(c.nome_completo, pf.nome_completo) as nome_completo,
             COALESCE(c.telefone, pf.contacto_principal) as contacto_principal,
             COALESCE(c.nuit, pf.nuit) as nuit,
             COALESCE(c.bi_numero, pf.bi_numero) as bi_numero,
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

// Criar nova candidatura com documentos (Registro de Candidatura)
app.post('/api/candidaturas/completa', upload.fields([
  { name: 'documento_bi', maxCount: 1 },
  { name: 'documento_certificado', maxCount: 1 }
]), async (req, res) => {
  try {
    let {
      utilizador_id,
      processo_id,
      categoria_id,
      provincia_actuacao_id,
      distrito_actuacao_id,
      posto_actuacao_id,
      localidade_actuacao_id,
      observacoes,
      nome_completo,
      nuit,
      bi_numero,
      genero,
      data_nascimento,
      contacto_principal,
      email,
      primeiro_nome,
      apelido,
      provincia_id,
      distrito_id,
      posto_id,
      localidade_id
    } = req.body;

    const prov_id_final = provincia_actuacao_id || provincia_id;
    const dist_id_final = distrito_actuacao_id || distrito_id;
    const post_id_final = posto_actuacao_id || posto_id;
    const loc_id_final = localidade_actuacao_id || localidade_id;

    const files = req.files;
    let documento_bi_url = null;
    let documento_certificado_url = null;

    if (files && files.documento_bi) {
      documento_bi_url = `/uploads/${files.documento_bi[0].filename}`;
    }
    if (files && files.documento_certificado) {
      documento_certificado_url = `/uploads/${files.documento_certificado[0].filename}`;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Validar Obrigatórios
      if (!nome_completo && primeiro_nome && apelido) {
        nome_completo = `${primeiro_nome} ${apelido}`;
      }
      
      if (!nome_completo || (!nuit && !bi_numero)) {
        return res.status(400).json({ error: 'Nome e Documento (NUIT ou BI) são obrigatórios para a candidatura.' });
      }

      // Obter processo eleitoral automaticamente se não fornecido
      if (!isUUID(processo_id)) {
        const procResult = await client.query("SELECT id FROM public.processos_eleitorais WHERE estado = 'activo' LIMIT 1");
        if (procResult.rows.length > 0) {
          processo_id = procResult.rows[0].id;
        } else {
          const recResult = await client.query("SELECT id FROM public.processos_eleitorais ORDER BY ano DESC LIMIT 1");
          if (recResult.rows.length > 0) {
            processo_id = recResult.rows[0].id;
          } else {
            return res.status(400).json({ error: 'Nenhum processo eleitoral encontrado para associação automática.' });
          }
        }
      }

      if (!isUUID(categoria_id)) return res.status(400).json({ error: 'ID da categoria é obrigatório.' });

      // Inserir Candidatura Direta (Desacoplada de utilizadores para candidatos)
      const result = await client.query(
        `INSERT INTO public.candidaturas
         (nome_completo, primeiro_nome, apelido, nuit, bi_numero, telefone, email, genero,
          processo_id, categoria_id, provincia_actuacao_id, distrito_actuacao_id,
          posto_actuacao_id, localidade_actuacao_id, documento_bi_url, documento_certificado_url,
          observacoes, fase_atual, estado_geral)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [
          nome_completo,
          primeiro_nome || null,
          apelido || null,
          nuit || null,
          bi_numero || null,
          contacto_principal || null,
          email || null,
          genero || null,
          processo_id, 
          categoria_id, 
          isUUID(prov_id_final) ? prov_id_final : null, 
          isUUID(dist_id_final) ? dist_id_final : null,
          isUUID(post_id_final) ? post_id_final : null, 
          isUUID(loc_id_final) ? loc_id_final : null, 
          documento_bi_url, 
          documento_certificado_url,
          observacoes || '', 
          'documentacao', 
          'pendente'
        ]
      );

      await client.query('COMMIT');
      res.json({ success: true, candidatura: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro na candidatura:', err.message);
    res.status(500).json({ error: err.message });
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
    let resultado_final = 'pendente';

    if (documento_bi_estado === 'aprovado' && documento_certificado_estado === 'aprovado') {
      if (pontuacao_final >= 60) {
        estado_geral = 'aprovado';
        resultado_final = 'aprovado_documentacao';
      } else {
        estado_geral = 'reprovado';
        resultado_final = 'reprovado_documentacao';
      }
    } else if (documento_bi_estado === 'reprovado' || documento_certificado_estado === 'reprovado') {
      estado_geral = 'reprovado';
      resultado_final = 'reprovado_documentacao';
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
           observacoes = COALESCE($10, observacoes),
           resultado_final = $11,
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
        resultado_final,
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

// Avaliar entrevista do candidato (não obrigatória)
app.post('/api/candidaturas/:id/avaliar-entrevista', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      entrevista_realizada,
      data_entrevista,
      entrevistador_id,
      pontuacao_entrevista,
      observacoes_entrevista,
      criterio_comunicacao,
      criterio_conhecimento,
      criterio_atitude,
      criterio_experiencia,
      criterio_motivacao,
      recomendacoes
    } = req.body;

    // Se a entrevista não foi realizada, apenas atualizar o campo
    if (!entrevista_realizada) {
      const result = await pool.query(
        `UPDATE public.candidaturas
         SET entrevista_realizada = false,
             observacoes_entrevista = COALESCE($1, observacoes_entrevista),
             actualizado_em = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [observacoes_entrevista, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Candidatura não encontrada' });
      }

      return res.json({
        success: true,
        candidatura: result.rows[0],
        message: 'Entrevista marcada como não realizada'
      });
    }

    // Calcular pontuação total se não fornecida
    let pontuacao_final_entrevista = pontuacao_entrevista;
    if (!pontuacao_final_entrevista && criterio_comunicacao !== undefined) {
      pontuacao_final_entrevista = (
        (criterio_comunicacao || 0) +
        (criterio_conhecimento || 0) +
        (criterio_atitude || 0) +
        (criterio_experiencia || 0) +
        (criterio_motivacao || 0)
      ) * 2; // Escala de 0-100
    }

    // Calcular pontuação final combinada (documentação + entrevista)
    const candidaturaResult = await pool.query(
      'SELECT pontuacao_documentacao FROM public.candidaturas WHERE id = $1',
      [id]
    );

    if (candidaturaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    const pontuacao_documentacao = candidaturaResult.rows[0].pontuacao_documentacao || 0;
    const pontuacao_final_total = Math.round(
      (pontuacao_documentacao * 0.6) + (pontuacao_final_entrevista * 0.4)
    );

    // Determinar resultado final
    let resultado_final = 'pendente';
    let estado_geral = 'em_avaliacao';

    if (pontuacao_final_total >= 60) {
      resultado_final = 'aprovado_final';
      estado_geral = 'aprovado';
    } else {
      resultado_final = 'reprovado_final';
      estado_geral = 'reprovado';
    }

    const result = await pool.query(
      `UPDATE public.candidaturas
       SET entrevista_realizada = true,
           data_entrevista = COALESCE($1, CURRENT_TIMESTAMP),
           entrevistador_id = $2,
           pontuacao_entrevista = $3,
           observacoes_entrevista = $4,
           criterio_comunicacao = $5,
           criterio_conhecimento = $6,
           criterio_atitude = $7,
           criterio_experiencia = $8,
           criterio_motivacao = $9,
           recomendacoes = $10,
           pontuacao_final = $11,
           resultado_final = $12,
           estado_geral = $13,
           fase_atual = 'avaliacao',
           actualizado_em = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING *`,
      [
        data_entrevista,
        entrevistador_id,
        pontuacao_final_entrevista,
        observacoes_entrevista,
        criterio_comunicacao,
        criterio_conhecimento,
        criterio_atitude,
        criterio_experiencia,
        criterio_motivacao,
        recomendacoes,
        pontuacao_final_total,
        resultado_final,
        estado_geral,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura não encontrada' });
    }

    // Criar notificação para o candidato
    const candidatura = result.rows[0];
    const titulo = estado_geral === 'aprovado'
      ? 'Entrevista Realizada - Candidatura Aprovada'
      : 'Entrevista Realizada - Candidatura Reprovada';

    const mensagem = estado_geral === 'aprovado'
      ? `Sua entrevista foi realizada com sucesso. Pontuação final: ${pontuacao_final_total}/100. Parabéns, você foi aprovado!`
      : `Sua entrevista foi realizada. Pontuação final: ${pontuacao_final_total}/100. Infelizmente, você não foi aprovado.`;

    await pool.query(
      `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, candidatura_id)
       VALUES ($1, 'candidatura', $2, $3, $4)`,
      [candidatura.utilizador_id, titulo, mensagem, id]
    );

    res.json({
      success: true,
      candidatura: result.rows[0],
      pontuacao_entrevista: pontuacao_final_entrevista,
      pontuacao_final: pontuacao_final_total,
      message: 'Entrevista avaliada com sucesso'
    });
  } catch (err) {
    console.error('Erro ao avaliar entrevista:', err);
    res.status(500).json({ error: 'Erro ao avaliar entrevista' });
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
             c.provincia_id as provincia_id,
             c.distrito_id as distrito_id,
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
    let {
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

    if (!isUUID(processo_id)) {
      const procResult = await pool.query("SELECT id FROM public.processos_eleitorais WHERE estado = 'activo' LIMIT 1");
      if (procResult.rows.length > 0) {
        processo_id = procResult.rows[0].id;
      } else {
        const recResult = await pool.query("SELECT id FROM public.processos_eleitorais ORDER BY ano DESC LIMIT 1");
        if (recResult.rows.length > 0) {
          processo_id = recResult.rows[0].id;
        } else {
          return res.status(400).json({ error: 'Nenhum processo eleitoral encontrado para associação automática.' });
        }
      }
    }

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

// Avaliar formandos e gerar pauta (Com envio de notificação/SMS)
app.post('/api/turmas/:id/pauta', async (req, res) => {
  try {
    const { id } = req.params;
    const { avaliacoes, avaliador_id } = req.body; 
    // avaliacoes: array of { formando_id, presencas, faltas, nota_final, observacoes }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const avaliacao of avaliacoes) {
        const { formando_id, presencas, faltas, nota_final, observacoes } = avaliacao;
        const resultado_formacao = nota_final >= 10 ? 'aprovado' : 'reprovado';

        // 1. Atualizar resultado em formandos_turma
        await client.query(
          `UPDATE public.formandos_turma 
           SET presencas = $1, faltas = $2, nota_final = $3, resultado_formacao = $4, observacoes = $5 
           WHERE id = $6 AND turma_id = $7`,
          [presencas || 0, faltas || 0, nota_final || 0, resultado_formacao, observacoes || '', formando_id, id]
        );

        // 2. Inserir na pauta (Opcional, mas de acordo com schema)
        await client.query(
          `INSERT INTO public.pautas_formacao (turma_id, formando_id, modulo, nota, observacoes, avaliado_por)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, formando_id, 'Avaliação Geral', nota_final || 0, observacoes || '', avaliador_id || null]
        );

        // 3. Buscar utilizador e candidatura do formando para enviar notificação (SMS e notificação) e atualizar candidatura
        const candRes = await client.query(
          `SELECT c.id as candidatura_id, c.utilizador_id 
           FROM public.formandos_turma ft 
           JOIN public.candidaturas c ON ft.candidatura_id = c.id 
           WHERE ft.id = $1`,
          [formando_id]
        );
        
        if (candRes.rows.length > 0) {
          const { candidatura_id, utilizador_id } = candRes.rows[0];
          
          // Atualizar estado da candidatura para reflectir resultado pós formacao/afectacao
          const novo_estado_candidatura = resultado_formacao === 'aprovado' ? 'aprovado' : 'reprovado';
          const nova_fase = 'afectacao'; // Fim de formacao = afecta o recurso
          
          await client.query(
            `UPDATE public.candidaturas 
             SET estado_geral = $1, fase_atual = $2, actualizado_em = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [novo_estado_candidatura, nova_fase, candidatura_id]
          );

          // Criar notificação estilo SMS ("o sistema deve notoficar as candidados com sms")
          const mensagem = `Pauta de Formação (STAE): ${resultado_formacao.toUpperCase()}. Nota: ${nota_final}. Observação: ${observacoes || 'N/A'}`;
          
          await client.query(
            `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, turma_id)
             VALUES ($1, 'formacao', 'Pauta Formação STAE', $2, $3)`,
            [utilizador_id, mensagem, id]
          );
        }
      }

      // Marcar turma como concluida
      await client.query(`UPDATE public.turmas_formacao SET estado = 'concluida' WHERE id = $1`, [id]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Pauta salva com sucesso e notificações (SMS) enviadas.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Erro ao salvar pauta:', err);
    res.status(500).json({ error: 'Erro ao processar e salvar a pauta da turma' });
  }
});

// ==================== GESTÃO DE LOGÍSTICA (MODELOS E UNIDADES) ====================

// Listar todos os modelos de equipa (Brigada, MMV, Agentes) com suas funções
app.get('/api/logistica/modelos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, 
             json_agg(json_build_object('id', f.id, 'cargo', f.cargo, 'objetivo', f.objetivo)) as funcoes
      FROM public.modelos_equipa m
      LEFT JOIN public.funcoes_modelo f ON f.modelo_id = m.id
      GROUP BY m.id
      ORDER BY m.criado_em DESC
    `);
    res.json({ modelos: result.rows });
  } catch (err) {
    console.error('Erro ao listar modelos:', err);
    res.status(500).json({ error: 'Erro ao listar modelos de equipa' });
  }
});

// Criar novo modelo de equipa com funções
app.post('/api/logistica/modelos', async (req, res) => {
  console.log('📡 RECEBIDA REQUISIÇÃO PARA CRIAR MODELO:', req.body.nome);
  const client = await pool.connect();
  try {
    const { nome, processo_id, tipo, num_membros, observacoes, funcoes } = req.body;
    
    await client.query('BEGIN');
    
    const modelRes = await client.query(
      `INSERT INTO public.modelos_equipa (nome, processo_id, tipo, num_membros, observacoes) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nome, processo_id, tipo, num_membros, observacoes]
    );
    
    const modeloId = modelRes.rows[0].id;
    
    if (funcoes && funcoes.length > 0) {
      for (const f of funcoes) {
        await client.query(
          `INSERT INTO public.funcoes_modelo (modelo_id, cargo, objetivo) VALUES ($1, $2, $3)`,
          [modeloId, f.cargo, f.objetivo]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, id: modeloId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar modelo:', err);
    res.status(500).json({ error: 'Erro ao criar modelo de equipa' });
  } finally {
    client.release();
  }
});

// Listar unidades operacionais (Brigadas, Mesas) e seus membros
app.get('/api/logistica/unidades', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.*, m.nome as modelo_nome, m.tipo as modelo_tipo,
             json_agg(json_build_object(
               'funcao_id', um.funcao_id, 
               'candidato_id', um.candidatura_id,
               'candidato_nome', p.nome_completo,
               'cargo', fm.cargo
             )) as membros
      FROM public.unidades_operacionais u
      JOIN public.modelos_equipa m ON u.modelo_id = m.id
      LEFT JOIN public.unidade_membros um ON um.unidade_id = u.id
      LEFT JOIN public.funcoes_modelo fm ON um.funcao_id = fm.id
      LEFT JOIN public.candidaturas c ON um.candidatura_id = c.id
      LEFT JOIN public.perfis p ON c.utilizador_id = p.id
      GROUP BY u.id, m.nome, m.tipo
      ORDER BY u.criado_em DESC
    `);
    res.json({ unidades: result.rows });
  } catch (err) {
    console.error('Erro ao listar unidades:', err);
    res.status(500).json({ error: 'Erro ao listar unidades operacionais' });
  }
});

// Criar nova unidade operacional com alocação de membros
app.post('/api/logistica/unidades', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nome, modelo_id, localizacao, status_logistico, membros } = req.body;
    
    await client.query('BEGIN');
    
    const unitRes = await client.query(
      `INSERT INTO public.unidades_operacionais (nome, modelo_id, localizacao, status_logistico) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nome, modelo_id, localizacao, status_logistico]
    );
    
    const unidadeId = unitRes.rows[0].id;
    
    if (membros && membros.length > 0) {
      for (const m of membros) {
        await client.query(
          `INSERT INTO public.unidade_membros (unidade_id, funcao_id, candidatura_id) VALUES ($1, $2, $3)`,
          [unidadeId, m.funcao_id, m.candidato_id]
        );
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, id: unidadeId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar unidade:', err);
    res.status(500).json({ error: 'Erro ao criar unidade operacional' });
  } finally {
    client.release();
  }
});

// ==================== SISTEMA DE NOTIFICAÇÕES E RELATÓRIOS ====================
app.get('/api/relatorios/estatisticas', async (req, res) => {
  try {
    const totalCands = await pool.query('SELECT COUNT(*) FROM public.candidaturas');
    const aprovadosFinal = await pool.query(`SELECT COUNT(*) FROM public.candidaturas WHERE estado_geral = 'aprovado'`);
    const formandos = await pool.query('SELECT COUNT(*) FROM public.formandos_turma');
    const turmas = await pool.query('SELECT COUNT(*) FROM public.turmas_formacao');
    
    const porCategoria = await pool.query(`
      SELECT cat.nome, COUNT(c.id) as total
      FROM public.categorias_cargo cat
      LEFT JOIN public.candidaturas c ON c.categoria_id = cat.id
      GROUP BY cat.nome
    `);
    
    res.json({
       kpis: {
         total_inscritos: parseInt(totalCands.rows[0].count),
         aprovados_final: parseInt(aprovadosFinal.rows[0].count),
         formandos_alocados: parseInt(formandos.rows[0].count),
         total_turmas: parseInt(turmas.rows[0].count)
       },
       por_categoria: porCategoria.rows
    });
  } catch(err) {
    console.error('Erro nos relatorios:', err);
    res.status(500).json({ error: 'Erro interno ao gerar relatorios' });
  }
});

app.get('/api/notificacoes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, c.nome_completo as destinatario_nome, c.telefone as contacto
      FROM public.notificacoes n
      LEFT JOIN public.candidaturas c ON n.candidatura_id = c.id
      ORDER BY n.data_envio DESC 
      LIMIT 100
    `);
    res.json({ notificacoes: result.rows });
  } catch (err) {
    console.error('Erro ao listar notificacoes globais:', err);
    res.status(500).json({ error: 'Erro ao listar notificacoes globais' });
  }
});

// Envio em Lote de Notificações
app.post('/api/notificacoes/enviar-lote', async (req, res) => {
  try {
    const { titulo, mensagem, publico_alvo } = req.body;
    let query_alvo = '';
    
    // Determinar condicao baseada no publico alvo
    switch(publico_alvo) {
       case 'pendentes': query_alvo = "estado_geral = 'pendente'"; break;
       case 'aprovados': query_alvo = "estado_geral = 'aprovado'"; break;
       case 'reprovados': query_alvo = "estado_geral = 'reprovado'"; break;
       case 'alocados_formacao': query_alvo = "fase_atual = 'formacao'"; break;
       default: query_alvo = "1=1"; // todos
    }

    // Buscar utilizador_ids e candidatura_ids do publico alvo
    const resultCandidatos = await pool.query(`SELECT utilizador_id, id FROM public.candidaturas WHERE ${query_alvo}`);
    const candidatos = resultCandidatos.rows;

    if (candidatos.length === 0) {
      return res.status(400).json({ error: 'Nenhum candidato encontrado para o público-alvo selecionado.' });
    }

    let insertQuery = `INSERT INTO public.notificacoes (destinatario_id, tipo, titulo, mensagem, candidatura_id) VALUES `;
    let values = [];
    let params = [];
    
    let index = 1;
    for(let i=0; i < candidatos.length; i++) {
        // Fallback for independent candidates without userr_id
        let uid = candidatos[i].utilizador_id || null; 
        values.push(`($${index++}, 'sistema', $${index++}, $${index++}, $${index++})`);
        params.push(uid, titulo, mensagem, candidatos[i].id);
    }
    
    await pool.query(insertQuery + values.join(', '), params);

    res.json({ success: true, count: candidatos.length, message: `${candidatos.length} notificações enviadas com sucesso!` });

  } catch (err) {
    console.error('Erro no envio em lote:', err);
    res.status(500).json({ error: 'Erro ao enviar notificações em lote' });
  }
});

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

app.get('/api/config/distritos/:provinciaId', async (req, res) => {
  try {
    const { provinciaId } = req.params;
    if (!isUUID(provinciaId)) {
      return res.status(400).json({ error: 'ID de província inválido' });
    }
    const result = await pool.query('SELECT * FROM public.distritos WHERE provincia_id = $1 ORDER BY nome', [provinciaId]);
    res.json({ distritos: result.rows });
  } catch (err) {
    console.error('Erro ao listar distritos:', err);
    res.status(500).json({ error: 'Erro ao listar distritos' });
  }
});

app.get('/api/config/postos/:distritoId', async (req, res) => {
  try {
    const { distritoId } = req.params;
    if (!isUUID(distritoId)) {
      return res.status(400).json({ error: 'ID de distrito inválido' });
    }
    const result = await pool.query('SELECT * FROM public.postos_administrativos WHERE distrito_id = $1 ORDER BY nome', [distritoId]);
    res.json({ postos: result.rows });
  } catch (err) {
    console.error('Erro ao listar postos:', err);
    res.status(500).json({ error: 'Erro ao listar postos' });
  }
});

app.get('/api/config/localidades/:postoId', async (req, res) => {
  try {
    const { postoId } = req.params;
    if (!isUUID(postoId)) {
      return res.status(400).json({ error: 'ID de posto inválido' });
    }
    const result = await pool.query('SELECT * FROM public.localidades WHERE posto_id = $1 ORDER BY nome', [postoId]);
    res.json({ localidades: result.rows });
  } catch (err) {
    console.error('Erro ao listar localidades:', err);
    res.status(500).json({ error: 'Erro ao listar localidades' });
  }
});

app.get('/api/config/centros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.centros_formacao ORDER BY nome');
    res.json({ centros: result.rows });
  } catch (err) {
    console.error('Erro ao listar centros:', err);
    res.status(500).json({ error: 'Erro ao listar centros' });
  }
});

app.get('/api/config/processos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.processos_eleitorais ORDER BY ano DESC');
    res.json({ processos: result.rows });
  } catch (err) {
    console.error('Erro ao listar processos:', err);
    res.status(500).json({ error: 'Erro ao listar processos' });
  }
});

app.get('/api/config/formadores', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.nome_completo 
      FROM public.perfis p 
      JOIN public.utilizadores u ON p.id = u.id 
      WHERE u.role = 'formador' 
      ORDER BY p.nome_completo
    `);
    res.json({ formadores: result.rows });
  } catch (err) {
    console.error('Erro ao listar formadores:', err);
    res.status(500).json({ error: 'Erro ao listar formadores' });
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
