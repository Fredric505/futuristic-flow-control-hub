
-- Habilitar Row Level Security en la tabla messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean solo sus propios mensajes
CREATE POLICY "Users can view their own messages" 
  ON public.messages 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar sus propios mensajes
CREATE POLICY "Users can insert their own messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política especial para que el administrador (fredric@gmail.com) pueda ver TODOS los mensajes
CREATE POLICY "Admin can view all messages" 
  ON public.messages 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'fredric@gmail.com'
    )
  );

-- Aplicar las mismas políticas a la tabla processes para consistencia
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean solo sus propios procesos
CREATE POLICY "Users can view their own processes" 
  ON public.processes 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para que los usuarios puedan insertar sus propios procesos
CREATE POLICY "Users can insert their own processes" 
  ON public.processes 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios puedan actualizar sus propios procesos
CREATE POLICY "Users can update their own processes" 
  ON public.processes 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Política especial para que el administrador pueda ver TODOS los procesos
CREATE POLICY "Admin can view all processes" 
  ON public.processes 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'fredric@gmail.com'
    )
  );

-- Política para que el administrador pueda actualizar TODOS los procesos
CREATE POLICY "Admin can update all processes" 
  ON public.processes 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND email = 'fredric@gmail.com'
    )
  );
