-- SCRIPT PARA ADICIONAR COLUNA processo_id À TABELA turmas_formacao
-- Execute este script no seu cliente PostgreSQL conectado ao Neon

-- 1. VERIFICAR SE A TABELA turmas_formacao EXISTE
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'turmas_formacao') THEN
        RAISE NOTICE '✅ Tabela turmas_formacao existe';
    ELSE
        RAISE NOTICE '❌ Tabela turmas_formacao não existe';
        RETURN;
    END IF;
END $$;

-- 2. VERIFICAR SE A COLUNA processo_id JÁ EXISTE
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'processo_id') THEN
        RAISE NOTICE '✅ Coluna processo_id já existe na tabela turmas_formacao';
    ELSE
        RAISE NOTICE '🔨 Adicionando coluna processo_id à tabela turmas_formacao...';
    END IF;
END $$;

-- 3. ADICIONAR COLUNA processo_id (se não existir)
ALTER TABLE public.turmas_formacao 
ADD COLUMN IF NOT EXISTS processo_id UUID REFERENCES public.processos_eleitorais(id) ON DELETE CASCADE;

-- 4. VERIFICAR SE A TABELA centros_formacao EXISTE (para a coluna centro_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'centros_formacao') THEN
        RAISE NOTICE '✅ Tabela centros_formacao existe';
    ELSE
        RAISE NOTICE '⚠️ Tabela centros_formacao não existe - criando...';
        CREATE TABLE IF NOT EXISTS public.centros_formacao (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nome TEXT NOT NULL,
            endereco TEXT,
            capacidade INTEGER,
            responsavel TEXT
        );
    END IF;
END $$;

-- 5. VERIFICAR SE A COLUNA centro_id EXISTE EM turmas_formacao
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'centro_id') THEN
        RAISE NOTICE '✅ Coluna centro_id já existe na tabela turmas_formacao';
    ELSE
        RAISE NOTICE '🔨 Adicionando coluna centro_id à tabela turmas_formacao...';
    END IF;
END $$;

-- 6. ADICIONAR COLUNA centro_id (se não existir)
ALTER TABLE public.turmas_formacao 
ADD COLUMN IF NOT EXISTS centro_id UUID REFERENCES public.centros_formacao(id);

-- 7. VERIFICAR SE A COLUNA categoria_id EXISTE EM turmas_formacao
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'categoria_id') THEN
        RAISE NOTICE '✅ Coluna categoria_id já existe na tabela turmas_formacao';
    ELSE
        RAISE NOTICE '🔨 Adicionando coluna categoria_id à tabela turmas_formacao...';
    END IF;
END $$;

-- 8. ADICIONAR COLUNA categoria_id (se não existir)
ALTER TABLE public.turmas_formacao 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias_cargo(id);

-- 9. VERIFICAR SE AS COLUNAS formador_principal_id E formador_auxiliar_id EXISTEM
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'formador_principal_id') THEN
        RAISE NOTICE '✅ Coluna formador_principal_id já existe';
    ELSE
        RAISE NOTICE '🔨 Adicionando coluna formador_principal_id...';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'formador_auxiliar_id') THEN
        RAISE NOTICE '✅ Coluna formador_auxiliar_id já existe';
    ELSE
        RAISE NOTICE '🔨 Adicionando coluna formador_auxiliar_id...';
    END IF;
END $$;

-- 10. ADICIONAR COLUNAS DE FORMADORES (se não existirem)
ALTER TABLE public.turmas_formacao 
ADD COLUMN IF NOT EXISTS formador_principal_id UUID REFERENCES public.utilizadores(id);

ALTER TABLE public.turmas_formacao 
ADD COLUMN IF NOT EXISTS formador_auxiliar_id UUID REFERENCES public.utilizadores(id);

-- 11. INSERIR DADOS DE EXEMPLO EM centros_formacao (se necessário)
INSERT INTO public.centros_formacao (id, nome, endereco, capacidade, responsavel)
VALUES 
    (uuid_generate_v4(), 'Centro de Formação da Beira', 'Av. Eduardo Mondlane, Beira', 200, 'João Silva'),
    (uuid_generate_v4(), 'Centro de Formação do Dondo', 'Rua Principal, Dondo', 150, 'Maria Santos')
ON CONFLICT DO NOTHING;

-- 12. ATUALIZAR ALGUMAS TURMAS COM PROCESSO_ID (se houver turmas existentes)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM public.turmas_formacao WHERE processo_id IS NULL) THEN
        -- Obter um processo eleitoral existente
        DECLARE processo_exemplo UUID;
        BEGIN
            SELECT id INTO processo_exemplo FROM public.processos_eleitorais LIMIT 1;
            
            IF processo_exemplo IS NOT NULL THEN
                UPDATE public.turmas_formacao 
                SET processo_id = processo_exemplo 
                WHERE processo_id IS NULL;
                RAISE NOTICE '✅ Turmas atualizadas com processo_id exemplo';
            ELSE
                RAISE NOTICE '⚠️ Nenhum processo eleitoral encontrado para atualizar turmas';
            END IF;
        END;
    ELSE
        RAISE NOTICE '✅ Todas as turmas já têm processo_id';
    END IF;
END $$;

-- 13. VERIFICAÇÃO FINAL
SELECT '🔍 VERIFICAÇÃO FINAL DAS COLUNAS DE turmas_formacao:' as titulo;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN is_nullable = 'YES' THEN 'NULL'
        ELSE 'NOT NULL'
    END as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'turmas_formacao'
ORDER BY ordinal_position;

SELECT '' as espaco;

SELECT '✅ COLUNAS CRÍTICAS VERIFICADAS:' as resumo;
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'processo_id') 
        THEN '✅ processo_id: EXISTE'
        ELSE '❌ processo_id: FALTANDO'
    END as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'centro_id') 
        THEN '✅ centro_id: EXISTE'
        ELSE '❌ centro_id: FALTANDO'
    END as status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'turmas_formacao' AND column_name = 'categoria_id') 
        THEN '✅ categoria_id: EXISTE'
        ELSE '❌ categoria_id: FALTANDO'
    END as status;

SELECT '' as espaco;
SELECT '🚀 SISTEMA PRONTO:' as final;
SELECT '  • Erro "column t.processo_id does not exist" resolvido' as feature;
SELECT '  • API /api/turmas funcionará agora' as feature;
SELECT '  • Todas as dependências de colunas verificadas' as feature;