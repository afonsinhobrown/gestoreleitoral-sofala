-- SISTEMA COMPLETO DE GESTÃO ELEITORAL STAE SOFALA 2026
-- Esquema redesenhado para suportar todas as funcionalidades

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ESTRUTURA GEOGRÁFICA
CREATE TABLE IF NOT EXISTS public.provincias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    codigo TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS public.distritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provincia_id UUID REFERENCES public.provincias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    codigo TEXT,
    UNIQUE(provincia_id, nome)
);

CREATE TABLE IF NOT EXISTS public.postos_administrativos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distrito_id UUID REFERENCES public.distritos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    UNIQUE(distrito_id, nome)
);

CREATE TABLE IF NOT EXISTS public.localidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posto_id UUID REFERENCES public.postos_administrativos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    UNIQUE(posto_id, nome)
);

-- 2. UTILIZADORES E PERFIS
CREATE TABLE IF NOT EXISTS public.utilizadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('candidato', 'formador', 'administrador_distrital', 'administrador_provincial', 'master_nacional')) DEFAULT 'candidato',
    estado TEXT DEFAULT 'activo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE PRIMARY KEY,
    nome_completo TEXT NOT NULL,
    nuit TEXT UNIQUE,
    bi_numero TEXT UNIQUE,
    genero TEXT CHECK (genero IN ('Masculino', 'Feminino')),
    data_nascimento DATE,
    contacto_principal TEXT,
    contacto_alternativo TEXT,
    provincia_id UUID REFERENCES public.provincias(id),
    distrito_id UUID REFERENCES public.distritos(id),
    posto_id UUID REFERENCES public.postos_administrativos(id),
    localidade_id UUID REFERENCES public.localidades(id),
    foto_url TEXT,
    qr_code TEXT UNIQUE
);

-- 3. PROCESSO ELEITORAL E CANDIDATURAS
CREATE TABLE IF NOT EXISTS public.processos_eleitorais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    ano INTEGER NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    data_fim DATE,
    estado TEXT DEFAULT 'planeamento'
);

CREATE TABLE IF NOT EXISTS public.categorias_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE, -- MMV, Brigadista, Formador, Supervisor
    descricao TEXT,
    requisitos TEXT
);

CREATE TABLE IF NOT EXISTS public.candidaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE,
    utilizador_id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES public.categorias_cargo(id),
    provincia_actuacao_id UUID REFERENCES public.provincias(id),
    distrito_actuacao_id UUID REFERENCES public.distritos(id),
    posto_actuacao_id UUID REFERENCES public.postos_administrativos(id),
    localidade_actuacao_id UUID REFERENCES public.localidades(id),
    
    -- Fases do processo
    fase_atual TEXT DEFAULT 'registro', -- registro, documentacao, avaliacao, formacao, afectacao
    estado_geral TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado, em_avaliacao
    
    -- Avaliação da documentação
    documento_bi_url TEXT,
    documento_bi_estado TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado
    documento_certificado_url TEXT,
    documento_certificado_estado TEXT DEFAULT 'pendente',
    documento_outros_url TEXT,
    
    -- Critérios de avaliação documental
    criterio_validade_bi INTEGER DEFAULT 0, -- 0-10
    criterio_validade_certificado INTEGER DEFAULT 0, -- 0-10
    criterio_legibilidade INTEGER DEFAULT 0, -- 0-10
    criterio_completude INTEGER DEFAULT 0, -- 0-10
    criterio_autenticidade INTEGER DEFAULT 0, -- 0-10
    pontuacao_documentacao INTEGER DEFAULT 0, -- 0-100
    motivo_reprovacao TEXT,
    
    -- Entrevista (não obrigatória)
    entrevista_realizada BOOLEAN DEFAULT FALSE,
    data_entrevista TIMESTAMP WITH TIME ZONE,
    entrevistador_id UUID REFERENCES public.utilizadores(id),
    pontuacao_entrevista INTEGER DEFAULT 0, -- 0-100
    observacoes_entrevista TEXT,
    
    -- Critérios de avaliação na entrevista
    criterio_comunicacao INTEGER DEFAULT 0, -- 0-10
    criterio_conhecimento INTEGER DEFAULT 0, -- 0-10
    criterio_atitude INTEGER DEFAULT 0, -- 0-10
    criterio_experiencia INTEGER DEFAULT 0, -- 0-10
    criterio_motivacao INTEGER DEFAULT 0, -- 0-10
    
    -- Avaliação final
    pontuacao_final INTEGER DEFAULT 0, -- 0-100 (média ponderada)
    resultado_final TEXT DEFAULT 'pendente', -- pendente, aprovado, reprovado, em_entrevista
    recomendacoes TEXT,
    
    observacoes TEXT,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. GESTÃO DE FORMAÇÃO
