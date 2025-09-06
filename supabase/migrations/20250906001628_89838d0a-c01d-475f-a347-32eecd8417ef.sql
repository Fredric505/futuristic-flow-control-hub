-- Diversificar fechas de mensajes existentes para que no todas sean iguales
-- Esto hace que los mensajes muestren fechas más realistas

UPDATE public.messages 
SET sent_at = created_at - (INTERVAL '1 hour' * (RANDOM() * 168)) -- Hasta 1 semana atrás
WHERE created_at = sent_at 
  AND created_at = '2025-09-06T00:13:16.898144+00:00';

-- Para mensajes sin sent_at válido, usar created_at con algo de variación
UPDATE public.messages 
SET sent_at = created_at - (INTERVAL '1 minute' * (RANDOM() * 60))
WHERE sent_at IS NULL;