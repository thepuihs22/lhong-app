-- Migration: Add cost tracking to expenses
-- Run this in your Supabase SQL Editor

-- Add paid_by field to expenses table
ALTER TABLE expenses 
ADD COLUMN paid_by UUID REFERENCES profiles(id);

-- Create expense_contributors table to track who contributed and how much
CREATE TABLE expense_contributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  contributor_name TEXT NOT NULL,
  contribution_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on expense_contributors
ALTER TABLE expense_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_contributors
CREATE POLICY "Only admins can view expense contributors" ON expense_contributors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can create expense contributors" ON expense_contributors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update expense contributors" ON expense_contributors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete expense contributors" ON expense_contributors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

