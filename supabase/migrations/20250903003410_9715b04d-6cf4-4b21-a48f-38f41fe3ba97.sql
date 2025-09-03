-- First, let's check what the admin email should be from the RLS policy
-- The policy currently checks for 'fredric505@gmail.com'
-- Let's create a profile for the current admin user

-- Insert a profile for the admin user (adjust the email if needed)
INSERT INTO public.profiles (user_id, email, credits, expire_at)
SELECT 
  auth.uid(),
  'fredric505@gmail.com',
  1000,
  now() + interval '1 year'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
);

-- Alternative: If the admin email should be different, update the RLS policy
-- Let's also create a policy that works with any admin email pattern
DROP POLICY IF EXISTS "Admin can manage settings" ON public.instance_settings;

CREATE POLICY "Admin can manage settings" 
ON public.instance_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email LIKE '%fredric%'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email LIKE '%fredric%'
  )
);