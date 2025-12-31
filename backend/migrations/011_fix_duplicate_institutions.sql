-- Fix Duplicate Institutions
-- Migration: 011_fix_duplicate_institutions.sql
-- Run this in Supabase SQL Editor to remove duplicates

-- Remove duplicate institutions, keeping only the first one by created_at
DELETE FROM institutions a
USING institutions b
WHERE a.id > b.id
AND a.name = b.name;

-- Verify no duplicates remain
SELECT name, COUNT(*) as count 
FROM institutions 
GROUP BY name 
HAVING COUNT(*) > 1;
