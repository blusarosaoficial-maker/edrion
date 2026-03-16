-- Lead captures: stores name + WhatsApp for coupon-based conversion
create table if not exists public.lead_captures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  email text,
  handle text,
  coupon_code text,
  converted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Allow anonymous inserts (visitor hasn't logged in yet)
alter table public.lead_captures enable row level security;

create policy "Anyone can insert lead captures"
  on public.lead_captures for insert
  with check (true);

-- Only service_role can read/update (for admin dashboard / follow-up)
create policy "Service role can read lead captures"
  on public.lead_captures for select
  using (auth.role() = 'service_role');

create policy "Service role can update lead captures"
  on public.lead_captures for update
  using (auth.role() = 'service_role');
