-- Add created_at column to messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.messages 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
    END IF;
END $$;

-- Update existing messages that don't have sent_at to use created_at
UPDATE public.messages 
SET sent_at = created_at 
WHERE sent_at IS NULL AND created_at IS NOT NULL;

-- Add trigger to update sent_at when a message is created
CREATE OR REPLACE FUNCTION public.set_message_sent_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_at IS NULL THEN
    NEW.sent_at = NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_message_sent_at_trigger
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_sent_at();