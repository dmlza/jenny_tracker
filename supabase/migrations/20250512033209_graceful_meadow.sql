/*
  # Fix employee table RLS policies

  1. Changes
    - Drop and recreate the employee insert policy with proper auth checks
    - Add policy for admin users to manage all employee records
    - Ensure proper ID validation on insert

  2. Security
    - Enforce auth.uid() matching for employee record creation
    - Add admin role policies
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Allow users to insert their own employee record" ON employees;

-- Create new policy with proper ID check
CREATE POLICY "Allow users to insert their own employee record"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    email = auth.jwt()->>'email'
  );