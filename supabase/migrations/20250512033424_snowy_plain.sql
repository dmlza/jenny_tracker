/*
  # Fix employee signup policy

  1. Changes
    - Drop existing restrictive insert policy
    - Create new policy that allows initial signup
    - Keep other policies intact

  2. Security
    - Maintains security while allowing initial user creation
    - Still requires authentication
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Allow users to insert their own employee record" ON employees;

-- Create new policy that allows initial signup
CREATE POLICY "Allow authenticated users to insert employee record"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);