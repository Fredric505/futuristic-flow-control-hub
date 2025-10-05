-- Limit pending messages to max 2 per number (except admin)
CREATE OR REPLACE FUNCTION public.prevent_spam_on_message_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count integer;
BEGIN
  -- Admin users can bypass the limit
  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO pending_count
  FROM public.message_queue
  WHERE user_id = NEW.user_id
    AND recipient_phone = NEW.recipient_phone
    AND status = 'pending';

  IF pending_count >= 2 THEN
    RAISE EXCEPTION 'MAX_2_MESSAGES_PER_NUMBER';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to enforce the rule before inserting into the queue
DROP TRIGGER IF EXISTS trg_prevent_spam_on_message_queue ON public.message_queue;
CREATE TRIGGER trg_prevent_spam_on_message_queue
BEFORE INSERT ON public.message_queue
FOR EACH ROW
EXECUTE FUNCTION public.prevent_spam_on_message_queue();

-- Helpful index for the check
CREATE INDEX IF NOT EXISTS idx_message_queue_user_phone_status 
ON public.message_queue(user_id, recipient_phone, status);