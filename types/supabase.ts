export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          avatar_url: string | null
          attendance_rate: number | null
          tasks_total: number | null
          tasks_completed: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name: string
          role: string
          avatar_url?: string | null
          attendance_rate?: number | null
          tasks_total?: number | null
          tasks_completed?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          avatar_url?: string | null
          attendance_rate?: number | null
          tasks_total?: number | null
          tasks_completed?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          progress: number | null
          deadline: string | null
          team_size: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          progress?: number | null
          deadline?: string | null
          team_size?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          progress?: number | null
          deadline?: string | null
          team_size?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assigned_to: string | null
          project_id: string | null
          status: string
          priority: string
          due_date: string | null
          time_logged: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assigned_to?: string | null
          project_id?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          time_logged?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          project_id?: string | null
          status?: string
          priority?: string
          due_date?: string | null
          time_logged?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      attendance_records: {
        Row: {
          id: string
          employee_id: string | null
          date: string
          status: string
          notes: string | null
          submit_time: string | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          employee_id?: string | null
          date: string
          status: string
          notes?: string | null
          submit_time?: string | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          employee_id?: string | null
          date?: string
          status?: string
          notes?: string | null
          submit_time?: string | null
          ip_address?: string | null
        }
      }
      project_employees: {
        Row: {
          project_id: string
          employee_id: string
          joined_at: string | null
        }
        Insert: {
          project_id: string
          employee_id: string
          joined_at?: string | null
        }
        Update: {
          project_id?: string
          employee_id?: string
          joined_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
  }
}