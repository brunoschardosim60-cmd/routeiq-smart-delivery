-- =========================================
-- Comprovei Integration — schema
-- =========================================

-- 1. Config (single row)
CREATE TABLE public.comprovei_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled         boolean NOT NULL DEFAULT false,
  base_events_url text NOT NULL DEFAULT 'https://events-api.comprovei.com',
  base_api_url    text NOT NULL DEFAULT 'https://api.comprovei.com.br',
  username        text,
  password        text,
  sync_interval_minutes integer NOT NULL DEFAULT 5,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Sync state (single row)
CREATE TABLE public.comprovei_sync_state (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_event_id   text,
  last_sync_at    timestamptz,
  last_status     text NOT NULL DEFAULT 'idle', -- idle | running | ok | error
  last_message    text,
  events_synced   integer NOT NULL DEFAULT 0,
  routes_synced   integer NOT NULL DEFAULT 0,
  stops_synced    integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Sync log (history)
CREATE TABLE public.comprovei_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  status        text NOT NULL,                  -- ok | error
  trigger       text NOT NULL DEFAULT 'auto',   -- auto | manual
  events_count  integer NOT NULL DEFAULT 0,
  routes_count  integer NOT NULL DEFAULT 0,
  stops_count   integer NOT NULL DEFAULT 0,
  message       text
);

-- 4. Events (WS205)
CREATE TABLE public.comprovei_events (
  id              text PRIMARY KEY,            -- eventId from API
  event_type      text NOT NULL,
  occurred_at     timestamptz,
  route_external_id  text,
  stop_external_id   text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comprovei_events_route ON public.comprovei_events(route_external_id);
CREATE INDEX idx_comprovei_events_occurred ON public.comprovei_events(occurred_at DESC);

-- 5. Routes (WS601)
CREATE TABLE public.comprovei_routes (
  external_id           text PRIMARY KEY,
  driver_name           text,
  vehicle               text,
  plate                 text,
  origin                text,
  destination           text,
  status                text,
  distance_estimated_km numeric,
  distance_traveled_km  numeric,
  delivery_count        integer,
  planned_start         timestamptz,
  planned_end           timestamptz,
  in_transit_at         timestamptz,
  arrived_base_at       timestamptz,
  raw                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at           timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comprovei_routes_status ON public.comprovei_routes(status);
CREATE INDEX idx_comprovei_routes_planned_start ON public.comprovei_routes(planned_start DESC);

-- 6. Stops (WS605)
CREATE TABLE public.comprovei_stops (
  external_id          text PRIMARY KEY,
  route_external_id    text REFERENCES public.comprovei_routes(external_id) ON DELETE CASCADE,
  recipient            text,
  address              text,
  sequence_planned     integer,
  sequence_executed    integer,
  status               text,
  occurrence           text,
  scheduled_at         timestamptz,
  done_at              timestamptz,
  distance_traveled_km numeric,
  photo_url            text,
  signature_url        text,
  tracking_url         text,
  raw                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at          timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comprovei_stops_route ON public.comprovei_stops(route_external_id);
CREATE INDEX idx_comprovei_stops_status ON public.comprovei_stops(status);

-- 7. Route window analysis (WS607)
CREATE TABLE public.comprovei_route_window (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_external_id text,
  carrier           text,
  driver_name       text,
  windows           jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ window: "08-10", deliveries: 12 }, ...]
  imported_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_external_id)
);

-- 8. Process times (WS608)
CREATE TABLE public.comprovei_process_times (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_external_id   text,
  driver_name         text,
  permanence_minutes  numeric,
  travel_minutes      numeric,
  wait_minutes        numeric,
  unload_minutes      numeric,
  sequence_original   integer,
  sequence_executed   integer,
  distance_traveled_km numeric,
  distance_estimated_km numeric,
  route_started_at    timestamptz,
  route_finished_at   timestamptz,
  raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  imported_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comprovei_proctimes_route ON public.comprovei_process_times(route_external_id);

-- 9. Route in/out averages (WS610)
CREATE TABLE public.comprovei_route_avg (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_external_id   text,
  driver_name         text,
  route_type          text,
  goal_departure      time,
  avg_in_transit      time,
  avg_arrival_base    time,
  planned_end         time,
  imported_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_external_id)
);

-- =========================================
-- RLS — server (service_role) writes; authenticated users may read
-- =========================================
ALTER TABLE public.comprovei_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_sync_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_sync_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_routes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_stops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_route_window  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_process_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprovei_route_avg     ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users (no policies for insert/update => only service_role can write)
-- Note: comprovei_config is intentionally NOT readable by client (contains password) — only server reads it.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'comprovei_sync_state',
    'comprovei_sync_log',
    'comprovei_events',
    'comprovei_routes',
    'comprovei_stops',
    'comprovei_route_window',
    'comprovei_process_times',
    'comprovei_route_avg'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
      t || '_read', t
    );
  END LOOP;
END $$;

-- =========================================
-- Seed initial rows + mock data (hybrid)
-- =========================================
INSERT INTO public.comprovei_config (enabled, sync_interval_minutes)
VALUES (false, 5);

INSERT INTO public.comprovei_sync_state (last_status, last_message)
VALUES ('idle', 'Estrutura criada. Ative a integração em Configurações para iniciar.');

-- Mock seed: routes
INSERT INTO public.comprovei_routes (external_id, driver_name, vehicle, plate, origin, destination, status,
  distance_estimated_km, distance_traveled_km, delivery_count, planned_start, planned_end, in_transit_at, arrived_base_at)
