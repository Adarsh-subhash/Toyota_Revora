-- ==========================================
-- TOYOTA REVORA — REQUIRED MIGRATIONS
-- Run ALL of these in Supabase SQL Editor:
-- Database → SQL Editor → New Query → Paste everything → Run
-- ==========================================

-- MIGRATION 1: Fix toyota_inventory id column overflow
ALTER TABLE toyota_inventory ALTER COLUMN id TYPE BIGINT;

-- MIGRATION 2: Automatically Create Storage Bucket for Car Images
-- This creates the "car-images" bucket and sets it to public
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-images', 'car-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- MIGRATION 3: Storage Access Policies
-- 1. Allow public to view images
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'car-images');

-- 2. Allow our app to upload images (since we disabled RLS for admin ease)
CREATE POLICY "Public Insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'car-images');

CREATE POLICY "Public Update" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'car-images');

-- Confirm migrations
SELECT 'Migration successful! Storage bucket created and inventory ID updated.' as status;
