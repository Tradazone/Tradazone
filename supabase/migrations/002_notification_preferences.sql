-- Add notification_preferences column to users table
-- Run in Supabase SQL Editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    DEFAULT '{"payments":true,"invoices":true,"checkouts":false,"marketing":false}'::jsonb;
