alter table public.agents
  add column if not exists demo_task text,
  add column if not exists demo_steps jsonb not null default '[]'::jsonb,
  add column if not exists demo_result text;

alter table public.agents
  drop constraint if exists agents_demo_steps_is_array;

alter table public.agents
  add constraint agents_demo_steps_is_array
  check (jsonb_typeof(demo_steps) = 'array');
