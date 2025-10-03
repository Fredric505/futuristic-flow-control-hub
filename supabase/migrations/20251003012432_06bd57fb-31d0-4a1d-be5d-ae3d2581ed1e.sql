-- Create a cron job to automatically process messages after 5 minutes
SELECT cron.schedule(
  'process-message-queue-auto',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
        url:='https://bifqtxaigahdhejurzyb.supabase.co/functions/v1/process-message-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZnF0eGFpZ2FoZGhlanVyenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTgyODUsImV4cCI6MjA3MjQzNDI4NX0.-3LbqnTZDGX6Gqlt3Py56S4QFjhs_Ja1TmlzYgowZbQ"}'::jsonb,
        body:='{"auto": true}'::jsonb
    ) as request_id;
  $$
);