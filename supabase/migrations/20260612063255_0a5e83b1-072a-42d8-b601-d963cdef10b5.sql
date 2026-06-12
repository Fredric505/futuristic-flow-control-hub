-- 1. AI chatbot settings (singleton row)
CREATE TABLE public.ai_chatbot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  activation_mode text NOT NULL DEFAULT 'fallback', -- 'fallback' | 'always'
  provider text NOT NULL DEFAULT 'deepseek', -- 'deepseek' | 'openai' | 'lovable'
  model text NOT NULL DEFAULT 'deepseek-chat',
  api_key text,
  base_url text DEFAULT 'https://api.deepseek.com',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 350,
  system_prompt text NOT NULL DEFAULT 'Eres un asistente experto en soporte técnico móvil. Responde de forma natural, breve y amigable, y guía al cliente hacia las opciones del menú cuando sea posible.',
  personality text DEFAULT 'Profesional, breve, amigable y orientado a resolver problemas rápidamente.',
  behavior text DEFAULT '- Responde siempre en el idioma del cliente.
- Sé claro y directo.
- Usa emojis moderados estilo WhatsApp.
- Solicita datos puntuales si falta contexto.',
  custom_link_enabled boolean NOT NULL DEFAULT false,
  custom_link_url text,
  custom_link_preview_text text,
  history_limit integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chatbot_settings TO authenticated;
GRANT ALL ON public.ai_chatbot_settings TO service_role;

ALTER TABLE public.ai_chatbot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage AI settings" ON public.ai_chatbot_settings
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Authenticated can read AI settings" ON public.ai_chatbot_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_ai_chatbot_settings_updated
  BEFORE UPDATE ON public.ai_chatbot_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default singleton row
INSERT INTO public.ai_chatbot_settings (id) VALUES (gen_random_uuid());

-- 2. AI conversation history per phone number
CREATE TABLE public.ai_conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conv_phone_created ON public.ai_conversation_history(phone_number, created_at DESC);

GRANT ALL ON public.ai_conversation_history TO service_role;
GRANT SELECT ON public.ai_conversation_history TO authenticated;

ALTER TABLE public.ai_conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read history" ON public.ai_conversation_history
  FOR SELECT TO authenticated
  USING (public.is_admin_user());
