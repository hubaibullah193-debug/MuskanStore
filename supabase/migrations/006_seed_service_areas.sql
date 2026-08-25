-- 006_seed_service_areas.sql
-- Seed initial service areas for order delivery validation

INSERT INTO public.service_areas (city, is_active)
VALUES
  ('Karachi', true),
  ('Lahore', true),
  ('Islamabad', true),
  ('Rawalpindi', true),
  ('Faisalabad', true),
  ('Multan', true),
  ('Peshawar', true),
  ('Quetta', true),
  ('Sialkot', true),
  ('Gujranwala', true)
ON CONFLICT DO NOTHING;
