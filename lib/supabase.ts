import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// This ensures the environment variables are available and handles cases where they might be undefined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Log Supabase connection info (without sensitive data)
if (typeof window !== 'undefined') {
  console.log(`Initializing Supabase client with URL: ${supabaseUrl}`);
}

// Check if we have the required environment variables
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create a singleton instance of the Supabase client
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'game-studio-auth-token',
          // Debug logs for auth issues
          debug: typeof window !== 'undefined',
        },
      });
      
      // Test the connection
      if (typeof window !== 'undefined') {
        supabaseInstance.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session ? 'User authenticated' : 'No session');
        });
      }
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
      return null;
    }
  }
  return supabaseInstance;
};

// Helper for checking if database tables are set up correctly
export const checkDatabaseSetup = async () => {
  const client = getSupabase();
  if (!client) return { success: false, message: 'Supabase client not initialized' };

  try {
    // Check if employees table exists by attempting to query it
    const { error } = await client.from('employees').select('id').limit(1);
    
    if (error) {
      if (error.code === '42P01') { // Table does not exist
        return { success: false, message: 'Employees table does not exist', needsMigration: true };
      }
      return { success: false, message: error.message };
    }
    
    return { success: true, message: 'Database setup is correct' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
};

// For backward compatibility
export const supabase = getSupabase();