import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  const diagnostics = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} characters` : 'Not set',
    databaseUrlSet: process.env.DATABASE_URL ? 'Yes' : 'No',
    nodeEnv: process.env.NODE_ENV || 'Not set'
  };

  try {
    // Test Supabase connection
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ 
        error: 'Failed to initialize Supabase client',
        diagnostics
      }, { status: 500 });
    }

    // Test basic Supabase auth (just verify the service is reachable)
    const { data: authData, error: authError } = await supabase.auth.getSession();

    // Test database connection with a specific employees query
    const { data: employeeData, error: employeeError } = await supabase.from('employees').select('*').limit(1);

    // Test a simpler public query that doesn't need auth
    const { data: publicData, count: publicCount, error: publicError } = await supabase
  .from('employees')
  .select('*', { count: 'exact', head: false })
  .limit(1);

    // Combine all results
    const results = {
      status: employeeError || authError || publicError ? 'error' : 'success',
      supabaseConnected: true,
      authStatus: {
        success: !authError,
        session: authData?.session ? 'Present' : 'None',
        error: authError ? {
          message: authError.message,
          code: authError.code,
        } : null
      },
      employeeQuery: {
        success: !employeeError,
        data: employeeData,
        error: employeeError ? {
          message: employeeError.message,
          code: employeeError.code,
          hint: employeeError.hint || null,
          details: employeeError.details || null
        } : null
      },
      publicQuery: {
        success: !publicError,
        data: publicData,
        error: publicError ? {
          message: publicError.message,
          code: publicError.code,
          hint: publicError.hint || null,
          details: publicError.details || null
        } : null
      },
      diagnostics
    };

    return NextResponse.json(results, { 
      status: results.status === 'success' ? 200 : 500 
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      diagnostics,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}