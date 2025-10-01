-- Create message queue table
CREATE TABLE public.message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'spanish',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own queued messages
CREATE POLICY "Users can view their own queued messages" 
ON public.message_queue 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can insert their own queued messages
CREATE POLICY "Users can insert their own queued messages" 
ON public.message_queue 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Admin can view all queued messages
CREATE POLICY "Admin can view all queued messages" 
ON public.message_queue 
FOR ALL
USING (is_admin_user());

-- Admin can update all queued messages
CREATE POLICY "Admin can update all queued messages" 
ON public.message_queue 
FOR UPDATE
USING (is_admin_user());

-- Admin can delete queued messages
CREATE POLICY "Admin can delete queued messages" 
ON public.message_queue 
FOR DELETE
USING (is_admin_user());

-- Add trigger to update updated_at
CREATE TRIGGER update_message_queue_updated_at
BEFORE UPDATE ON public.message_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_message_queue_status ON public.message_queue(status);
CREATE INDEX idx_message_queue_scheduled_for ON public.message_queue(scheduled_for);
CREATE INDEX idx_message_queue_user_id ON public.message_queue(user_id);