-- =========================================================================
-- NativeYard: Supabase Database Schema & Storage Setup
-- Run this script in the Supabase SQL Editor (supabase.com/dashboard)
-- =========================================================================

-- 1. Profiles Table (Mirrors auth.users with public profile metadata)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to automatically create a profile record when a user signs in with Google
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Properties Table (Allows homeowners to analyze multiple homes / addresses)
create table if not exists public.properties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Primary Residence',
  address text,
  city text,
  state text default 'NJ',
  zip text,
  hardiness_zone text default '7a',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.properties enable row level security;

create policy "Users can manage their own properties"
  on public.properties for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3. Yard Areas Table (e.g., Front Yard, Back Yard, Side Yard, Pollinator Strip)
create table if not exists public.yard_areas (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties on delete cascade not null,
  name text not null default 'Front Yard',
  area_type text default 'front', -- 'front', 'back', 'side', 'patio', 'other'
  sun_exposure text default 'partial_sun', -- 'full_sun', 'partial_sun', 'shade'
  soil_type text default 'loam', -- 'loam', 'clay', 'sandy', 'wet'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.yard_areas enable row level security;

create policy "Users can manage their yard areas"
  on public.yard_areas for all
  using (
    property_id in (select id from public.properties where user_id = auth.uid())
  )
  with check (
    property_id in (select id from public.properties where user_id = auth.uid())
  );


-- 4. Yard Scans & Ecological Audits Table
create table if not exists public.yard_scans (
  id uuid default gen_random_uuid() primary key,
  yard_area_id uuid references public.yard_areas on delete cascade not null,
  photo_url text not null,
  native_score integer not null,
  grade text not null,
  plants_count integer not null default 0,
  native_count integer not null default 0,
  non_native_count integer not null default 0,
  invasive_count integer not null default 0,
  keystone_count integer not null default 0,
  detected_plants jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.yard_scans enable row level security;

create policy "Users can manage their yard scans"
  on public.yard_scans for all
  using (
    yard_area_id in (
      select ya.id from public.yard_areas ya
      join public.properties p on p.id = ya.property_id
      where p.user_id = auth.uid()
    )
  )
  with check (
    yard_area_id in (
      select ya.id from public.yard_areas ya
      join public.properties p on p.id = ya.property_id
      where p.user_id = auth.uid()
    )
  );


-- 5. Storage Bucket Configuration for Yard Photos
-- Run in Storage settings or SQL editor:
insert into storage.buckets (id, name, public)
values ('yard-photos', 'yard-photos', true)
on conflict (id) do nothing;

create policy "Public Access to Yard Photos"
  on storage.objects for select
  using (bucket_id = 'yard-photos');

create policy "Authenticated Users Can Upload Yard Photos"
  on storage.objects for insert
  with check (
    bucket_id = 'yard-photos' 
    and auth.role() = 'authenticated'
  );

create policy "Users Can Delete Own Yard Photos"
  on storage.objects for delete
  using (
    bucket_id = 'yard-photos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- 6. Unified Plants Table (Curated New Jersey Flora Database)
create table if not exists public.plants (
  id text primary key,
  scientific_name text not null unique,
  common_name text not null,
  synonyms text[] default '{}',
  status text not null,
  nj_status text not null,
  type text not null,
  growth_habit text,
  sun text default 'Full Sun / Partial Shade',
  moisture text default 'Medium',
  bloom text default 'Summer',
  height text default '2–6 ft',
  lepidoptera integer default 0,
  specialist_bee_support boolean default false,
  deer_resistance text default 'MODERATE',
  description text,
  image_url text,
  swap_plant_ids text[] default '{}',
  removal jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.plants enable row level security;

-- Public can read all plants
create policy "Anyone can read plants catalog"
  on public.plants for select
  using (true);

-- Authenticated curators can insert and update plants
create policy "Authenticated users can insert plants"
  on public.plants for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update plants"
  on public.plants for update
  using (auth.role() = 'authenticated');