CREATE TABLE IF NOT EXISTS public.centros_formacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    provincia_id UUID REFERENCES public.provincias(id),
    distrito_id UUID REFERENCES public.distritos(id),
    endereco TEXT,
    capacidade INTEGER
);

CREATE TABLE IF NOT EXISTS public.turmas_formacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE,
    centro_id UUID REFERENCES public.centros_formacao(id),
    nome TEXT NOT NULL,
    codigo TEXT UNIQUE,
    categoria_id UUID REFERENCES public.categorias_cargo(id),
    
    data_inicio DATE,
    data_fim DATE,
    horario TEXT,
    
    capacidade_maxima INTEGER,
    vagas_preenchidas INTEGER DEFAULT 0,
    
    formador_principal_id UUID REFERENCES public.utilizadores(id),
    formador_auxiliar_id UUID REFERENCES public.utilizadores(id),
    
    estado TEXT DEFAULT 'planeada' -- planeada, em_andamento, concluida, cancelada
);

CREATE TABLE IF NOT EXISTS public.formandos_turma (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID REFERENCES public.turmas_formacao(id) ON DELETE CASCADE,
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    
    data_inscricao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado TEXT DEFAULT 'inscrito', -- inscrito, presente, ausente, desistente
    
    -- Avaliação na formação
    presencas INTEGER DEFAULT 0,
    faltas INTEGER DEFAULT 0,
    nota_final DECIMAL(5,2),
    resultado_formacao TEXT, -- aprovado, reprovado, recuperacao
    
    observacoes TEXT,
    UNIQUE(turma_id, candidatura_id)
);

CREATE TABLE IF NOT EXISTS public.pautas_formacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turma_id UUID REFERENCES public.turmas_formacao(id) ON DELETE CASCADE,
    formando_id UUID REFERENCES public.formandos_turma(id) ON DELETE CASCADE,
    
    modulo TEXT,
    nota DECIMAL(5,2),
    observacoes TEXT,
    
    avaliado_por UUID REFERENCES public.utilizadores(id),
    data_avaliacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SISTEMA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id UUID REFERENCES public.utilizadores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- candidatura, formacao, geral, alerta
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    
    -- Metadados da notificação
    processo_id UUID REFERENCES public.processos_eleitorais(id),
    candidatura_id UUID REFERENCES public.candidaturas(id),
    turma_id UUID REFERENCES public.turmas_formacao(id),
    
    lida BOOLEAN DEFAULT FALSE,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP WITH TIME ZONE
);

-- 6. LOGS E AUDITORIA
CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utilizador_id UUID REFERENCES public.utilizadores(id),
    acao TEXT NOT NULL,
    entidade TEXT,
    entidade_id UUID,
    detalhes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES PARA MELHOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_candidaturas_estado ON public.candidaturas(estado_geral);
CREATE INDEX IF NOT EXISTS idx_candidaturas_fase ON public.candidaturas(fase_atual);
CREATE INDEX IF NOT EXISTS idx_candidaturas_processo ON public.candidaturas(processo_id);
CREATE INDEX IF NOT EXISTS idx_formandos_turma ON public.formandos_turma(turma_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_turmas_estado ON public.turmas_formacao(estado);
CREATE INDEX IF NOT EXISTS idx_logs_data ON public.logs_sistema(criado_em);

-- 7. GESTÃO DE UNIDADES OPERACIONAIS (BRIGADAS, MMVs, AGENTES)
CREATE TABLE IF NOT EXISTS public.modelos_equipa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('brigada', 'agente', 'mmv')),
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
    status_logistico TEXT DEFAULT 'completo', -- completo, alerta_deficit
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nome, modelo_id)
);

CREATE TABLE IF NOT EXISTS public.unidade_membros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES public.unidades_operacionais(id) ON DELETE CASCADE,
    funcao_id UUID REFERENCES public.funcoes_modelo(id) ON DELETE CASCADE,
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE SET NULL,
    UNIQUE(unidade_id, funcao_id)
);

CREATE INDEX IF NOT EXISTS idx_unidades_modelo ON public.unidades_operacionais(modelo_id);
CREATE INDEX IF NOT EXISTS idx_membros_unidade ON public.unidade_membros(unidade_id);

-- DADOS DE CONFIGURAÇÃO INICIAL
INSERT INTO public.categorias_cargo (nome, descricao) VALUES 
('MMV', 'Membro de Mesa de Voto'),
('Brigadista', 'Brigadista de Recenseamento'),
('Formador', 'Formador de MMVs e Brigadistas'),
('Supervisor', 'Supervisor de Processo Eleitoral')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.provincias (nome, codigo) VALUES 
('Sofala', 'SOF')
ON CONFLICT (nome) DO NOTHING;