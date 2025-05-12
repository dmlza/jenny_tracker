/*
  # Fix employee signup policy

  1. Changes
    - Drop existing restrictive policies
    - Add new policy allowing initial signup
    - Add policy for service role access
  
  2. Security
    - Maintains RLS while allowing proper signup flow
    - Ensures data integrity with auth.uid() check
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Allow authenticated users to insert employee record" ON employees;
DROP POLICY IF EXISTS "Allow users to insert their own employee record" ON employees;

-- Create new policy for initial signup
CREATE POLICY "Enable initial signup"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure the user can only create their own record
    auth.uid() = id
  );

-- Create policy for service role access
CREATE POLICY "Allow service role full access"
  ON employees
  TO service_role
  USING (true)
  WITH CHECK (true);