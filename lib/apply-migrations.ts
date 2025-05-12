import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';

/**
 * Helper function to apply migrations to Supabase
 * You can call this from a setup script or admin page
 */
export async function applyMigrations() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Failed to initialize Supabase client');
    }

    // Get the migrations directory
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    
    // Check if the directory exists
    if (!fs.existsSync(migrationsDir)) {
      throw new Error('Migrations directory not found');
    }

    // Get all SQL files
    const sqlFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure they're applied in order

    if (sqlFiles.length === 0) {
      throw new Error('No SQL migration files found');
    }

    // Apply each migration
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Applying migration: ${file}`);
      
      // Execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        throw new Error(`Migration failed for ${file}: ${error.message}`);
      }
      
      console.log(`Successfully applied migration: ${file}`);
    }

    return { success: true, message: 'All migrations applied successfully' };
  } catch (error: any) {
    console.error('Migration error:', error.message);
    return { success: false, message: error.message };
  }
}

// If this file is executed directly
if (require.main === module) {
  applyMigrations()
    .then(result => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    });
}