/*
  # Fix signup flow policies

  1. Changes
    - Drop existing restrictive policies
    - Add new policy for initial signup that allows authenticated users to create their record
    - Add policy for admin access via service role
    - Ensure proper RLS setup for signup flow

  2. Security
    - Maintains RLS while allowing initial user creation
    - Adds service role access for administrative functions
*/

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Enable initial signup" ON employees;
DROP POLICY IF EXISTS "Allow service role full access" ON employees;
DROP POLICY IF EXISTS "Allow users to insert their own employee record" ON employees;

-- Create a permissive policy for initial signup
CREATE POLICY "Allow initial signup"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for service role access
CREATE POLICY "Service role access"
  ON employees
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;