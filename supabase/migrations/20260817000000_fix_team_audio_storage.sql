-- Asegura que el bucket de audios de equipos exista.
-- Los audios son públicos para que el juego pueda reproducirlos.
-- Solo los administradores pueden subir/modificar/eliminar.

INSERT INTO storage.buckets (id, name, public)
VALUES ('team-audios', 'team-audios', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- Lectura pública de los audios.
DROP POLICY IF EXISTS "team-audios public read"
ON storage.objects;

CREATE POLICY "team-audios public read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'team-audios'
);

-- Solo administradores pueden subir.
DROP POLICY IF EXISTS "team-audios admin write"
ON storage.objects;

CREATE POLICY "team-audios admin write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);

-- Solo administradores pueden modificar.
DROP POLICY IF EXISTS "team-audios admin update"
ON storage.objects;

CREATE POLICY "team-audios admin update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);

-- Solo administradores pueden eliminar.
DROP POLICY IF EXISTS "team-audios admin delete"
ON storage.objects;

CREATE POLICY "team-audios admin delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-audios'
  AND public.has_role(auth.uid(), 'admin')
);
