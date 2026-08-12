ALTER TABLE public.global_narrators
  ADD COLUMN IF NOT EXISTS clasico_previa_urls text[] NOT NULL DEFAULT '{}'::text[];
