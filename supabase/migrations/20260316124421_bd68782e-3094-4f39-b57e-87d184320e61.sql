-- Referral system tables and function

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null unique,
  signups_count integer not null default 0,
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  constraint referrals_user_id_unique unique (user_id)
);

create table if not exists public.referral_signups (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint referral_signups_referred_unique unique (referred_user_id)
);

alter table public.referrals enable row level security;
alter table public.referral_signups enable row level security;

create policy "Users can read own referral"
  on public.referrals for select
  using (auth.uid() = user_id);

create policy "Users can create own referral"
  on public.referrals for insert
  with check (auth.uid() = user_id);

create policy "Service role full access referrals"
  on public.referrals for all
  using (auth.role() = 'service_role');

create policy "Service role full access referral_signups"
  on public.referral_signups for all
  using (auth.role() = 'service_role');

create policy "Authenticated can insert referral signup"
  on public.referral_signups for insert
  with check (auth.uid() = referred_user_id);

create or replace function public.process_referral_signup(p_referral_code text, p_referred_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_id uuid;
  v_user_id uuid;
  v_count integer;
begin
  select id, user_id into v_referral_id, v_user_id
  from public.referrals
  where referral_code = p_referral_code;

  if v_referral_id is null then return; end if;
  if v_user_id = p_referred_user_id then return; end if;

  insert into public.referral_signups (referral_id, referred_user_id)
  values (v_referral_id, p_referred_user_id)
  on conflict (referred_user_id) do nothing;

  update public.referrals
  set signups_count = (
    select count(*) from public.referral_signups where referral_id = v_referral_id
  )
  where id = v_referral_id;

  select signups_count into v_count from public.referrals where id = v_referral_id;
  if v_count >= 5 then
    update public.referrals set rewarded = true where id = v_referral_id and rewarded = false;
    update public.users_profiles
    set analysis_credits = analysis_credits + 1
    where id = v_user_id;
  end if;
end;
$$;