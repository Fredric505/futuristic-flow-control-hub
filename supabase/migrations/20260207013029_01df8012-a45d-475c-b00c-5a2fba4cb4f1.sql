-- Drop existing foreign key constraints
ALTER TABLE public.processes
  DROP CONSTRAINT IF EXISTS processes_template_id_fkey;

ALTER TABLE public.message_queue
  DROP CONSTRAINT IF EXISTS message_queue_template_id_fkey;

-- Re-add constraints with ON DELETE SET NULL
ALTER TABLE public.processes
  ADD CONSTRAINT processes_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.message_templates(id) ON DELETE SET NULL;

ALTER TABLE public.message_queue
  ADD CONSTRAINT message_queue_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.message_templates(id) ON DELETE SET NULL;