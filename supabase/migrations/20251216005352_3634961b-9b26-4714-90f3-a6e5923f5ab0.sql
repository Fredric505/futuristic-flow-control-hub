-- Create table for user-specific chatbot URLs
CREATE TABLE public.user_chatbot_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url_key TEXT NOT NULL,
  url_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, url_key)
);

-- Enable RLS
ALTER TABLE public.user_chatbot_urls ENABLE ROW LEVEL SECURITY;

-- Users can view their own URLs
CREATE POLICY "Users can view their own chatbot URLs"
ON public.user_chatbot_urls
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own URLs
CREATE POLICY "Users can insert their own chatbot URLs"
ON public.user_chatbot_urls
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own URLs
CREATE POLICY "Users can update their own chatbot URLs"
ON public.user_chatbot_urls
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own URLs
CREATE POLICY "Users can delete their own chatbot URLs"
ON public.user_chatbot_urls
FOR DELETE
USING (user_id = auth.uid());

-- Admin can view all URLs
CREATE POLICY "Admin can view all chatbot URLs"
ON public.user_chatbot_urls
FOR ALL
USING (is_admin_user());

-- Create trigger for updated_at
CREATE TRIGGER update_user_chatbot_urls_updated_at
BEFORE UPDATE ON public.user_chatbot_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();