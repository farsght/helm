import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('./db/data.db');
const db = drizzle(sqlite);

async function main() {
  console.log('Running migrations...');
  migrate(db, { migrationsFolder: './db/migrations' });
  console.log('Migrations complete!');
}

main();
