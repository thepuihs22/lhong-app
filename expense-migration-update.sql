-- Migration: Update expenses to support custom paid_by name and paid_amount
-- Run this in your Supabase SQL Editor

-- Drop the foreign key constraint if it exists
ALTER TABLE expenses 
DROP CONSTRAINT IF EXISTS expenses_paid_by_fkey;

-- Change paid_by from UUID to TEXT to allow custom names
ALTER TABLE expenses 
ALTER COLUMN paid_by TYPE TEXT;

-- Add paid_amount field to track how much the payer paid
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2);

