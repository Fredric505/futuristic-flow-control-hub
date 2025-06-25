
-- Actualizar la función is_admin para incluir verificación de expiración
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

-- Crear función para verificar si un usuario no está expirado
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
  -- El admin nunca expira
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Para usuarios normales, verificar fecha de expiración
  RETURN (
    SELECT 
      CASE 
        WHEN expiration_date IS NULL THEN FALSE
        WHEN expiration_date >= CURRENT_DATE THEN TRUE
        ELSE FALSE
      END
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Actualizar políticas de processes para incluir verificación de expiración
DROP POLICY IF EXISTS "Users can view own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can insert own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can update own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can delete own processes" ON public.processes;

CREATE POLICY "Active users can view own processes" 
ON public.processes 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);

CREATE POLICY "Active users can insert own processes" 
ON public.processes 
FOR INSERT 
TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);

CREATE POLICY "Active users can update own processes" 
ON public.processes 
FOR UPDATE 
TO authenticated
USING (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);

CREATE POLICY "Active users can delete own processes" 
ON public.processes 
FOR DELETE 
TO authenticated
USING (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);

-- Actualizar políticas de messages para incluir verificación de expiración
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;

CREATE POLICY "Active users can view own messages" 
ON public.messages 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);

CREATE POLICY "Active users can insert own messages" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND public.is_user_active()) OR public.is_admin()
);
