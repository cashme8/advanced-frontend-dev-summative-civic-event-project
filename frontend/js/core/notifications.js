/**
 * notifications.js — shared notification state for the bell, drawer and inbox page.
 *
 * GET /api/notifications already returns broadcast (recipient_id = null) + targeted
 * notifications for the logged-in user. The backend has no "mark as read" endpoint,
 * so read state is kept per user in localStorage. Marking read is OPTIMISTIC: the UI
 * updates instantly, then we confirm by fetching the notification; if that fails the
 * change is reverted and the user is told.
 */
const Notifs = (() => {
    let items = [];
    let loaded = false;
    const listeners = [];
    let pollTimer = null;

    const readKey = () => `civic_read_${Auth.getUser()?.id || 'anon'}`;
    const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem(readKey())) || []); } catch { return new Set(); } };
    const saveRead = (set) => localStorage.setItem(readKey(), JSON.stringify([...set]));

    // A notification is read if the server says so or the user opened it here
    const isRead = (n) => n.read || readSet().has(n.id);
    const unreadCount = () => items.filter((n) => !isRead(n)).length;
    const emit = () => listeners.forEach((fn) => fn(items));
    const onChange = (fn) => { listeners.push(fn); if (loaded) fn(items); };

    const load = async () => {
        const res = await Services.notifications.list();
        items = res.data || [];
        loaded = true;
        emit();
        return items;
    };

    /** Optimistic mark-as-read with rollback on failure. */
    const markRead = async (id) => {
        const set = readSet();
        if (set.has(id)) return;
        set.add(id);
        saveRead(set);
        emit(); // UI updates immediately
        try {
            await Services.notifications.get(id); // confirm it still exists / we can access it
        } catch (err) {
            const s = readSet(); s.delete(id); saveRead(s); // revert
            emit();
            if (err.status !== 401) UI.toast('Could not mark notification as read. Please try again.', 'error');
        }
    };

    const markAllRead = () => {
        const set = readSet();
        items.forEach((n) => set.add(n.id));
        saveRead(set);
        emit();
    };

    /** Admin-only delete (DELETE /api/notifications/:id). Optimistic remove + rollback. */
    const remove = async (id) => {
        const backup = items.slice();
        items = items.filter((n) => n.id !== id);
        emit();
        try {
            await Services.notifications.remove(id);
        } catch (err) {
            items = backup; emit();
            throw err;
        }
    };

    /** Where a notification should take the user, based on its metadata. */
    const linkFor = (n) => {
        const m = n.metadata || {};
        if (m.event_id) return { href: `event.html?id=${m.event_id}`, label: 'View event' };
        if (m.announcement_id) return { href: `announcement.html?id=${m.announcement_id}`, label: 'Listen to announcement' };
        if (m.promo_id) return { href: `promo.html?id=${m.promo_id}`, label: 'Watch promo' };
        return null;
    };

    const typeStyle = (type) => ({
        event: ['bg-civic-100 text-civic-800', 'calendar'],
        announcement: ['bg-amber-100 text-amber-900', 'mic'],
        promo: ['bg-leaf-100 text-leaf-800', 'video'],
    }[type] || ['bg-gray-100 text-gray-800', 'bell']);

    const startPolling = () => {
        clearInterval(pollTimer);
        pollTimer = setInterval(() => { if (!document.hidden) load().catch(() => {}); }, CivicConfig.NOTIF_POLL_MS);
    };

    return { load, onChange, isRead, unreadCount, markRead, markAllRead, remove, linkFor, typeStyle, startPolling, get items() { return items; } };
})();