VALUES
  ('CMP-RT-1001', 'Carlos Silva',   'Fiat Fiorino',    'FRD-2A41', 'CD Vila Leopoldina', 'Zona Oeste SP', 'Em trânsito', 92.0, 64.5, 22, '2025-05-14 06:30+00', '2025-05-14 13:30+00', '2025-05-14 06:42+00', NULL),
  ('CMP-RT-1002', 'Pedro Santos',   'Fiat Strada',     'GHK-7B12', 'CD Guarulhos',       'Zona Leste SP',  'Atrasado',    78.0, 71.0, 18, '2025-05-14 07:00+00', '2025-05-14 12:30+00', '2025-05-14 07:18+00', NULL),
  ('CMP-RT-1003', 'Lucas Rodrigues','Renault Kangoo',  'JLP-3C88', 'Farmácia Central SP','Centro SP',      'Concluída',  120.0,118.2, 26, '2025-05-13 06:15+00', '2025-05-13 14:00+00', '2025-05-13 06:30+00', '2025-05-13 13:54+00');

-- Mock seed: stops
INSERT INTO public.comprovei_stops (external_id, route_external_id, recipient, address, sequence_planned, sequence_executed, status, scheduled_at, done_at, distance_traveled_km)
VALUES
  ('CMP-STOP-1', 'CMP-RT-1001', 'Drogaria São Paulo - Pinheiros', 'R. dos Pinheiros, 850',         1, 1, 'Entregue',   '2025-05-14 08:30+00', '2025-05-14 08:42+00', 12.4),
  ('CMP-STOP-2', 'CMP-RT-1001', 'Hospital Albert Einstein',       'Av. Albert Einstein, 627',      2, 2, 'Entregue',   '2025-05-14 09:10+00', '2025-05-14 09:18+00', 18.7),
  ('CMP-STOP-3', 'CMP-RT-1001', 'Drogasil Vila Mariana',          'R. Domingos de Morais, 1200',   3, NULL, 'Pendente', '2025-05-14 11:30+00', NULL, NULL),
  ('CMP-STOP-4', 'CMP-RT-1002', 'Farmácia Pague Menos Itaim',     'R. Joaquim Floriano, 100',      1, 1, 'Tentativa', '2025-05-14 09:00+00', '2025-05-14 10:42+00', 22.1);

-- Mock seed: events
INSERT INTO public.comprovei_events (id, event_type, occurred_at, route_external_id, stop_external_id, payload)
VALUES
  ('evt-9001', 'route.started',   '2025-05-14 06:42+00', 'CMP-RT-1001', NULL,         '{"note":"Saída do CD Vila Leopoldina"}'),
  ('evt-9002', 'stop.delivered',  '2025-05-14 08:42+00', 'CMP-RT-1001', 'CMP-STOP-1', '{"signedBy":"Recepção"}'),
  ('evt-9003', 'stop.delivered',  '2025-05-14 09:18+00', 'CMP-RT-1001', 'CMP-STOP-2', '{}'),
  ('evt-9004', 'route.delayed',   '2025-05-14 10:00+00', 'CMP-RT-1002', NULL,         '{"minutes":45}'),
  ('evt-9005', 'stop.attempted',  '2025-05-14 10:42+00', 'CMP-RT-1002', 'CMP-STOP-4', '{"reason":"Estabelecimento fechado"}');

-- Mock seed: route window (WS607)
INSERT INTO public.comprovei_route_window (route_external_id, carrier, driver_name, windows)
VALUES
  ('CMP-RT-1001', 'BS Soluções', 'Carlos Silva',
   '[{"window":"06-08","deliveries":4},{"window":"08-10","deliveries":7},{"window":"10-12","deliveries":6},{"window":"12-14","deliveries":5}]'::jsonb),
  ('CMP-RT-1002', 'DBM',         'Pedro Santos',
   '[{"window":"07-09","deliveries":3},{"window":"09-11","deliveries":5},{"window":"11-13","deliveries":4}]'::jsonb);

-- Mock seed: process times (WS608)
INSERT INTO public.comprovei_process_times (route_external_id, driver_name, permanence_minutes, travel_minutes, wait_minutes, unload_minutes, sequence_original, sequence_executed, distance_traveled_km, distance_estimated_km, route_started_at, route_finished_at)
VALUES
  ('CMP-RT-1001', 'Carlos Silva',   140, 220, 35, 95, 22, 22, 64.5,  92.0, '2025-05-14 06:42+00', NULL),
  ('CMP-RT-1003', 'Lucas Rodrigues',180, 310, 45, 125, 26, 26, 118.2, 120.0, '2025-05-13 06:30+00', '2025-05-13 13:54+00');

-- Mock seed: route avg (WS610)
INSERT INTO public.comprovei_route_avg (route_external_id, driver_name, route_type, goal_departure, avg_in_transit, avg_arrival_base, planned_end)
VALUES
  ('CMP-RT-1001', 'Carlos Silva',    'Urbana SP', '06:30', '04:12', '13:42', '13:30'),
  ('CMP-RT-1002', 'Pedro Santos',    'Urbana SP', '07:00', '05:05', '13:18', '12:30'),
  ('CMP-RT-1003', 'Lucas Rodrigues', 'Urbana SP', '06:15', '04:48', '13:54', '14:00');