#!/usr/bin/env tsx
/**
 * Migration Runner
 *
 * Usage: tsx scripts/run-migration.ts <migration-file.sql>
 * Example: tsx scripts/run-migration.ts 001_add_sequence_number.sql
 */

import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigration(migrationFile: string) {
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);

  console.log('='.repeat(60));
  console.log('Migration Runner');
  console.log('='.repeat(60));
  console.log(`File: ${migrationFile}`);
  console.log(`Path: ${migrationPath}`);
  console.log('='.repeat(60));

  // Check if file exists
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Read migration SQL
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  console.log('\nMigration SQL:');
  console.log('-'.repeat(60));
  console.log(migrationSQL);
  console.log('-'.repeat(60));

  // Confirm execution
  console.log('\n⚠️  This will modify the database schema.');
  console.log('Make sure you have a backup before proceeding.');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    console.log('🚀 Executing migration...\n');

    // Execute migration
    const result = await sql.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log(`Command: ${result.command || 'N/A'}`);
    console.log(`Rows affected: ${result.rowCount || 0}`);

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration finished');
  console.log('='.repeat(60));
}

// Main
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file.sql>');
  console.error('Example: tsx scripts/run-migration.ts 001_add_sequence_number.sql');
  process.exit(1);
}

runMigration(migrationFile);
