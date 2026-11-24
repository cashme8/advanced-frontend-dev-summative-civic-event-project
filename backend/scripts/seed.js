/**
 * seed.js
 * Seeds demo data through the running API (server must be up on API_URL).
 *  - 1 admin account  (admin@civic.test / Admin@123)
 *  - 1 normal user    (user@civic.test  / User@1234)
 *  - a few sample events
 *
 * Usage:  node scripts/seed.js
 */
const API = process.env.API_URL || 'http://localhost:4000/api';

const post = async (url, body, token) => {
    const res = await fetch(API + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
};

const accounts = [
    { full_name: 'City Admin', email: 'admin@civic.test', password: 'Admin@123', role: 'admin' },
    { full_name: 'Jane Citizen', email: 'user@civic.test', password: 'User@1234' },
];

for (const acc of accounts) {
    const r = await post('/auth/signup', acc);
    console.log(`signup ${acc.email}: ${r.status} ${r.json.message}`);
}

const login = await post('/auth/login', { email: 'admin@civic.test', password: 'Admin@123' });
const token = login.json?.data?.token;
if (!token) throw new Error('Admin login failed');

const day = (n, h = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
};

const events = [
    { title: 'Community Clean-Up Day', description: 'Join neighbours to clean up the central park and riverside. Gloves and bags provided.', location: 'Central Park', starts_at: day(3, 8), ends_at: day(3, 12) },
    { title: 'Town Hall: 2027 City Budget', description: 'Public consultation on next year\'s city budget. Bring your questions for the council.', location: 'City Hall, Room 1', starts_at: day(7, 18), ends_at: day(7, 20) },
    { title: 'Free Health Screening', description: 'Blood pressure, diabetes and eye screening offered by city clinics.', location: 'Kimironko Health Centre', starts_at: day(10, 9), ends_at: day(10, 15) },
    { title: 'Youth Coding Workshop', description: 'An introduction to web development for ages 14-20. Laptops provided.', location: 'Public Library', starts_at: day(14, 13), ends_at: day(14, 17) },
    { title: 'Farmers Market', description: 'Local produce, crafts and live music every Saturday.', location: 'Market Square', starts_at: day(5, 7), ends_at: day(5, 14) },
    { title: 'Road Safety Awareness Walk', description: 'A walk through the city centre promoting safe roads for pedestrians and cyclists.', location: 'Downtown', starts_at: day(-5, 9), ends_at: day(-5, 11) },
];

for (const ev of events) {
    const r = await post('/events', ev, token);
    console.log(`event "${ev.title}": ${r.status}`);
}
console.log('Seed complete.');
