-- Crear tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  expire_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de procesos
CREATE TABLE public.processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'whatsapp',
  owner_name TEXT NOT NULL,
  iphone_model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  imei TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  url TEXT NOT NULL,
  lost_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de mensajes
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de configuraciones
CREATE TABLE public.instance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instance_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para processes
CREATE POLICY "Users can view their own processes" ON public.processes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own processes" ON public.processes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processes" ON public.processes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own processes" ON public.processes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para messages
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para instance_settings (solo administradores)
CREATE POLICY "Admin can manage settings" ON public.instance_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'fredric505@gmail.com'
    )
  );

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para actualizar timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processes_updated_at
  BEFORE UPDATE ON public.processes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_instance_settings_updated_at
  BEFORE UPDATE ON public.instance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar configuraciones iniciales
INSERT INTO public.instance_settings (setting_key, setting_value) VALUES
('admin_email', 'fredric505@gmail.com'),
('default_credits', '10'),
('user_expiry_days', '30')
ON CONFLICT (setting_key) DO NOTHING;