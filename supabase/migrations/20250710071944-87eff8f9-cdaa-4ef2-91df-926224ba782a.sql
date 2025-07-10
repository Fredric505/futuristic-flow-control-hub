
-- Crear tabla para dominios de usuarios
CREATE TABLE public.user_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  domain_name TEXT NOT NULL,
  subdomain_prefix TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain_name, subdomain_prefix)
);

-- Crear tabla para configuración de bots de Telegram
CREATE TABLE public.telegram_bots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  bot_token TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla para capturar datos de scripts
CREATE TABLE public.script_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  process_id UUID REFERENCES processes(id),
  subdomain TEXT NOT NULL,
  script_type TEXT NOT NULL,
  captured_data JSONB NOT NULL,
  telegram_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar RLS para user_domains
ALTER TABLE public.user_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains" 
  ON public.user_domains 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own domains" 
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

-- Agregar RLS para telegram_bots
ALTER TABLE public.telegram_bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own telegram bots" 
  ON public.telegram_bots 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own telegram bots" 
  ON public.telegram_bots 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own telegram bots" 
  ON public.telegram_bots 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Agregar RLS para script_captures
ALTER TABLE public.script_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own script captures" 
  ON public.script_captures 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Función para obtener configuración de usuario por subdominio
CREATE OR REPLACE FUNCTION public.get_user_config_by_subdomain(subdomain_param TEXT)
RETURNS TABLE (
  user_id UUID,
  bot_token TEXT,
  chat_id TEXT,
  domain_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
