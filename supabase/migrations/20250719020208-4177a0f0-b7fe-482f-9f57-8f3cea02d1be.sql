
-- Crear tabla para almacenar los bots de Telegram de cada cliente
CREATE TABLE public.telegram_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_token TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  bot_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para almacenar dominios personalizados por usuario (para identificar en IFTTT)
CREATE TABLE public.user_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subdomain_prefix TEXT NOT NULL UNIQUE, -- ej: "cliente1", "cliente2"
  domain_name TEXT NOT NULL, -- ej: "cliente1.tu-dominio.com"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_domains ENABLE ROW LEVEL SECURITY;

-- Políticas para telegram_bots
CREATE POLICY "Users can view their own bots"
ON public.telegram_bots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bots"
ON public.telegram_bots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bots"
ON public.telegram_bots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bots"
ON public.telegram_bots
FOR DELETE
USING (auth.uid() = user_id);

-- Políticas para user_domains
CREATE POLICY "Users can view their own domains"
ON public.user_domains
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains"
ON public.user_domains
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
ON public.user_domains
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
ON public.user_domains
FOR DELETE
USING (auth.uid() = user_id);

-- Función para obtener configuración del usuario por subdominio (para IFTTT)
CREATE OR REPLACE FUNCTION public.get_user_config_by_subdomain(subdomain_param TEXT)
RETURNS TABLE(
  user_id UUID,
  bot_token TEXT,
  chat_id TEXT,
  domain_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ud.user_id,
    tb.bot_token,
    tb.chat_id,
    ud.domain_name
  FROM public.user_domains ud
  JOIN public.telegram_bots tb ON ud.user_id = tb.user_id
  WHERE ud.subdomain_prefix = subdomain_param 
    AND ud.is_active = true 
    AND tb.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar campo para identificar el cliente en los procesos
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS client_subdomain TEXT;

-- Agregar campo para almacenar respuestas de WhatsApp
CREATE TABLE public.whatsapp_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  response_content TEXT NOT NULL,
  imei TEXT, -- Para identificar el proceso
  serial_number TEXT, -- Para identificar el proceso
  telegram_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en whatsapp_responses
ALTER TABLE public.whatsapp_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_responses
CREATE POLICY "Users can view their own responses"
ON public.whatsapp_responses
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own responses"
ON public.whatsapp_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own responses"
ON public.whatsapp_responses
FOR UPDATE
USING (auth.uid() = user_id);
