/**
 * auth.js — Global auth context + client-side ROLE GUARDS.
 *
 * AuthContext holds { token, user: { id, full_name, email, role } } and notifies
 * subscribers when it changes (a tiny "Redux-like" store without the boilerplate).
 *
 * TOKEN STORAGE RULES
 *  - "Remember me" unchecked -> sessionStorage (cleared when the tab/browser closes).
 *  - "Remember me" checked   -> localStorage (survives restarts; more exposed to XSS,
 *    so we never store anything except the JWT and the public user fields).
 *
 * SECURITY NOTE: every guard in this file is UX only. The backend re-checks the JWT
 * and role on every request (authenticate + authorize(['admin']) middleware), so
 * hiding a button here never replaces server-side enforcement.
 */
const Auth = (() => {
    const TOKEN_KEY = 'civic_token';
    const USER_KEY = 'civic_user';
    const listeners = [];
    let expiryTimer = null;

    // Whichever storage currently holds the token (local = persistent, session = tab only)
    const activeStore = () => (localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage);

    const getToken = () => activeStore().getItem(TOKEN_KEY);

    const getUser = () => {
        try { return JSON.parse(activeStore().getItem(USER_KEY)); } catch { return null; }
    };

    /** Decode the JWT payload (no verification — that's the server's job). */
    const decode = (token) => {
        try {
            const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(payload));
        } catch { return null; }
    };

    const isExpired = (token = getToken()) => {
        const p = token && decode(token);
        return !p || (p.exp && p.exp * 1000 <= Date.now());
    };

    const isLoggedIn = () => !!getToken() && !isExpired();

    // ---- ROLE CHECKS (used by every page + the layout to show/hide admin UI) ----
    const isAdmin = () => isLoggedIn() && getUser()?.role === 'admin';
    const hasRole = (role) => isLoggedIn() && getUser()?.role === role;

    const notify = () => listeners.forEach((fn) => fn(getUser()));
    const subscribe = (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); };

    /** Save session after login. `remember` decides localStorage vs sessionStorage. */
    const login = (token, user, remember) => {
        clearStorage();
        const store = remember ? localStorage : sessionStorage;
        // Only the public fields the UI needs are kept client side.
        const safeUser = { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
        store.setItem(TOKEN_KEY, token);
        store.setItem(USER_KEY, JSON.stringify(safeUser));
        scheduleExpiry();
        notify();
    };

    /** Update cached user fields (e.g. after profile edit) without touching the token. */
    const updateUser = (fields) => {
        const store = activeStore();
        const merged = { ...getUser(), ...fields };
        store.setItem(USER_KEY, JSON.stringify({ id: merged.id, full_name: merged.full_name, email: merged.email, role: merged.role }));
        notify();
    };

    const clearStorage = () => {
        [localStorage, sessionStorage].forEach((s) => { s.removeItem(TOKEN_KEY); s.removeItem(USER_KEY); });
    };

    /** Sign out and send the user to login, optionally with a message shown there. */
    const logout = (message, type = 'info') => {
        clearStorage();
        clearTimeout(expiryTimer);
        if (message) UI.flash(message, type);
        notify();
        const here = location.pathname.split('/').pop();
        const next = here && !['login.html', 'signup.html'].includes(here) ? `?next=${encodeURIComponent(here + location.search)}` : '';
        location.href = 'login.html' + next;
    };

    /** Auto sign-out the moment the JWT expires (backend tokens last 1h). */
    const scheduleExpiry = () => {
        clearTimeout(expiryTimer);
        const p = decode(getToken() || '');
        if (!p?.exp) return;
        const ms = p.exp * 1000 - Date.now();
        if (ms > 0 && ms < 2 ** 31) expiryTimer = setTimeout(() => logout('Your session expired. Please log in again.', 'warning'), ms);
    };

    /**
     * PAGE GUARD — runs on every page before it renders.
     * Pages declare their requirements on <body>:
     *   data-auth="guest"     -> only for logged-out users (login/signup); logged-in users go to events
     *   data-auth="required"  -> must be logged in, otherwise redirect to login
     *   data-role="admin"     -> must ALSO be an admin; normal users see a 403 screen
     * Returns true (render), false (redirecting away) or 'forbidden' (show 403 view).
     */
    const guard = () => {
        const need = document.body.dataset.auth;
        const role = document.body.dataset.role;

        // Expired token found in storage -> sign out with a message
        if (getToken() && isExpired()) {
            logout('Your session expired. Please log in again.', 'warning');
            return false;
        }
        if (need === 'guest' && isLoggedIn()) {
            location.href = isAdmin() ? 'dashboard.html' : 'events.html';
            return false;
        }
        if (need === 'required' && !isLoggedIn()) {
            UI.flash('Please log in to continue.', 'info');
            logout();
            return false;
        }
        // ADMIN-ONLY PAGE GUARD: a normal user who types an admin URL gets a forbidden screen
        if (role === 'admin' && !isAdmin()) return 'forbidden';
        scheduleExpiry();
        return true;
    };

    // Keep multiple tabs in sync (logout in one tab logs out the others)
    window.addEventListener('storage', (e) => {
        if (e.key === TOKEN_KEY && !e.newValue && document.body.dataset.auth === 'required') logout('You were signed out.');
    });

    return { getToken, getUser, isLoggedIn, isAdmin, hasRole, isExpired, login, logout, updateUser, subscribe, guard };
})();
