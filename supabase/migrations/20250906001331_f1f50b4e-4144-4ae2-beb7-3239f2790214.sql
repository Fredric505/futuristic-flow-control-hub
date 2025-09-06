-- Fix the search path security issue
CREATE OR REPLACE FUNCTION public.set_message_sent_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sent_at IS NULL THEN
    NEW.sent_at = NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$;