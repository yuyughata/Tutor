-- Basic details a parent can add on the website's Account page (first name, last name, phone, address, state, gender).
-- One row per parent, written only by that parent. Reader (child) profiles never hold any of this.
create table parent_details (
  parent_id uuid primary key references profiles (id) on delete cascade,
  first_name text check (char_length(first_name) <= 60),
  last_name text check (char_length(last_name) <= 60),
  phone text check (phone ~ '^[0-9+()\- ]{7,20}$'),
  address text check (char_length(address) <= 250),
  state text check (char_length(state) <= 60),
  gender text check (gender in ('female', 'male', 'prefer_not_to_say')),
  updated_at timestamptz not null default now()
);
alter table parent_details enable row level security;
create policy "own details read" on parent_details for select using (parent_id = (select auth.uid()));
create policy "own details insert" on parent_details for insert with check (parent_id = (select auth.uid()));
create policy "own details update" on parent_details for update using (parent_id = (select auth.uid())) with check (parent_id = (select auth.uid()));
revoke all on parent_details from anon;
