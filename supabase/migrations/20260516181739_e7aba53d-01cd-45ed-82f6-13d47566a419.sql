
ALTER TABLE public.assigned_routes
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lon double precision;

CREATE INDEX IF NOT EXISTS idx_ar_dest_coords
  ON public.assigned_routes (destination_lat, destination_lon)
  WHERE destination_lat IS NOT NULL;

-- Cron: sincroniza Comprovei a cada 5 minutos
DO $$
BEGIN
  PERFORM cron.unschedule('comprovei-sync-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'comprovei-sync-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--0904827b-6b5b-4ad6-8cd3-8c0199d854ee-dev.lovable.app/api/public/hooks/comprovei-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbHF4d21veXB4ZGZ5cGx6ZXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTIyMjMsImV4cCI6MjA5NDMyODIyM30.S1oqyz8MDFGy4tXVq0HL6lAwrfm9DY8taILSga9b8dE'
    ),
    body := '{"trigger":"cron"}'::jsonb
  );
  $$
);
