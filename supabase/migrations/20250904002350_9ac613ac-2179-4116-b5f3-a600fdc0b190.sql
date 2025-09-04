-- Fix admin email consistency
-- Update the admin email to match what the application expects
UPDATE public.profiles 
SET email = 'fredric@gmail.com' 
WHERE email = 'fredric505@gmail.com';

-- Also update the RLS policy to check for the correct email
DROP POLICY IF EXISTS "Admin can manage settings" ON public.instance_settings;

CREATE POLICY "Admin can manage settings" 
ON public.instance_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'fredric@gmail.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'fredric@gmail.com'
  )
);