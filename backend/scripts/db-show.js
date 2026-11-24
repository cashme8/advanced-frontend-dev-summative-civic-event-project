/**
 * db-show.js
 * Prints what is stored in the PostgreSQL database (connection from .env), so the data can
 * be inspected without psql or pgAdmin.
 *
 * Usage:
 *   node scripts/db-show.js                  -> connection info, every table with its row count, recent rows
 *   node scripts/db-show.js users            -> rows of one table
 *   node scripts/db-show.js "SELECT ..."     -> run your own read-only query
 */
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const db = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
});

// Columns that are long/noisy are trimmed so tables fit in the terminal
const trim = (rows) => rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => {
    if (k === 'password_hash') return [k, '(hidden)'];
    if (v instanceof Date) return [k, v.toISOString().replace('T', ' ').slice(0, 16)];
    if (v && typeof v === 'object') v = JSON.stringify(v);
    if (typeof v === 'string' && v.length > 40) v = `${v.slice(0, 37)}...`;
    return [k, v];
})));

// What to show per table in the overview (most useful columns, newest first)
const overview = {
    users: 'SELECT full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC',
    events: 'SELECT title, location, starts_at, published, metadata FROM events ORDER BY starts_at',
    event_registrations: `SELECT u.full_name AS user, e.title AS event, r.status, r.created_at
                          FROM event_registrations r JOIN users u ON u.id = r.user_id JOIN events e ON e.id = r.event_id
                          ORDER BY r.created_at DESC`,
    event_feedback: `SELECT u.full_name AS user, e.title AS event, f.rating, f.comment
                     FROM event_feedback f JOIN users u ON u.id = f.user_id JOIN events e ON e.id = f.event_id`,
    announcements: 'SELECT title, audio_url, published, created_at FROM announcements ORDER BY created_at DESC',
    promos: 'SELECT title, video_url, caption_text, published FROM promos ORDER BY created_at DESC',
    notifications: 'SELECT title, type, recipient_id, metadata, created_at FROM notifications ORDER BY created_at DESC LIMIT 8',
};

const run = async () => {
    await db.connect();
    const arg = process.argv[2];

    if (arg && /^\s*(select|with)\b/i.test(arg)) {           // custom query (read-only)
        const { rows } = await db.query(arg);
        console.table(trim(rows));
    } else if (arg) {                                          // one table
        if (!overview[arg]) throw new Error(`Unknown table "${arg}". Try: ${Object.keys(overview).join(', ')}`);
        const { rows } = await db.query(overview[arg]);
        console.log(`\n=== ${arg} (${rows.length} rows) ===`);
        console.table(trim(rows));
    } else {                                                   // full overview
        const { rows: [info] } = await db.query('SELECT current_database() AS database, current_user AS "user", version() AS version');
        console.log(`\nConnected to PostgreSQL database "${info.database}" as "${info.user}" on ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}`);
        console.log(info.version.split(',')[0]);

        const { rows: tables } = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
        const counts = [];
        for (const { table_name: t } of tables) {
            const { rows: [c] } = await db.query(`SELECT COUNT(*)::int AS rows FROM "${t}"`);
            counts.push({ table: t, rows: c.rows });
        }
        console.log('\n=== Tables ===');
        console.table(counts);

        for (const [t, sql] of Object.entries(overview)) {
            const { rows } = await db.query(sql);
            console.log(`\n=== ${t} (${rows.length} rows) ===`);
            if (rows.length) console.table(trim(rows)); else console.log('(empty)');
        }
    }
    await db.end();
};

run().catch(async (err) => {
    console.error('Error:', err.message);
    await db.end().catch(() => {});
    process.exit(1);
});
