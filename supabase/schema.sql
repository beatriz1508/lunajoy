-- ================================================================
-- Sales Consultant Platform — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. PROFILES (one per auth user, auto-created on signup)
-- ----------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  xp           integer not null default 0,
  level        integer not null default 1,
  level_name   text    not null default 'Rookie',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile when a new user signs up via OAuth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ----------------------------------------------------------------
-- 2. KNOWLEDGE ENTRIES (shared across the entire team)
-- ----------------------------------------------------------------
create table public.knowledge_entries (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null,
  tag_industry    text,
  tag_deal_stage  text,
  tag_objection   text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table public.knowledge_entries enable row level security;

create policy "Authenticated users can read knowledge"
  on public.knowledge_entries for select
  to authenticated using (true);

create policy "Authenticated users can insert knowledge"
  on public.knowledge_entries for insert
  to authenticated with check (auth.uid() = created_by);

create policy "Creator can delete their knowledge"
  on public.knowledge_entries for delete
  to authenticated using (auth.uid() = created_by);


-- ----------------------------------------------------------------
-- 3. HISTORY ENTRIES (per user)
-- ----------------------------------------------------------------
create table public.history_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         text not null check (type in ('copilot', 'brainstorm', 'training')),
  title        text not null,
  summary      text not null default '',
  full_content text not null default '',
  score        integer,
  xp_earned    integer,
  created_at   timestamptz not null default now()
);

alter table public.history_entries enable row level security;

create policy "Users manage their own history"
  on public.history_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index history_entries_user_id_idx on public.history_entries(user_id);
create index history_entries_created_at_idx on public.history_entries(created_at desc);


-- ----------------------------------------------------------------
-- 4. TRAINING PROGRESS (per user, per scenario)
-- ----------------------------------------------------------------
create table public.training_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  completed   boolean not null default false,
  score       integer,
  xp_earned   integer,
  updated_at  timestamptz not null default now(),
  unique (user_id, scenario_id)
);

alter table public.training_progress enable row level security;

create policy "Users manage their own training progress"
  on public.training_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ----------------------------------------------------------------
-- 5. SEED — Starter knowledge entries (run once)
-- ----------------------------------------------------------------
insert into public.knowledge_entries (title, content, tag_objection, tag_deal_stage) values
(
  'Handling Price Objections Like a Consultant',
  E'When a prospect says "it\'s too expensive", never defend the price immediately. Instead, ask: "Compared to what? What\'s the cost of NOT solving this problem?"\n\nThe real objection is rarely price — it\'s unclear ROI. Your job is to build the business case together with the prospect. Calculate the cost of the status quo: lost revenue, wasted time, compliance risk.\n\nWinning argument: "Our average customer sees ROI in 4.2 months. What would a 10% improvement in your team\'s productivity be worth annually?"\n\nKey technique: Reframe the conversation from "cost of our solution" to "cost of inaction."',
  'price',
  'negotiation'
),
(
  'Navigating the Champion vs. Decision Maker Gap',
  E'Your champion loves you but the final decision maker is invisible. This is the #1 deal killer.\n\nAsk your champion: "Who else will be in the room when the final decision is made? What keeps THEM up at night?" Then craft a separate business case tailored to that person\'s KPIs.\n\nKey question to qualify: "Have you bought something like this before? How did that decision get made?" This reveals the real buying process without seeming pushy.\n\nRed flag: If your champion can\'t get you a meeting with the economic buyer after 3 attempts, the deal is likely stuck.',
  'stakeholder',
  'qualification'
),
(
  'Competitive Displacement: Make Them Feel the Switching Cost',
  E'When a prospect is already using a competitor, don\'t attack the competitor. Instead, ask "discovery" questions that reveal gaps:\n\n"What\'s one thing you wish your current solution did better?" and "If you could wave a magic wand, what would your ideal process look like?"\n\nThen map every gap to your differentiator. The goal is to make THEM conclude they need to switch — not to convince them. Consultants facilitate decisions; reps try to persuade.\n\nPowerful question: "On a scale of 1-10, how satisfied are you with [competitor]? What would make it a 10?" The delta between their answer and 10 is your opening.',
  'competitor',
  'evaluation'
);
