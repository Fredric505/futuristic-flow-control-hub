-- Create chatbot_responses table for managing bot responses
CREATE TABLE public.chatbot_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  response_es TEXT NOT NULL,
  response_en TEXT NOT NULL,
  is_menu BOOLEAN DEFAULT false,
  menu_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_responses ENABLE ROW LEVEL SECURITY;

-- Create policies - Admin can manage all
CREATE POLICY "Admin can view all chatbot responses" 
ON public.chatbot_responses 
FOR SELECT 
USING (public.is_admin_user());

CREATE POLICY "Admin can insert chatbot responses" 
ON public.chatbot_responses 
FOR INSERT 
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin can update chatbot responses" 
ON public.chatbot_responses 
FOR UPDATE 
USING (public.is_admin_user());

CREATE POLICY "Admin can delete chatbot responses" 
ON public.chatbot_responses 
FOR DELETE 
USING (public.is_admin_user());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chatbot_responses_updated_at
BEFORE UPDATE ON public.chatbot_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default responses
INSERT INTO public.chatbot_responses (keyword, response_es, response_en, is_menu, menu_order) VALUES
('menu', '📋 *Menú de Soporte*\n\n1️⃣ Información del dispositivo\n2️⃣ Cómo devolver el equipo\n3️⃣ Contactar al propietario\n4️⃣ Hablar con soporte\n\nResponde con el número de la opción deseada.', '📋 *Support Menu*\n\n1️⃣ Device information\n2️⃣ How to return the device\n3️⃣ Contact the owner\n4️⃣ Talk to support\n\nReply with the number of the desired option.', true, 0),
('1', '📱 *Información del Dispositivo*\n\nEste dispositivo fue reportado como perdido o robado. El propietario legítimo está buscándolo.\n\nSi encontraste este dispositivo, por favor ayúdanos a devolverlo.\n\nEscribe *menu* para ver más opciones.', '📱 *Device Information*\n\nThis device was reported as lost or stolen. The rightful owner is looking for it.\n\nIf you found this device, please help us return it.\n\nType *menu* to see more options.', false, 1),
('2', '🔄 *Cómo Devolver el Equipo*\n\n1. Contacta al propietario directamente\n2. Coordina un punto de encuentro seguro\n3. Si prefieres, puedes dejarlo en una estación de policía\n\n💰 Puede haber una recompensa por la devolución.\n\nEscribe *menu* para ver más opciones.', '🔄 *How to Return the Device*\n\n1. Contact the owner directly\n2. Arrange a safe meeting point\n3. If you prefer, you can leave it at a police station\n\n💰 There may be a reward for returning it.\n\nType *menu* to see more options.', false, 2),
('3', '👤 *Contactar al Propietario*\n\nEl propietario ha sido notificado de tu mensaje y se pondrá en contacto contigo pronto.\n\nPor favor, mantén el dispositivo seguro mientras tanto.\n\nEscribe *menu* para ver más opciones.', '👤 *Contact the Owner*\n\nThe owner has been notified of your message and will contact you soon.\n\nPlease keep the device safe in the meantime.\n\nType *menu* to see more options.', false, 3),
('4', '🎧 *Soporte Técnico*\n\nNuestro equipo de soporte revisará tu mensaje y te responderá a la brevedad.\n\nMientras tanto, puedes escribir tu consulta y la recibiremos.\n\nEscribe *menu* para ver más opciones.', '🎧 *Technical Support*\n\nOur support team will review your message and respond shortly.\n\nIn the meantime, you can write your query and we will receive it.\n\nType *menu* to see more options.', false, 4),
('hola', '👋 ¡Hola! Bienvenido al sistema de soporte.\n\nEscribe *menu* para ver las opciones disponibles.', '👋 Hello! Welcome to the support system.\n\nType *menu* to see available options.', false, 0),
('hello', '👋 ¡Hola! Bienvenido al sistema de soporte.\n\nEscribe *menu* para ver las opciones disponibles.', '👋 Hello! Welcome to the support system.\n\nType *menu* to see available options.', false, 0),
('ayuda', '❓ *Centro de Ayuda*\n\nEstamos aquí para asistirte. Escribe *menu* para ver todas las opciones de soporte disponibles.', '❓ *Help Center*\n\nWe are here to assist you. Type *menu* to see all available support options.', false, 0),
('help', '❓ *Centro de Ayuda*\n\nEstamos aquí para asistirte. Escribe *menu* para ver todas las opciones de soporte disponibles.', '❓ *Help Center*\n\nWe are here to assist you. Type *menu* to see all available support options.', false, 0),
('gracias', '🙏 ¡Gracias a ti! Si necesitas algo más, escribe *menu*.', '🙏 Thank you! If you need anything else, type *menu*.', false, 0),
('thanks', '🙏 ¡Gracias a ti! Si necesitas algo más, escribe *menu*.', '🙏 Thank you! If you need anything else, type *menu*.', false, 0);

-- Create chatbot_settings table for global settings
CREATE TABLE public.chatbot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view chatbot settings" 
ON public.chatbot_settings 
FOR SELECT 
USING (public.is_admin_user());

CREATE POLICY "Admin can manage chatbot settings" 
ON public.chatbot_settings 
FOR ALL 
USING (public.is_admin_user());

-- Create trigger for timestamps
CREATE TRIGGER update_chatbot_settings_updated_at
BEFORE UPDATE ON public.chatbot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.chatbot_settings (setting_key, setting_value) VALUES
('chatbot_enabled', 'true'),
('default_language', 'es'),
('fallback_response_es', '🤖 No entendí tu mensaje. Escribe *menu* para ver las opciones disponibles.'),
('fallback_response_en', '🤖 I didn''t understand your message. Type *menu* to see available options.');