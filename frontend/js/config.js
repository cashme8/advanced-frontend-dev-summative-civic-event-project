/**
 * config.js — single place to point the frontend at the backend.
 * Change API_BASE_URL if your backend runs on another host/port.
 */
window.CivicConfig = {
    BASE_URL: 'http://localhost:4000',           // backend origin (also serves /uploads)
    API_BASE_URL: 'http://localhost:4000/api',   // REST API root
    PAGE_SIZE: 6,                                // items per page on list views
    CACHE_TTL_MS: 2 * 60 * 1000,                 // list cache lifetime (2 min)
    NOTIF_POLL_MS: 30 * 1000,                    // how often the bell refreshes
    UPLOAD_LIMITS: {                             // mirrors backend multer limits
        image: { maxMB: 2, ext: ['jpg', 'jpeg', 'png', 'gif'] },
        audio: { maxMB: 5, ext: ['mp3', 'wav', 'm4a', 'ogg'] },
        video: { maxMB: 8, ext: ['mp4', 'mov', 'avi', 'mkv'] },
    },
};
