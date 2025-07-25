
-- Tabla para mapear números de teléfono a usuarios
CREATE TABLE IF NOT EXISTS public.phone_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para mensajes entrantes
CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  source TEXT DEFAULT 'whatsapp',
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  telegram_sent BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_phone_mappings_phone ON public.phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_mappings_user_id ON public.phone_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_phone ON public.incoming_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_processed ON public.incoming_messages(processed);

-- RLS Policies
ALTER TABLE public.phone_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para phone_mappings
CREATE POLICY "Users can view their own phone mappings" ON public.phone_mappings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phone mappings" ON public.phone_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phone mappings" ON public.phone_mappings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phone mappings" ON public.phone_mappings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all phone mappings" ON public.phone_mappings
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage all phone mappings" ON public.phone_mappings
  FOR ALL USING (is_admin());

-- Políticas para incoming_messages
CREATE POLICY "Users can view their own messages" ON public.incoming_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all messages" ON public.incoming_messages
  FOR SELECT USING (is_admin());

-- Función para normalizar números de teléfono
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remover espacios, guiones y caracteres especiales
  phone_input := regexp_replace(phone_input, '[^0-9+]', '', 'g');
  
  -- Si no tiene +, agregarlo asumiendo formato internacional
  IF phone_input !~ '^\+' THEN
    phone_input := '+' || phone_input;
  END IF;
  
  RETURN phone_input;
END;
$$ LANGUAGE plpgsql;

-- Función para encontrar usuario por número de teléfono
CREATE OR REPLACE FUNCTION find_user_by_phone(phone_input TEXT)
RETURNS UUID AS $$
DECLARE
  normalized_phone TEXT;
  found_user_id UUID;
BEGIN
  normalized_phone := normalize_phone_number(phone_input);
  
  -- Buscar coincidencia exacta primero
  SELECT user_id INTO found_user_id
  FROM public.phone_mappings
  WHERE normalize_phone_number(phone_number) = normalized_phone
  LIMIT 1;
  
  -- Si no encuentra coincidencia exacta, buscar por proceso
  IF found_user_id IS NULL THEN
    SELECT user_id INTO found_user_id
    FROM public.processes
    WHERE normalize_phone_number(country_code || phone_number) = normalized_phone
    LIMIT 1;
  END IF;
  
  RETURN found_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar phone_mappings automáticamente desde processes
CREATE OR REPLACE FUNCTION sync_phone_mappings()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar o actualizar en phone_mappings
  INSERT INTO public.phone_mappings (user_id, phone_number, country_code)
  VALUES (NEW.user_id, NEW.phone_number, NEW.country_code)
  ON CONFLICT (user_id, phone_number) DO UPDATE SET
    country_code = NEW.country_code,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecute cuando se inserte o actualice un proceso
DROP TRIGGER IF EXISTS sync_phone_mappings_trigger ON public.processes;
CREATE TRIGGER sync_phone_mappings_trigger
  AFTER INSERT OR UPDATE ON public.processes
  FOR EACH ROW
  EXECUTE FUNCTION sync_phone_mappings();

-- Sincronizar datos existentes
INSERT INTO public.phone_mappings (user_id, phone_number, country_code)
SELECT DISTINCT user_id, phone_number, country_code
FROM public.processes
ON CONFLICT (user_id, phone_number) DO NOTHING;
