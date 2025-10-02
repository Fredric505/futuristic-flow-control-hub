-- Create message templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'spanish',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own templates"
  ON public.message_templates
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON public.message_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON public.message_templates
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON public.message_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add template_id column to processes table (optional)
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.message_templates(id);

-- Add template_id column to message_queue table (optional)
ALTER TABLE public.message_queue
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.message_templates(id);