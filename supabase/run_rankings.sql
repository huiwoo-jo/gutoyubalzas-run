-- 구토유발자들 RUN 랭킹 (Supabase SQL Editor에서 한 번 실행)
-- 누구나 읽기, 추가만 가능 (수정, 삭제 불가)
create table if not exists public.run_rankings (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 6),
  score integer not null check (score between 1 and 100000000),
  created_at timestamptz not null default now()
);

create index if not exists run_rankings_score_idx on public.run_rankings (score desc, created_at);

alter table public.run_rankings enable row level security;

create policy "run_rankings read" on public.run_rankings
  for select to anon, authenticated using (true);

create policy "run_rankings insert" on public.run_rankings
  for insert to anon, authenticated with check (true);

-- 추가 기록 (기존 기록은 null)
alter table public.run_rankings
  add column if not exists round integer check (round between 1 and 1000),
  add column if not exists distance integer check (distance between 0 and 10000000),   -- m
  add column if not exists notes integer check (notes between 0 and 1000000),
  add column if not exists members integer check (members between 1 and 5);

create index if not exists run_rankings_created_idx on public.run_rankings (created_at desc);

-- 내 기록: 브라우저마다 만든 무작위 ID (개인정보 아님)
alter table public.run_rankings add column if not exists player uuid;
create index if not exists run_rankings_player_idx on public.run_rankings (player, score desc);

-- members(모인 인원) 칸은 더 이상 쓰지 않음 (라운드로 대신, 지우려면 아래 실행)
-- alter table public.run_rankings drop column if exists members;

-- 달리기 모드: 'crew' 5인 달리기, 멤버 id 캐릭터 달리기 (기존 기록은 crew)
alter table public.run_rankings add column if not exists mode text not null default 'crew'
  check (mode in ('crew', 'jinwoo', 'gito', 'beobyoung', 'donghun', 'jangdan'));
create index if not exists run_rankings_mode_idx on public.run_rankings (mode, score desc);
