-- HailGuard — seed data
-- Applied by `supabase db reset`. Safe to run repeatedly (idempotent on name).

insert into public.zones (name, description, monthly_fee, yearly_fee, currency, polygon_coordinates)
values
  (
    'Johannesburg CBD',
    'Central Johannesburg business district.',
    450.00, 4500.00, 'ZAR',
    '[[28.030,-26.190],[28.055,-26.190],[28.055,-26.215],[28.030,-26.215],[28.030,-26.190]]'::jsonb
  ),
  (
    'Sandton',
    'Sandton commercial and financial hub.',
    600.00, 6000.00, 'ZAR',
    '[[28.045,-26.095],[28.070,-26.095],[28.070,-26.120],[28.045,-26.120],[28.045,-26.095]]'::jsonb
  ),
  (
    'Cape Town CBD',
    'Cape Town city centre and waterfront.',
    550.00, 5500.00, 'ZAR',
    '[[18.405,-33.905],[18.435,-33.905],[18.435,-33.935],[18.405,-33.935],[18.405,-33.905]]'::jsonb
  ),
  (
    'Durban Central',
    'Durban beachfront and central business district.',
    400.00, 4000.00, 'ZAR',
    '[[31.005,-29.845],[31.035,-29.845],[31.035,-29.875],[31.005,-29.875],[31.005,-29.845]]'::jsonb
  ),
  (
    'Pretoria CBD',
    'Pretoria central business district.',
    400.00, 4000.00, 'ZAR',
    '[[28.180,-25.740],[28.205,-25.740],[28.205,-25.765],[28.180,-25.765],[28.180,-25.740]]'::jsonb
  )
on conflict (name) do nothing;
