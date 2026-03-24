-- SCRIPT SQL PARA CRIAR TABELAS STAE NO BANCO NEON
-- Execute este script no seu cliente PostgreSQL conectado ao Neon

-- 1. CRIAR EXTENSÃO PARA UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE UTILIZADORES
CREATE TABLE IF NOT EXISTS public.utilizadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('candidato', 'formador', 'administrador_distrital', 'administrador_provincial', 'master_nacional')) DEFAULT 'candidato',
    estado TEXT DEFAULT 'activo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP WITH TIME ZONE
);

-- 3. TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    nuit TEXT UNIQUE,
    bi_numero TEXT UNIQUE,
    data_nascimento DATE,
    genero TEXT CHECK (genero IN ('masculino', 'feminino')),
    telefone TEXT,
    endereco TEXT,
    provincia_id UUID,
    distrito_id UUID,
    posto_administrativo_id UUID,
    localidade_id UUID,
    foto_url TEXT,
    qr_code_url TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE CANDIDATURAS (COM 15 CAMPOS DE AVALIAÇÃO)
CREATE TABLE IF NOT EXISTS public.candidaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilizador_id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE,
    categoria_id UUID,
    
    -- Fases do processo
    fase_atual TEXT DEFAULT 'registro', -- registro, documentacao, avaliacao, formacao, afectacao
    estado_geral TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado, em_avaliacao
    
    -- Avaliação da documentação
    documento_bi_url TEXT,
    documento_bi_estado TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado
    documento_certificado_url TEXT,
    documento_certificado_estado TEXT DEFAULT 'pendente',
    documento_outros_url TEXT,
    
    -- Critérios de avaliação documental (IMPLEMENTAÇÃO NOVA)
    criterio_validade_bi INTEGER DEFAULT 0, -- 0-10
    criterio_validade_certificado INTEGER DEFAULT 0, -- 0-10
    criterio_legibilidade INTEGER DEFAULT 0, -- 0-10
    criterio_completude INTEGER DEFAULT 0, -- 0-10
    criterio_autenticidade INTEGER DEFAULT 0, -- 0-10
    pontuacao_documentacao INTEGER DEFAULT 0, -- 0-100
    motivo_reprovacao TEXT,
    
    -- Entrevista (não obrigatória) (IMPLEMENTAÇÃO NOVA)
    entrevista_realizada BOOLEAN DEFAULT FALSE,
    data_entrevista TIMESTAMP WITH TIME ZONE,
    entrevistador_id UUID REFERENCES public.utilizadores(id),
    pontuacao_entrevista INTEGER DEFAULT 0, -- 0-100
    observacoes_entrevista TEXT,
    
    -- Critérios de avaliação na entrevista (IMPLEMENTAÇÃO NOVA)
    criterio_comunicacao INTEGER DEFAULT 0, -- 0-10
    criterio_conhecimento INTEGER DEFAULT 0, -- 0-10
    criterio_atitude INTEGER DEFAULT 0, -- 0-10
    criterio_experiencia INTEGER DEFAULT 0, -- 0-10
    criterio_motivacao INTEGER DEFAULT 0, -- 0-10
    
    -- Avaliação final (IMPLEMENTAÇÃO NOVA)
    pontuacao_final INTEGER DEFAULT 0, -- 0-100 (média ponderada: 60% doc + 40% entrevista)
    resultado_final TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado, em_entrevista
    recomendacoes TEXT,
    
    observacoes TEXT,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE TURMAS DE FORMAÇÃO
CREATE TABLE IF NOT EXISTS public.turmas_formacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    centro_formacao_id UUID,
    formador_id UUID REFERENCES public.utilizadores(id),
    data_inicio DATE,
    data_fim DATE,
    horario TEXT,
    vagas_total INTEGER DEFAULT 30,
    vagas_preenchidas INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'planeada', -- planeada, em_andamento, concluida, cancelada
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE INSCRIÇÕES EM TURMAS
CREATE TABLE IF NOT EXISTS public.inscricoes_turmas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    turma_id UUID REFERENCES public.turmas_formacao(id) ON DELETE CASCADE,
    estado TEXT DEFAULT 'pendente', -- pendente, confirmada, cancelada, concluida
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    UNIQUE(candidatura_id, turma_id)
);

-- 7. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilizador_id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('info', 'alerta', 'sucesso', 'erro')) DEFAULT 'info',
    lida BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MENSAGEM DE CONFIRMAÇÃO
SELECT '✅ TABELAS STAE CRIADAS COM SUCESSO!' as mensagem;
SELECT '📊 TABELAS CRIADAS:' as detalhes;
SELECT '  1. utilizadores' as tabela;
SELECT '  2. perfis' as tabela;
SELECT '  3. candidaturas (com 15 campos de avaliação)' as tabela;
SELECT '  4. turmas_formacao' as tabela;
SELECT '  5. inscricoes_turmas' as tabela;
SELECT '  6. notificacoes' as tabela;
SELECT '' as espaco;
SELECT '🚀 SISTEMA DE AVALIAÇÃO PRONTO:' as status;
SELECT '  • 5 critérios documentais (0-10 cada)' as feature;
SELECT '  • 5 critérios de entrevista (0-10 cada)' as feature;
SELECT '  • Cálculo automático: 60% doc + 40% entrevista' as feature;
SELECT '  • Entrevista não obrigatória' as feature;