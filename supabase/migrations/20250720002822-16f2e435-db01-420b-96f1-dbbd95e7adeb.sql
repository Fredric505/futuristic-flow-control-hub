
-- Add Telegram bot configuration columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN telegram_bot_token TEXT,
ADD COLUMN telegram_chat_id TEXT;
