
-- Table for tracking user WhatsApp Web.js sessions
CREATE TABLE public.user_whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_status text NOT NULL DEFAULT 'disconnected',
  connected_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one session per user
CREATE UNIQUE INDEX idx_user_whatsapp_sessions_user_id ON public.user_whatsapp_sessions (user_id);

-- Enable RLS
ALTER TABLE public.user_whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own session
CREATE POLICY "Users can view own session"
  ON public.user_whatsapp_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own session
CREATE POLICY "Users can insert own session"
  ON public.user_whatsapp_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own session
CREATE POLICY "Users can update own session"
  ON public.user_whatsapp_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can manage all sessions
CREATE POLICY "Admin can manage all sessions"
  ON public.user_whatsapp_sessions FOR ALL
  TO authenticated
  USING (public.is_admin_user());

-- Auto-update updated_at
CREATE TRIGGER update_user_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.user_whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
