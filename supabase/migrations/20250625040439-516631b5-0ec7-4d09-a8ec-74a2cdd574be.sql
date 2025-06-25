
-- Insertar perfiles faltantes para usuarios que existen en auth.users pero no en profiles
INSERT INTO public.profiles (id, email, credits, expiration_date)
SELECT 
  au.id,
  au.email,
  0 as credits,
  (CURRENT_DATE + INTERVAL '30 days')::DATE as expiration_date
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Crear política RLS para que el admin pueda ver todos los perfiles
CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  -- Permitir que el usuario vea su propio perfil
  auth.uid() = id 
  OR 
  -- Permitir que el admin vea todos los perfiles
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'fredric@gmail.com'
  )
);

-- Crear política RLS para que el admin pueda actualizar todos los perfiles
CREATE POLICY "Admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  -- Permitir que el usuario actualice su propio perfil
  auth.uid() = id 
  OR 
  -- Permitir que el admin actualice todos los perfiles
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND email = 'fredric@gmail.com'
  )
);

-- Habilitar RLS en la tabla profiles si no está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
