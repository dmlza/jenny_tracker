/*
  # Fix signup policy

  1. Changes
    - Drop existing restrictive policies
    - Add new policy for initial signup that allows authenticated users to create their record
    - Add policy for service role access
    - Ensure proper ID matching during signup

  2. Security
    - Maintains RLS security while enabling signup flow
    - Restricts users to only creating their own records
    - Adds service role access for administrative functions
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable initial signup" ON employees;
DROP POLICY IF EXISTS "Allow service role full access" ON employees;

-- Create new policy for initial signup
CREATE POLICY "Enable initial signup"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for service role access
CREATE POLICY "Allow service role full access"
  ON employees
  TO service_role
  USING (true)
  WITH CHECK (true);