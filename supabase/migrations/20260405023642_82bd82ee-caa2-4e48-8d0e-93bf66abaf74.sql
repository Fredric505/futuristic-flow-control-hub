-- Clean up old cron job run details (keep last 7 days)
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';

-- Clean up old HTTP responses
DELETE FROM net._http_response WHERE created < now() - interval '7 days';

-- Schedule automatic cleanup every day at 3am UTC
SELECT cron.schedule(
  'cleanup-old-cron-logs',
  '0 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);

SELECT cron.schedule(
  'cleanup-old-http-responses',
  '0 3 * * *',
  $$DELETE FROM net._http_response WHERE created < now() - interval '7 days'$$
);