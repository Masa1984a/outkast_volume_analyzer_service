import { sql } from '@vercel/postgres';

export { sql };

// Database client is directly exported from @vercel/postgres
// Use it like: await sql`SELECT * FROM fills WHERE date_str = ${dateStr}`

export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
