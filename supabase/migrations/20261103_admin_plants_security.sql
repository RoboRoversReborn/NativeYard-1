-- ==============================================================================
-- NativeYard Migration: Admin Authorization & Plants Catalog Security
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create table of designated administrators / curators
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin', -- 'admin' | 'curator'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.admin_users enable row level security;

-- Users can read their own admin status
drop policy if exists "Users can check own admin status" on public.admin_users;
create policy "Users can check own admin status"
  on public.admin_users for select
  using (auth.uid() = user_id);

-- 2. Fast security-definer helper function to verify admin status
-- Security definer allows this function to check the admin_users table safely in RLS policies
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where admin_users.user_id = uid
  );
$$;

-- 3. Ensure the unified plants table exists
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

-- 4. Clean up any existing legacy/permissive policies on plants
drop policy if exists "Authenticated users can insert plants" on public.plants;
drop policy if exists "Authenticated users can update plants" on public.plants;
drop policy if exists "Anyone can read plants catalog" on public.plants;
drop policy if exists "Only admins can insert plants" on public.plants;
drop policy if exists "Only admins can update plants" on public.plants;
drop policy if exists "Only admins can delete plants" on public.plants;

-- 5. Apply strict RLS policies on plants table:
-- Public can read all plants
create policy "Anyone can read plants catalog"
  on public.plants for select
  using (true);

-- Only verified admins can insert new plants
create policy "Only admins can insert plants"
  on public.plants for insert
  with check (public.is_admin(auth.uid()) = true);

-- Only verified admins can update existing plants
create policy "Only admins can update plants"
  on public.plants for update
  using (public.is_admin(auth.uid()) = true);

-- Only verified admins can delete plants
create policy "Only admins can delete plants"
  on public.plants for delete
  using (public.is_admin(auth.uid()) = true);

-- 6. Storage Bucket for Botanical Photography Uploads
insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', true)
on conflict (id) do nothing;

drop policy if exists "Public Can View Plant Images" on storage.objects;
drop policy if exists "Admins Can Upload Plant Images" on storage.objects;
drop policy if exists "Admins Can Update Plant Images" on storage.objects;
drop policy if exists "Admins Can Delete Plant Images" on storage.objects;

-- Anyone can view plant images in the public bucket
create policy "Public Can View Plant Images"
  on storage.objects for select
  using (bucket_id = 'plant-images');

-- Only admins can upload new plant images
create policy "Admins Can Upload Plant Images"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-images'
    and public.is_admin(auth.uid()) = true
  );

-- Only admins can update or overwrite plant images
create policy "Admins Can Update Plant Images"
  on storage.objects for update
  using (
    bucket_id = 'plant-images'
    and public.is_admin(auth.uid()) = true
  );

-- Only admins can delete plant images
create policy "Admins Can Delete Plant Images"
  on storage.objects for delete
  using (
    bucket_id = 'plant-images'
    and public.is_admin(auth.uid()) = true
  );
