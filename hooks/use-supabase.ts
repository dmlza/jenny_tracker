import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Custom hook for Supabase authentication
export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Supabase client
    const supabase = getSupabase();
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      setLoading(false);
      return;
    }

    // Get the current session
    const initializeSession = async () => {
      setLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initialize session
    initializeSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, session, loading };
};