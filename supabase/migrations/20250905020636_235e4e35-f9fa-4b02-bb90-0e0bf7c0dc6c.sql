-- Create all necessary RLS policies with correct column names

-- Profiles table policies (uses 'id' column)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (email = 'fredric@gmail.com');

CREATE POLICY "Admin can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (email = 'fredric@gmail.com');

CREATE POLICY "Admin can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'fredric@gmail.com'
  )
);

-- Processes table policies (uses 'user_id' column)
CREATE POLICY "Users can view their own processes" 
ON public.processes 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own processes" 
ON public.processes 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own processes" 
ON public.processes 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own processes" 
ON public.processes 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Admin can view all processes" 
ON public.processes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'fredric@gmail.com'
  )
);

-- Messages table policies (uses 'user_id' column)
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can view all messages" 
ON public.messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'fredric@gmail.com'
  )
);

-- System settings policies (admin only - no user_id column)
CREATE POLICY "Admin can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND email = 'fredric@gmail.com'
  )
);