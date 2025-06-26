
-- Recrear el esquema completo de ASTRO505

-- 1. Crear tabla de perfiles para información adicional de usuarios
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  credits INTEGER DEFAULT 0,
  expiration_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 2. Crear tabla de procesos
CREATE TABLE public.processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  iphone_model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  imei TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  url TEXT,
  status TEXT DEFAULT 'guardado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla de mensajes para historial
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla de configuraciones del sistema
CREATE TABLE public.system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Insertar configuraciones por defecto de WhatsApp
INSERT INTO public.system_settings (setting_key, setting_value) 
VALUES 
  ('whatsapp_instance', 'instance126876'),
  ('whatsapp_token', '4ecj8581tubua7ry');

-- 6. Habilitar Row Level Security en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 7. Crear función de seguridad para verificar si el usuario es admin
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

-- 8. Crear función para verificar si un usuario está activo (no expirado)
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

-- 9. Crear políticas RLS para profiles
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

CREATE POLICY "Admin can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admin can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- 10. Crear políticas RLS para processes
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

-- 11. Crear políticas RLS para messages
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

-- 12. Crear políticas RLS para system_settings (solo admin)
CREATE POLICY "Admin can manage system settings" 
ON public.system_settings 
FOR ALL 
TO authenticated
USING (public.is_admin());

-- 13. Crear función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits, expiration_date)
  VALUES (
    NEW.id, 
    NEW.email, 
    0,
    (CURRENT_DATE + INTERVAL '30 days')::DATE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Crear trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 15. Insertar perfiles para usuarios existentes (si los hay)
INSERT INTO public.profiles (id, email, credits, expiration_date)
SELECT 
  au.id,
  au.email,
  0 as credits,
  (CURRENT_DATE + INTERVAL '30 days')::DATE as expiration_date
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 16. Crear el usuario administrador si no existe
DO $$
BEGIN
  -- Verificar si el admin ya existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'fredric@gmail.com') THEN
    -- Si no existe, se creará cuando se registre manualmente
    -- Solo asegurar que tenga perfil cuando se cree
    NULL;
  END IF;
END $$;
