/*
  # Fix Employee RLS Policies

  1. Changes
    - Update the INSERT policy for employees table to ensure user can only insert their own record
    - Drop the existing overly permissive policy
    - Add new policy with proper ID check

  2. Security
    - Ensures users can only create employee records with their own auth ID
    - Maintains existing RLS protection
*/

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow users to insert their own employee record" ON employees;

-- Create new policy with proper ID check
CREATE POLICY "Allow users to insert their own employee record"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);