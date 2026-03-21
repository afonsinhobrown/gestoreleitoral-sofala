-- SISTEMA DE GESTÃO INTEGRADO STAE (NACIONAL)
-- Projecto Afonso & Gilberto Machava (Moçambique 2024-2026)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Estrutura Hierárquica de Moçambique
CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE(province_id, name)
);

-- 2. Utilizadores e Perfis (Hierarquia Administrativa)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('candidato', 'administrador_distrital', 'administrador_provincial', 'master_nacional')) DEFAULT 'candidato',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    nuit TEXT UNIQUE,
    contact_number TEXT,
    photo_url TEXT,
    qr_code_data TEXT UNIQUE,
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id)
);

-- 3. Eventos e Candidaturas
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Formador, Brigadista, MMV, etc.
    province_id UUID REFERENCES public.provinces(id),
    district_id UUID REFERENCES public.districts(id),
    status TEXT DEFAULT 'pendente',
    current_phase TEXT DEFAULT 'concurso',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Formação e Afectação Final
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: Turma A, Brigada 001
    type TEXT NOT NULL, -- formação, afectação
    location TEXT NOT NULL,
    district_id UUID REFERENCES public.districts(id)
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    assigned_role TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
