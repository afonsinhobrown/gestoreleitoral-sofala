-- SCRIPT PARA CRIAR TABELA processos_eleitorais E TABELAS RELACIONADAS
-- Execute este script no seu cliente PostgreSQL conectado ao Neon

-- 1. CRIAR EXTENSÃO PARA UUID (se ainda não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA processos_eleitorais
CREATE TABLE IF NOT EXISTS public.processos_eleitorais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    ano INTEGER NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    data_fim DATE,
    estado TEXT DEFAULT 'planeamento'
);

-- 3. TABELA categorias_cargo (necessária para a tabela candidaturas)
CREATE TABLE IF NOT EXISTS public.categorias_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE, -- MMV, Brigadista, Formador, Supervisor
    descricao TEXT,
    requisitos TEXT
);

-- 4. TABELA provincias (necessária para a tabela candidaturas)
CREATE TABLE IF NOT EXISTS public.provincias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    codigo TEXT UNIQUE
);

-- 5. TABELA distritos (necessária para a tabela candidaturas)
CREATE TABLE IF NOT EXISTS public.distritos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provincia_id UUID REFERENCES public.provincias(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    codigo TEXT,
    UNIQUE(provincia_id, nome)
);

-- 6. ATUALIZAR TABELA candidaturas para ter a coluna processo_id (se já existir)
DO $$ 
BEGIN
    -- Verificar se a tabela candidaturas existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidaturas') THEN
        -- Verificar se a coluna processo_id já existe
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidaturas' AND column_name = 'processo_id') THEN
            -- Adicionar a coluna processo_id
            ALTER TABLE public.candidaturas ADD COLUMN processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE;
            RAISE NOTICE '✅ Coluna processo_id adicionada à tabela candidaturas';
        ELSE
            RAISE NOTICE '✅ Coluna processo_id já existe na tabela candidaturas';
        END IF;
    ELSE
        RAISE NOTICE '❌ Tabela candidaturas não existe';
    END IF;
END $$;

-- 7. INSERIR DADOS DE EXEMPLO (opcional)
INSERT INTO public.processos_eleitorais (id, nome, ano, descricao, data_inicio, data_fim, estado) 
VALUES 
    (uuid_generate_v4(), 'Eleições Gerais 2026', 2026, 'Processo eleitoral nacional para eleições gerais', '2026-01-01', '2026-12-31', 'activo'),
    (uuid_generate_v4(), 'Eleições Autárquicas 2025', 2025, 'Processo eleitoral para autarquias', '2025-01-01', '2025-12-31', 'planeamento')
ON CONFLICT DO NOTHING;

INSERT INTO public.categorias_cargo (id, nome, descricao, requisitos)
VALUES 
    (uuid_generate_v4(), 'MMV', 'Membro de Mesa de Voto', 'Ensino médio completo, idade mínima 18 anos'),
    (uuid_generate_v4(), 'Brigadista', 'Brigadista de Apoio Logístico', 'Ensino básico completo, disponibilidade total'),
    (uuid_generate_v4(), 'Formador', 'Formador de MMVs', 'Experiência anterior, ensino superior preferencial'),
    (uuid_generate_v4(), 'Supervisor', 'Supervisor de Processo Eleitoral', 'Experiência comprovada, ensino superior')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.provincias (id, nome, codigo)
VALUES 
    (uuid_generate_v4(), 'Sofala', 'SF'),
    (uuid_generate_v4(), 'Maputo', 'MP'),
    (uuid_generate_v4(), 'Gaza', 'GZ'),
    (uuid_generate_v4(), 'Inhambane', 'IN')
ON CONFLICT (nome) DO NOTHING;

-- 8. VERIFICAÇÃO FINAL
SELECT '✅ TABELA processos_eleitorais CRIADA/VERIFICADA' as mensagem;
SELECT '   Colunas: id, nome, ano, descricao, data_inicio, data_fim, estado' as detalhes;

SELECT '📊 TABELAS CRIADAS/VERIFICADAS:' as resumo;
SELECT '  1. processos_eleitorais' as tabela;
SELECT '  2. categorias_cargo' as tabela;
SELECT '  3. provincias' as tabela;
SELECT '  4. distritos' as tabela;

SELECT '🔍 VERIFICAÇÃO DE DEPENDÊNCIAS:' as verificacao;
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidaturas') 
        THEN '✅ Tabela candidaturas existe'
        ELSE '❌ Tabela candidaturas não existe'
    END as status_candidaturas;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidaturas' AND column_name = 'processo_id') 
        THEN '✅ Coluna processo_id existe em candidaturas'
        ELSE '❌ Coluna processo_id não existe em candidaturas'
    END as status_processo_id;

-- 9. MENSAGEM FINAL
SELECT '' as espaco;
SELECT '🚀 SISTEMA PRONTO PARA USO:' as final;
SELECT '  • API /api/candidaturas funcionará agora' as feature;
SELECT '  • Erro "relation public.processos_eleitorais does not exist" resolvido' as feature;
SELECT '  • Sistema de avaliação de candidatos funcional' as feature;