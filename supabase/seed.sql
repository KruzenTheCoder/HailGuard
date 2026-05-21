-- HailGuard — seed data (Johannesburg metro)
--
-- Applied by `supabase db reset`. Safe to run repeatedly — re-running upserts
-- polygon geometry, fees and descriptions on the named zones below. Zones
-- left over from earlier seeds that aren't in this file are removed only if
-- nothing references them, so seeded drivers / subscriptions are preserved.

-- ---------------------------------------------------------------------------
-- Clean up stale seed zones from earlier revisions (city-level singletons)
-- ---------------------------------------------------------------------------
delete from public.zones
 where name in ('Cape Town CBD', 'Durban Central', 'Pretoria CBD')
   and id not in (select zone_id from public.subscriptions);

-- ---------------------------------------------------------------------------
-- Johannesburg metro zones — eight overlapping coverage areas with organic
-- polygons (~8 vertices each) so the compliance map shows real coverage tiles
-- instead of single rectangles per city.
-- ---------------------------------------------------------------------------
insert into public.zones (name, description, monthly_fee, yearly_fee, polygon_coordinates)
values
  (
    'Johannesburg CBD',
    'Central business district inside the M1/M2 inner ring.',
    450.00, 4500.00,
    '[[28.025,-26.195],[28.040,-26.190],[28.055,-26.198],[28.058,-26.212],[28.048,-26.222],[28.030,-26.220],[28.020,-26.210],[28.022,-26.200],[28.025,-26.195]]'::jsonb
  ),
  (
    'Braamfontein',
    'University precinct between the CBD and Parktown.',
    400.00, 4000.00,
    '[[28.030,-26.170],[28.050,-26.168],[28.060,-26.178],[28.055,-26.192],[28.040,-26.195],[28.022,-26.190],[28.018,-26.180],[28.030,-26.170]]'::jsonb
  ),
  (
    'Sandton',
    'Northern financial hub — Sandton CBD and surrounds.',
    650.00, 6500.00,
    '[[28.040,-26.090],[28.060,-26.085],[28.078,-26.095],[28.082,-26.110],[28.072,-26.122],[28.050,-26.124],[28.035,-26.110],[28.030,-26.095],[28.040,-26.090]]'::jsonb
  ),
  (
    'Rosebank',
    'Restaurant and retail belt south of Sandton.',
    550.00, 5500.00,
    '[[28.030,-26.130],[28.050,-26.128],[28.060,-26.140],[28.055,-26.152],[28.040,-26.155],[28.025,-26.150],[28.020,-26.140],[28.030,-26.130]]'::jsonb
  ),
  (
    'Randburg',
    'Western suburban node — Cresta and Ferndale included.',
    450.00, 4500.00,
    '[[27.965,-26.080],[27.990,-26.078],[28.010,-26.090],[28.012,-26.110],[27.998,-26.122],[27.975,-26.118],[27.960,-26.105],[27.962,-26.092],[27.965,-26.080]]'::jsonb
  ),
  (
    'Alexandra',
    'East of Sandton — high-density township and Marlboro corridor.',
    350.00, 3500.00,
    '[[28.085,-26.090],[28.110,-26.088],[28.122,-26.100],[28.118,-26.115],[28.100,-26.120],[28.085,-26.115],[28.080,-26.105],[28.085,-26.090]]'::jsonb
  ),
  (
    'Roodepoort',
    'Far west — Florida, Constantia Kloof and Wilropark.',
    400.00, 4000.00,
    '[[27.830,-26.140],[27.870,-26.135],[27.895,-26.150],[27.892,-26.175],[27.870,-26.185],[27.840,-26.180],[27.820,-26.165],[27.822,-26.150],[27.830,-26.140]]'::jsonb
  ),
  (
    'Soweto',
    'South-western metro — Orlando, Diepkloof and Pimville.',
    350.00, 3500.00,
    '[[27.840,-26.240],[27.890,-26.235],[27.920,-26.255],[27.928,-26.285],[27.900,-26.305],[27.860,-26.300],[27.830,-26.282],[27.828,-26.260],[27.840,-26.240]]'::jsonb
  ),
  (
    'Midrand',
    'Northern growth corridor between Sandton and Pretoria.',
    500.00, 5000.00,
    '[[28.105,-25.975],[28.140,-25.972],[28.165,-25.992],[28.162,-26.015],[28.135,-26.025],[28.105,-26.020],[28.092,-26.005],[28.095,-25.985],[28.105,-25.975]]'::jsonb
  )
on conflict (name) do update
   set description         = excluded.description,
       monthly_fee         = excluded.monthly_fee,
       yearly_fee          = excluded.yearly_fee,
       polygon_coordinates = excluded.polygon_coordinates,
       is_active           = true;
