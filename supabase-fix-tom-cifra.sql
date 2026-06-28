ALTER TABLE public.musicas
  ADD COLUMN IF NOT EXISTS tom TEXT,
  ADD COLUMN IF NOT EXISTS cifra TEXT;

CREATE INDEX IF NOT EXISTS idx_musicas_tom ON public.musicas(tom);

NOTIFY pgrst, 'reload schema';
