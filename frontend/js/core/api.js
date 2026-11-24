/**
 * api.js — jQuery AJAX wrapper used by every page.
 *  - Prefixes CivicConfig.API_BASE_URL
 *  - Attaches `Authorization: Bearer <token>` to every protected request
 *  - Sends JSON or multipart/form-data (FormData) with upload progress
 *  - Normalises errors into { status, message, errors[] }
 *  - Global handling: 401 -> sign out + redirect to login, 403 -> "contact admin" toast
 *  - A small sessionStorage cache for list endpoints (invalidated on writes)
 */
const Api = (() => {
    const AUTH_FREE = ['/auth/login', '/auth/signup'];

    const normalise = (xhr, textStatus) => {
        const body = xhr.responseJSON || {};
        if (xhr.status === 0) {
            return { status: 0, message: textStatus === 'timeout'
                ? 'The server took too long to respond. Please try again.'
                : 'Cannot reach the server. Check your connection or that the backend is running.' };
        }
        let message = body.message || xhr.statusText || 'Something went wrong';
        // express-validator errors -> show the first specific reason
        if (Array.isArray(body.errors) && body.errors.length) message = body.errors.map((e) => e.message || e.msg).join(' ');
        if (xhr.status >= 500 && !body.message) message = 'The server had a problem. Please try again shortly.';
        return { status: xhr.status, message, errors: body.errors || [] };
    };

    /**
     * request(method, path, data?, opts?)
     * opts.onProgress(pct)  — upload progress callback (FormData)
     * opts.silent403        — don't show the global 403 toast
     */
    const request = (method, path, data, opts = {}) => {
        const token = Auth.getToken();
        const isForm = data instanceof FormData;
        const settings = {
            url: CivicConfig.API_BASE_URL + path,
            method,
            timeout: opts.timeout || (isForm ? 120000 : 20000),
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            dataType: 'json',
        };
        if (data !== undefined) {
            if (isForm) {
                settings.data = data;
                settings.processData = false;      // let the browser build the multipart body
                settings.contentType = false;      // browser sets boundary
            } else if (method === 'GET') {
                settings.data = data;              // query string
            } else {
                settings.data = JSON.stringify(data);
                settings.contentType = 'application/json';
            }
        }
        if (opts.onProgress) {
            settings.xhr = () => {
                const x = new XMLHttpRequest();
                x.upload.addEventListener('progress', (e) => e.lengthComputable && opts.onProgress(Math.round((e.loaded / e.total) * 100)));
                return x;
            };
        }

        return new Promise((resolve, reject) => {
            $.ajax(settings)
                .done((res) => resolve(res))
                .fail((xhr, textStatus) => {
                    const err = normalise(xhr, textStatus);
                    // 401 on a protected call = missing/expired/invalid token -> sign out
                    if (err.status === 401 && !AUTH_FREE.includes(path)) {
                        Auth.logout('Your session has expired or is invalid. Please log in again.', 'warning');
                    }
                    // 403 = logged in but not allowed (e.g. normal user hitting an admin endpoint)
                    if (err.status === 403 && !opts.silent403) {
                        UI.toast('You don\'t have permission to do that. Contact an administrator if you need access.', 'error');
                    }
                    reject(err);
                });
        });
    };

    // ---- simple list cache (sessionStorage) ----
    const cacheKey = (k) => `civic_cache_${k}`;
    const cached = async (key, loader) => {
        try {
            const hit = JSON.parse(sessionStorage.getItem(cacheKey(key)));
            if (hit && Date.now() - hit.t < CivicConfig.CACHE_TTL_MS) return hit.v;
        } catch { /* ignore corrupt cache */ }
        const v = await loader();
        try { sessionStorage.setItem(cacheKey(key), JSON.stringify({ t: Date.now(), v })); } catch { /* quota */ }
        return v;
    };
    const invalidate = (...keys) => keys.forEach((k) => sessionStorage.removeItem(cacheKey(k)));

    return {
        request,
        get: (p, q, o) => request('GET', p, q, o),
        post: (p, d, o) => request('POST', p, d, o),
        put: (p, d, o) => request('PUT', p, d, o),
        patch: (p, d, o) => request('PATCH', p, d, o),
        del: (p, o) => request('DELETE', p, undefined, o),
        cached,
        invalidate,
    };
})();

