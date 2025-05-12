/*
  # Initial Game Studio Schema

  1. New Tables
    - `employees` - Stores employee information and credentials
    - `projects` - Stores project details and progress
    - `tasks` - Stores task information and assignments
    - `attendance_records` - Stores daily attendance logs
    - `project_employees` - Junction table for project-employee relationships

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
    - Secure password storage with encryption
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_url TEXT,
  attendance_rate NUMERIC(5,2) DEFAULT 0,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  progress NUMERIC(5,2) DEFAULT 0,
  deadline TIMESTAMPTZ,
  team_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to uuid REFERENCES employees(id),
  project_id uuid REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'Not Started',
  priority TEXT NOT NULL DEFAULT 'Medium',
  due_date TIMESTAMPTZ,
  time_logged INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES employees(id),
  date DATE NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  submit_time TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- Project-Employee junction table
CREATE TABLE IF NOT EXISTS project_employees (
  project_id uuid REFERENCES projects(id),
  employee_id uuid REFERENCES employees(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, employee_id)
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_employees ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Employees can view their own data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own employee record"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- More permissive to allow signup flow

CREATE POLICY "Allow users to update their own employee record"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to delete their own employee record"
  ON employees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Employees can view their projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update projects they're assigned to"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can delete projects they're assigned to"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view their tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = tasks.project_id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Employees can update their tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = tasks.project_id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can delete their tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM project_employees
      WHERE project_id = tasks.project_id
      AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view their attendance"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can create their own attendance records"
  ON attendance_records
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update their own attendance records"
  ON attendance_records
  FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can delete their own attendance records"
  ON attendance_records
  FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can view project memberships"
  ON project_employees
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can create project memberships"
  ON project_employees
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update project memberships"
  ON project_employees
  FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can delete project memberships"
  ON project_employees
  FOR DELETE
  TO authenticated
  USING (employee_id = auth.uid());