
-- Primero, eliminar las políticas problemáticas existentes
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Crear función de seguridad que verifica si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT email = 'fredric@gmail.com' 
    FROM auth.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Crear políticas RLS usando la función sin recursión
CREATE POLICY "Users can view own profile or admin can view all" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id OR public.is_admin()
);

CREATE POLICY "Users can update own profile or admin can update all" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = id OR public.is_admin()
);

-- Política para INSERT (necesaria para crear usuarios)
CREATE POLICY "Admin can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin() OR auth.uid() = id);

-- Política para DELETE (solo admin puede eliminar)
CREATE POLICY "Admin can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());
