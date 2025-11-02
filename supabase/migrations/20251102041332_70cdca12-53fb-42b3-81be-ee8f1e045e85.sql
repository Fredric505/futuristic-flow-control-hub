-- Block expired users from enqueuing messages
CREATE OR REPLACE FUNCTION public.prevent_expired_user_on_message_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_expiration date;
BEGIN
  SELECT expiration_date INTO v_expiration FROM public.profiles WHERE id = NEW.user_id;
  IF v_expiration IS NOT NULL AND v_expiration < CURRENT_DATE THEN
    RAISE EXCEPTION 'ACCOUNT_EXPIRED';
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists and is up to date
DROP TRIGGER IF EXISTS trg_prevent_expired_user_on_message_queue ON public.message_queue;
CREATE TRIGGER trg_prevent_expired_user_on_message_queue
BEFORE INSERT ON public.message_queue
FOR EACH ROW
EXECUTE FUNCTION public.prevent_expired_user_on_message_queue();