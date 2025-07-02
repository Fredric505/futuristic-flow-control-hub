
-- Crear el bucket para las imágenes de iPhone
INSERT INTO storage.buckets (id, name, public)
VALUES ('iphone-images', 'iphone-images', true);

-- Crear política para permitir acceso público de lectura a las imágenes
CREATE POLICY "Public read access for iPhone images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'iphone-images');

-- Crear política para permitir subida de imágenes (para administradores)
CREATE POLICY "Allow upload of iPhone images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'iphone-images');
