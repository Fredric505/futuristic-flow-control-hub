-- Create table for IMEI check history
CREATE TABLE public.imei_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('imei', 'serial')),
  search_value TEXT NOT NULL,
  device_name TEXT,
  model TEXT,
  color TEXT,
  storage TEXT,
  carrier TEXT,
  warranty TEXT,
  find_my_iphone BOOLEAN,
  activation_lock BOOLEAN,
  blacklist_status TEXT,
  serial_number TEXT,
  credits_deducted DECIMAL(10,2) NOT NULL DEFAULT 0.25,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.imei_checks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own IMEI checks" 
  ON public.imei_checks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own IMEI checks" 
  ON public.imei_checks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all IMEI checks
CREATE POLICY "Admin can view all IMEI checks" 
  ON public.imei_checks 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email = 'fredric@gmail.com'
  ));