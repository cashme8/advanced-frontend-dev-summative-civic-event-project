/**
 * setup-db.js
 * Creates the database (if missing) and runs migrations/001_create_tables.sql
 * using the credentials in .env. Works without the `psql` CLI.
 *
 * Usage:  node scripts/setup-db.js
 */
import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
const { Client } = pkg;

const cfg = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
};
const dbName = process.env.DB_NAME;

// 1. Create the database if it does not exist
const admin = new Client({ ...cfg, database: 'postgres' });
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}"`);
} else {
    console.log(`Database "${dbName}" already exists`);
}
await admin.end();

// 2. Run the migration file
const client = new Client({ ...cfg, database: dbName });
await client.connect();
const tableCheck = await client.query("SELECT to_regclass('public.users') AS t");
if (tableCheck.rows[0].t) {
    console.log('Tables already exist - skipping migration');
} else {
    const sql = fs.readFileSync(path.join(process.cwd(), 'migrations', '001_create_tables.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 001_create_tables.sql applied');
}
await client.end();
