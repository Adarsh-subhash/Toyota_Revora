-- ==========================================
-- TOYOTA REVORA INCENTIVE ENGINE DATABASE SCHEMA
-- Copy and paste this script into the Supabase SQL Editor
-- (Database -> SQL Editor -> New Query -> Run)
-- ==========================================

-- 1. Create toyota_profiles table (Admins & Sales Officers)
CREATE TABLE IF NOT EXISTS toyota_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    first TEXT NOT NULL,
    hub TEXT NOT NULL,
    region TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'officer')),
    initials TEXT,
    target INTEGER DEFAULT 12,
    rank TEXT,
    rank_speed TEXT,
    sales_history INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0]::INTEGER[],
    payout_history INTEGER[] DEFAULT ARRAY[0,0,0,0,0,0,0,0]::INTEGER[],
    current_month_sales JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create toyota_slabs table (Active Incentive Slabs)
CREATE TABLE IF NOT EXISTS toyota_slabs (
    id INTEGER PRIMARY KEY,
    min_units INTEGER NOT NULL,
    max_units INTEGER NOT NULL,
    rate_per_car INTEGER NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create toyota_inventory table (Car Models & Variant Options)
CREATE TABLE IF NOT EXISTS toyota_inventory (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    suffix TEXT NOT NULL,
    variant TEXT NOT NULL,
    price BIGINT NOT NULL,
    category TEXT NOT NULL,
    photo TEXT,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create toyota_settings table (Workspace standard parameters)
CREATE TABLE IF NOT EXISTS toyota_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Create toyota_activities table (Operation transactions history feed)
CREATE TABLE IF NOT EXISTS toyota_activities (
    id BIGINT PRIMARY KEY,
    user_name TEXT NOT NULL,
    detail TEXT NOT NULL,
    time_label TEXT NOT NULL,
    value_label TEXT,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Create toyota_sales_log table (Sales Officer vehicle delivery history log)
CREATE TABLE IF NOT EXISTS toyota_sales_log (
    id BIGINT PRIMARY KEY,
    officer_id TEXT NOT NULL REFERENCES toyota_profiles(id) ON DELETE CASCADE,
    car_name TEXT NOT NULL,
    variant TEXT NOT NULL,
    price BIGINT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Create toyota_slab_schedules table (Scheduled Slab Adjustments log)
CREATE TABLE IF NOT EXISTS toyota_slab_schedules (
    id BIGINT PRIMARY KEY,
    target_date DATE NOT NULL,
    target_slab_id INTEGER NOT NULL REFERENCES toyota_slabs(id) ON DELETE CASCADE,
    new_rate INTEGER NOT NULL,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Disable Row Level Security (RLS) across all tables to allow public client-side direct interactions
ALTER TABLE toyota_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_slabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_sales_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE toyota_slab_schedules DISABLE ROW LEVEL SECURITY;
