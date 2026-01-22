import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function migrate() {
  console.log('Starting database migration...');

  try {
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Remove comments and split into statements
    const lines = schema.split('\n');
    const sqlLines = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');

    // Split by semicolon and filter empty statements
    const statements = sqlLines
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);

      await sql.query(statement + ';');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
