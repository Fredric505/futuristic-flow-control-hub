
-- Eliminar políticas RLS duplicadas o conflictivas que están causando problemas

-- Eliminar políticas duplicadas en la tabla processes
DROP POLICY IF EXISTS "Users can view own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can insert own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can update own processes" ON public.processes;
DROP POLICY IF EXISTS "Users can delete own processes" ON public.processes;

-- Eliminar políticas duplicadas en la tabla messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;

-- Mantener solo las políticas más recientes y funcionales para processes
CREATE POLICY "Users can view their own processes" 
ON public.processes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processes" 
ON public.processes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes" 
ON public.processes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes" 
ON public.processes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Mantener solo las políticas más recientes y funcionales para messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Simplificar la función is_user_active para evitar conflictos
CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
  -- El admin nunca expira
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'fredric@gmail.com') THEN
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
  ) = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