/**
 * Services — one function per backend endpoint, so pages never hard-code URLs.
 * (Admin-only endpoints are marked; the backend rejects them with 403 for normal users.)
 */
const Services = {
    auth: {
        signup: (d) => Api.post('/auth/signup', d),
        login: (d) => Api.post('/auth/login', d),
    },
    users: {
        list: (q) => Api.get('/users', q),                       // admin
        get: (id) => Api.get(`/users/${id}`),                    // admin
        enable: (id) => Api.patch(`/users/${id}/enable`),        // admin
        disable: (id) => Api.patch(`/users/${id}/disable`),      // admin
        me: () => Api.get('/users/profile/me'),
        updateMe: (d) => Api.patch('/users/profile/me', d),
    },
    events: {
        list: () => Api.cached('events', () => Api.get('/events')),
        get: (id) => Api.get(`/events/${id}`),
        create: (fd, o) => Api.post('/events', fd, o).finally(() => Api.invalidate('events')),          // admin
        update: (id, fd, o) => Api.put(`/events/${id}`, fd, o).finally(() => Api.invalidate('events')), // admin
        remove: (id) => Api.del(`/events/${id}`).finally(() => Api.invalidate('events')),               // admin
    },
    registrations: {
        register: (event_id) => Api.post('/event-registrations/register', { event_id }),
        cancel: (event_id) => Api.post('/event-registrations/cancel', { event_id }),
        mine: () => Api.get('/event-registrations/my-registrations'),
        attendees: (event_id) => Api.get(`/event-registrations/event/${event_id}/attendees`, undefined, { silent403: true }), // admin
    },
    feedback: {
        create: (d) => Api.post('/event-feedback', d),
        update: (id, d) => Api.put(`/event-feedback/${id}`, d),
        mine: () => Api.get('/event-feedback/my-feedback'),
        forEvent: (event_id) => Api.get(`/event-feedback/event/${event_id}`, undefined, { silent403: true }), // admin
    },
    announcements: {
        list: () => Api.cached('announcements', () => Api.get('/announcements', { limit: 100 })),
        get: (id) => Api.get(`/announcements/${id}`),
        create: (fd, o) => Api.post('/announcements', fd, o).finally(() => Api.invalidate('announcements')),          // admin
        update: (id, fd, o) => Api.put(`/announcements/${id}`, fd, o).finally(() => Api.invalidate('announcements')), // admin
        publish: (id) => Api.patch(`/announcements/${id}/publish`).finally(() => Api.invalidate('announcements')),     // admin
        unpublish: (id) => Api.patch(`/announcements/${id}/unpublish`).finally(() => Api.invalidate('announcements')), // admin
        remove: (id) => Api.del(`/announcements/${id}`).finally(() => Api.invalidate('announcements')),               // admin
    },
    promos: {
        list: () => Api.cached('promos', () => Api.get('/promos', { limit: 100 })),
        get: (id) => Api.get(`/promos/${id}`),
        create: (fd, o) => Api.post('/promos', fd, o).finally(() => Api.invalidate('promos')),          // admin
        update: (id, fd, o) => Api.put(`/promos/${id}`, fd, o).finally(() => Api.invalidate('promos')), // admin
        publish: (id) => Api.patch(`/promos/${id}/publish`).finally(() => Api.invalidate('promos')),     // admin
        unpublish: (id) => Api.patch(`/promos/${id}/unpublish`).finally(() => Api.invalidate('promos')), // admin
        remove: (id) => Api.del(`/promos/${id}`).finally(() => Api.invalidate('promos')),               // admin
    },
    notifications: {
        list: () => Api.get('/notifications'),
        get: (id) => Api.get(`/notifications/${id}`),
        remove: (id) => Api.del(`/notifications/${id}`), // admin
    },
    dashboard: {
        admin: () => Api.get('/dashboard/admin'), // admin
        me: () => Api.get('/dashboard/me'),
    },
};
