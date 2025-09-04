-- Add missing status column to processes table
ALTER TABLE public.processes 
ADD COLUMN status TEXT NOT NULL DEFAULT 'guardado';

-- Create admin profile if it doesn't exist
INSERT INTO public.profiles (user_id, email, credits, expire_at)
SELECT 
  id,
  email,
  100,
  now() + interval '365 days'
FROM auth.users 
WHERE email = 'fredric@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.user_id = auth.users.id
);