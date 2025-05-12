import postgres from 'postgres';

// This file should only be imported in server components or API routes
// It provides direct SQL access to the database

// DON'T import this in client-side code
if (typeof window !== 'undefined') {
  throw new Error('This module is server-side only');
}

// Make sure DATABASE_URL environment variable is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Remove the [YOUR-PASSWORD] placeholder if it's still there
if (process.env.DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  throw new Error('Please replace [YOUR-PASSWORD] with your actual database password');
}

// Create a postgres client
const sql = postgres(process.env.DATABASE_URL, {
  ssl: true, // Required for Supabase
  max: 10, // Maximum number of connections
  idle_timeout: 30, // Seconds a connection can be idle before being closed
});

export { sql };