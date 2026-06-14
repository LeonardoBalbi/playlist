-- Habilita extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'moderador' CHECK (role IN ('admin', 'moderador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de músicas
CREATE TABLE IF NOT EXISTS public.musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  artista TEXT,
  categoria TEXT,
  link TEXT,
  duracao TEXT,
  visualizacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'aprovada' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  suggested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona colunas que podem faltar na tabela musicas
DO $$ BEGIN
  ALTER TABLE public.musicas
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aprovada' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
    ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Tabela de sugestões de playlists
CREATE TABLE IF NOT EXISTS public.sugestoes_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data_lista DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de músicas em sugestões de playlists
CREATE TABLE IF NOT EXISTS public.sugestao_playlist_musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sugestao_id UUID NOT NULL REFERENCES public.sugestoes_playlists(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sugestao_id, musica_id)
);

-- Tabela de listas do WhatsApp
CREATE TABLE IF NOT EXISTS public.listas_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data_lista DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de músicas em listas do WhatsApp
CREATE TABLE IF NOT EXISTS public.lista_whatsapp_musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas_whatsapp(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_id, musica_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_musicas_titulo ON public.musicas(titulo);
CREATE INDEX IF NOT EXISTS idx_musicas_status ON public.musicas(status);
CREATE INDEX IF NOT EXISTS idx_sugestoes_status ON public.sugestoes_playlists(status);
CREATE INDEX IF NOT EXISTS idx_sugestoes_created_by ON public.sugestoes_playlists(created_by);
CREATE INDEX IF NOT EXISTS idx_sugestao_musicas_sugestao ON public.sugestao_playlist_musicas(sugestao_id);
CREATE INDEX IF NOT EXISTS idx_lista_whatsapp_musicas_lista ON public.lista_whatsapp_musicas(lista_id);

-- Função para verificar se o usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Função para criar perfil automaticamente quando um novo usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'moderador', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para chamar a função quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilita Row Level Security (RLS) em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestoes_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestao_playlist_musicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_whatsapp_musicas ENABLE ROW LEVEL SECURITY;

-- Políticas para tabela profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- Políticas para tabela musicas
DROP POLICY IF EXISTS "musicas_select" ON public.musicas;
DROP POLICY IF EXISTS "musicas_insert_auth" ON public.musicas;
DROP POLICY IF EXISTS "musicas_update_admin" ON public.musicas;
DROP POLICY IF EXISTS "musicas_delete_admin" ON public.musicas;

CREATE POLICY "musicas_select" ON public.musicas
  FOR SELECT USING (status = 'aprovada' OR suggested_by = auth.uid() OR public.is_admin());

CREATE POLICY "musicas_insert_auth" ON public.musicas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "musicas_update_admin" ON public.musicas
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "musicas_delete_admin" ON public.musicas
  FOR DELETE USING (public.is_admin());

-- Políticas para tabela sugestoes_playlists
DROP POLICY IF EXISTS "sugestoes_select" ON public.sugestoes_playlists;
DROP POLICY IF EXISTS "sugestoes_insert_own" ON public.sugestoes_playlists;
DROP POLICY IF EXISTS "sugestoes_update_admin" ON public.sugestoes_playlists;
DROP POLICY IF EXISTS "sugestoes_delete_owner_admin" ON public.sugestoes_playlists;

CREATE POLICY "sugestoes_select" ON public.sugestoes_playlists
  FOR SELECT USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "sugestoes_insert_own" ON public.sugestoes_playlists
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "sugestoes_update_admin" ON public.sugestoes_playlists
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "sugestoes_delete_owner_admin" ON public.sugestoes_playlists
  FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

-- Políticas para tabela sugestao_playlist_musicas
DROP POLICY IF EXISTS "sugestao_itens_select" ON public.sugestao_playlist_musicas;
DROP POLICY IF EXISTS "sugestao_itens_insert_owner" ON public.sugestao_playlist_musicas;
DROP POLICY IF EXISTS "sugestao_itens_delete_owner_admin" ON public.sugestao_playlist_musicas;

CREATE POLICY "sugestao_itens_select" ON public.sugestao_playlist_musicas
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.sugestoes_playlists s
      WHERE s.id = sugestao_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "sugestao_itens_insert_owner" ON public.sugestao_playlist_musicas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sugestoes_playlists s
      WHERE s.id = sugestao_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "sugestao_itens_delete_owner_admin" ON public.sugestao_playlist_musicas
  FOR DELETE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.sugestoes_playlists s
      WHERE s.id = sugestao_id AND s.created_by = auth.uid()
    )
  );

-- Políticas para tabela listas_whatsapp
DROP POLICY IF EXISTS "listas_admin_all" ON public.listas_whatsapp;

CREATE POLICY "listas_admin_all" ON public.listas_whatsapp
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Políticas para tabela lista_whatsapp_musicas
DROP POLICY IF EXISTS "lista_itens_admin_all" ON public.lista_whatsapp_musicas;

CREATE POLICY "lista_itens_admin_all" ON public.lista_whatsapp_musicas
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Recarrega o schema cache
NOTIFY pgrst, 'reload schema';
