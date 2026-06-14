CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  artista TEXT,
  categoria TEXT,
  link TEXT,
  duracao TEXT,
  visualizacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.listas_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data_lista DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lista_whatsapp_musicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES public.listas_whatsapp(id) ON DELETE CASCADE,
  musica_id UUID NOT NULL REFERENCES public.musicas(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_id, musica_id)
);

CREATE INDEX IF NOT EXISTS idx_musicas_titulo
  ON public.musicas(titulo);

CREATE INDEX IF NOT EXISTS idx_musicas_artista
  ON public.musicas(artista);

CREATE INDEX IF NOT EXISTS idx_lista_whatsapp_data
  ON public.listas_whatsapp(data_lista);

CREATE INDEX IF NOT EXISTS idx_lista_whatsapp_musicas_lista
  ON public.lista_whatsapp_musicas(lista_id);

ALTER TABLE public.musicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_whatsapp_musicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_musicas" ON public.musicas;
DROP POLICY IF EXISTS "public_insert_musicas" ON public.musicas;
DROP POLICY IF EXISTS "public_update_musicas" ON public.musicas;
DROP POLICY IF EXISTS "public_delete_musicas" ON public.musicas;
DROP POLICY IF EXISTS "public_all_listas" ON public.listas_whatsapp;
DROP POLICY IF EXISTS "public_all_lista_musicas" ON public.lista_whatsapp_musicas;

CREATE POLICY "public_select_musicas"
  ON public.musicas
  FOR SELECT
  USING (true);

CREATE POLICY "public_insert_musicas"
  ON public.musicas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_update_musicas"
  ON public.musicas
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_delete_musicas"
  ON public.musicas
  FOR DELETE
  USING (true);

CREATE POLICY "public_all_listas"
  ON public.listas_whatsapp
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_all_lista_musicas"
  ON public.lista_whatsapp_musicas
  FOR ALL
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
