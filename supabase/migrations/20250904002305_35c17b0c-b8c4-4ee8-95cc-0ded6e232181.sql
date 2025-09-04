-- Create admin profile using the existing auth user
-- First, let's create the admin profile properly
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Try to find the admin user in auth.users by email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'fredric505@gmail.com'
    LIMIT 1;
    
    -- If admin user exists, create their profile
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, credits, expire_at)
        VALUES (
            admin_user_id,
            'fredric505@gmail.com',
            1000,
            now() + interval '1 year'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            credits = EXCLUDED.credits,
            expire_at = EXCLUDED.expire_at;
    ELSE
        -- If no admin user exists, we'll handle this in the app
        RAISE NOTICE 'Admin user not found in auth.users table';
    END IF;
END $$;