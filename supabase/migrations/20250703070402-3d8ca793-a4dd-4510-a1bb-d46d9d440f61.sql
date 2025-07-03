
-- Add lost_mode column to processes table
ALTER TABLE public.processes 
ADD COLUMN lost_mode BOOLEAN DEFAULT FALSE;

-- Update existing records to have lost_mode as false
UPDATE public.processes 
SET lost_mode = FALSE 
WHERE lost_mode IS NULL;
