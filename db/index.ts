import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // Allow build to proceed in non-production without a DB (static analysis, CI, etc.)
  console.warn('[db] DATABASE_URL not set — DB calls will fail at runtime');
}

const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@placeholder/placeholder');
export const db = drizzle(sql, { schema });
