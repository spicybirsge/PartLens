import { drizzle } from 'drizzle-orm/node-postgres'; 
import { migrate } from 'drizzle-orm/node-postgres/migrator'; 
import { sql } from 'drizzle-orm';
import { Pool } from 'pg'; 
import * as schema from './schema.js';



const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
});


export const database = drizzle(pool, { schema });

export async function initializeDatabase() {
  try {
 
    await database.execute(sql`SELECT 1`);
    console.log('[^] Connected to postgres');


   
      await migrate(database, { migrationsFolder: './drizzle' });
      console.log('[^] Postgres database migrations applied (if exist)');

  } catch (error) {
    console.error('[!] Postgres database initialization failed:');
    console.error(error);
    process.exit(1); 
  }
}