/**
 * pages/notifications.js — notification inbox (GET /api/notifications) + detail (GET /api/notifications/:id).
 * The API returns broadcast (recipient_id = null) and targeted notifications for this user.
 * Opening one marks it read (optimistic, see Notifs.markRead) and shows a link to the
 * related event / announcement / promo from its metadata.
 * ROLE GUARD: only admins see the Delete button (DELETE is authorize(['admin']) on the API).
 */
App.init(() => {
    const admin = Auth.isAdmin();
    const { esc, icon } = UI;
    let filter = 'all';
    let selected = UI.param('id');

    $('#inbox-refresh').html(icon('refresh', 'w-4 h-4'));

    const visible = () => Notifs.items.filter((n) => {
        if (filter === 'unread') return !Notifs.isRead(n);
        if (filter === 'all') return true;
        return n.type === filter;
    });

    const renderList = () => {
        const list = visible();
        $('#inbox-list').attr('aria-busy', 'false').html(list.length
            ? list.map((n) => Layout.notifRow(n).replace('<button', `<button aria-current="${n.id === selected}"`).replace('hover:bg-civic-50', `hover:bg-gray-50 ${n.id === selected ? '!bg-leaf-50 ring-2 ring-inset ring-leaf-600' : ''}`)).join('')
            : `<div class="p-6">${UI.empty(filter === 'unread' ? 'No unread notifications' : 'Nothing here yet', 'New events, announcements and promos will show up here.')}</div>`);
    };

    const renderEmptyDetail = () => $('#inbox-detail').html(`
        <div class="py-10 text-center text-gray-500">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">${icon('bell', 'w-6 h-6')}</div>
            <p>Select a notification to read it.</p>
        </div>`);

    const renderDetail = (n) => {
        const [cls, ic] = Notifs.typeStyle(n.type);
        const link = Notifs.linkFor(n);
        $('#inbox-detail').html(`
            <article class="fade-in" aria-labelledby="nd-title">
                <div class="flex items-start gap-3">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${cls}">${icon(ic, 'w-5 h-5')}</span>
                    <div class="min-w-0">
                        <h2 id="nd-title" class="text-xl font-semibold text-gray-900">${esc(n.title)}</h2>
                        <p class="mt-0.5 text-sm text-gray-600">${UI.badge(n.type, 'gray')} · ${UI.fmtDateTime(n.created_at)} · ${n.recipient_id ? 'Sent to you' : 'City-wide broadcast'}</p>
                    </div>
                </div>
                <p class="mt-5 whitespace-pre-line text-gray-800">${esc(n.message)}</p>
                <div class="mt-6 flex flex-wrap gap-2 border-t pt-4">
                    ${link ? `<a href="${link.href}" class="btn-primary">${link.label} →</a>` : ''}
                    ${admin ? `<button type="button" class="btn-danger" data-del-notif="${n.id}">${icon('trash', 'w-4 h-4')} Delete for everyone</button>` : ''}
                </div>
            </article>`);
    };

    const open = async (id, focus = false) => {
        selected = id;
        history.replaceState(null, '', `notifications.html?id=${id}`);
        renderList();
        const local = Notifs.items.find((n) => n.id === id);
        if (local) renderDetail(local); else $('#inbox-detail').html(UI.skeletonRows(2));
        Notifs.markRead(id);
        try {
            const res = await Services.notifications.get(id); // GET /api/notifications/:id
            renderDetail(res.data);
        } catch (err) {
            if (!local) err.status === 404 ? $('#inbox-detail').html(UI.empty('Notification not found', 'It may have been deleted.')) : UI.errorState($('#inbox-detail'), err, () => open(id));
        }
        if (focus) {
            $('#inbox-detail').trigger('focus');
            if (window.innerWidth < 1024) $('#inbox-detail')[0].scrollIntoView({ behavior: 'smooth' });
        }
    };

    const load = () => {
        $('#inbox-list').attr('aria-busy', 'true').html(UI.skeletonRows(6));
        return Notifs.load().catch((err) => UI.errorState($('#inbox-list'), err, load));
    };

    Notifs.onChange(renderList);
    renderEmptyDetail();
    load().then(() => { if (selected) open(selected); });

    $('[data-filter]').on('click', function () {
        filter = $(this).data('filter');
        $('[data-filter]').attr('aria-pressed', 'false');
        $(this).attr('aria-pressed', 'true');
        renderList();
    });
    $(document).on('click', '#inbox-list [data-notif]', function (e) {
        e.stopImmediatePropagation(); // don't trigger the drawer's navigate handler
        open($(this).data('notif'), true);
    });
    $('#inbox-mark-all').on('click', () => { Notifs.markAllRead(); UI.toast('All notifications marked as read', 'success'); });
    $('#inbox-refresh').on('click', function () {
        const done = UI.busy($(this), '');
        load().finally(done);
    });

    // ADMIN: delete (optimistic remove, rolled back on failure inside Notifs.remove)
    $(document).on('click', '[data-del-notif]', async function () {
        const id = $(this).data('del-notif');
        const ok = await UI.confirm({ title: 'Delete notification?', message: 'It will be removed for every resident.', confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await Notifs.remove(id);
            selected = null;
            history.replaceState(null, '', 'notifications.html');
            renderEmptyDetail();
            UI.toast('Notification deleted', 'success');
        } catch (err) { UI.toast(err.message, 'error'); }
    });
});
