"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DatabaseIcon, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function SupabaseSetup() {
  const [isChecking, setIsChecking] = useState(false);
  const [isRunningMigrations, setIsRunningMigrations] = useState(false);
  const [dbStatus, setDbStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if the employees table exists
  const checkDatabase = async () => {
    setIsChecking(true);
    setErrorMessage(null);
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // Try to query the employees table
      const { error } = await supabase.from('employees').select('id').limit(1);
      
      if (error) {
        console.error('Database check error:', error);
        setDbStatus('error');
        setErrorMessage(error.message);
        return;
      }
      
      setDbStatus('ok');
      toast({
        title: "Database check successful",
        description: "Your Supabase database is properly configured.",
      });
    } catch (error: any) {
      console.error('Database check error:', error);
      setDbStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsChecking(false);
    }
  };

  // Apply migrations manually
  const applyMigrations = async () => {
    setIsRunningMigrations(true);
    setErrorMessage(null);
    
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Failed to initialize Supabase client');
      }
      
      // We need to execute the SQL in the migration file directly
      // This requires an RPC function on Supabase or admin rights
      // For this example, we'll simulate running the migration
      
      // Execute the full migration script
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
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
          
          -- Drop existing policies to avoid conflicts
          DROP POLICY IF EXISTS "Users can view their own data" ON employees;
          DROP POLICY IF EXISTS "Employees can view their own data" ON employees;
          DROP POLICY IF EXISTS "Employees can view their projects" ON projects;
          DROP POLICY IF EXISTS "Employees can view their tasks" ON tasks;
          DROP POLICY IF EXISTS "Employees can view their attendance" ON attendance_records;
          DROP POLICY IF EXISTS "Employees can view project memberships" ON project_employees;
          
          -- Policies for employees table
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
          
          -- Policies for projects table
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
          
          -- Policies for tasks table
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
          
          -- Policies for attendance_records table
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
          
          -- Policies for project_employees table
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
        `
      });
      
      if (createError) {
        // If the RPC doesn't exist, show alternative instructions
        throw new Error(
          "Could not apply migrations automatically. You need to run the SQL manually in the Supabase SQL editor. " +
          "Please go to your Supabase dashboard and run the migration SQL from your 'supabase/migrations' folder."
        );
      }
      
      toast({
        title: "Migrations applied successfully",
        description: "Your database schema has been updated.",
      });
      
      // Check the database again
      await checkDatabase();
    } catch (error: any) {
      console.error('Migration error:', error);
      setErrorMessage(error.message);
      
      toast({
        variant: "destructive",
        title: "Migration failed",
        description: error.message,
      });
    } finally {
      setIsRunningMigrations(false);
    }
  };

  return (
    <main className="container mx-auto p-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Supabase Setup</CardTitle>
          <CardDescription>
            Check and configure your Supabase database connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DatabaseIcon className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">Database Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Check if your Supabase database is properly configured
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {dbStatus === 'ok' && (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              {dbStatus === 'error' && (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
              <Button 
                variant="outline" 
                onClick={checkDatabase} 
                disabled={isChecking}
                className="ml-2"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Connection"
                )}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DatabaseIcon className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">API Connection Test</h3>
                <p className="text-sm text-muted-foreground">
                  Test the Supabase connection via API
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.open('/api/test-connection', '_blank')}
            >
              Test API Connection
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DatabaseIcon className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">Apply Migrations</h3>
                <p className="text-sm text-muted-foreground">
                  Create the necessary tables in your Supabase database
                </p>
              </div>
            </div>
            <Button 
              variant="default" 
              onClick={applyMigrations} 
              disabled={isRunningMigrations}
            >
              {isRunningMigrations ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Migrations...
                </>
              ) : (
                "Apply Migrations"
              )}
            </Button>
          </div>
          
          {errorMessage && (
            <div className="mt-4 p-4 border border-red-300 bg-red-50 rounded-md text-red-800">
              <h4 className="font-semibold">Error:</h4>
              <p className="text-sm">{errorMessage}</p>
              
              <div className="mt-4">
                <h4 className="font-semibold">Manual Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
                  <li>Go to your <a href="https://app.supabase.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
                  <li>Select your project</li>
                  <li>Go to the SQL Editor</li>
                  <li>Create a new query</li>
                  <li>Copy and paste the following SQL code:</li>
                </ol>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-md overflow-auto text-xs font-mono">
                  {`-- Enable UUID extension
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

-- Policies for employees table
CREATE POLICY "Employees can view their own data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own employee record"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

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

-- Policies for projects table
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

-- Policies for tasks table
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

-- Policies for attendance_records table
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

-- Policies for project_employees table
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
  USING (employee_id = auth.uid());`}
                </div>
                
                <div className="mt-4">
                  <h4 className="font-semibold">After Running SQL:</h4>
                  <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
                    <li>Return to this page</li>
                    <li>Click "Check Connection" to verify your tables have been created</li>
                    <li>You should now be able to use the authentication system</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Make sure your Supabase project has the correct permissions and RLS policies.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}