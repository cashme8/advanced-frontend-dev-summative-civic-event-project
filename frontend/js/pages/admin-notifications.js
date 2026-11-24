/**
 * pages/admin-notifications.js — ADMIN ONLY notification management.
 * Access: <body data-role="admin"> → Auth.guard() shows a 403 view to normal users,
 * and DELETE /api/notifications/:id is authorize(['admin']) on the backend.
 *
 * Note: the provided API has no "create notification" route — notifications are created
 * by the backend whenever an event, announcement or promo is created/published.
 */
App.init(() => {
    const { esc, icon } = UI;
    const checked = new Set();

    const typeCounts = () => {
        const items = Notifs.items;
        const c = (t) => items.filter((n) => n.type === t).length;
        const tiles = [['Total', items.length, 'bell'], ['Events', c('event'), 'calendar'], ['Announcements', c('announcement'), 'mic'], ['Promos', c('promo'), 'video']];
        $('#type-stats').html(tiles.map(([label, n, ic]) => `
            <div class="card flex items-center gap-3 p-4">
                <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">${icon(ic)}</span>
                <div><p class="text-2xl font-bold text-gray-900">${n}</p><p class="text-sm text-gray-600">${label}</p></div>
            </div>`).join(''));
    };

    const renderSelect = () => {
        const items = Notifs.items;
        $('#del-select').html(`<option value="">${items.length ? 'Choose a notification…' : 'No notifications'}</option>`
            + items.map((n) => `<option value="${n.id}">[${esc(n.type)}] ${esc(n.title)} — ${UI.fmtDate(n.created_at)}</option>`).join(''));
    };

    const renderTable = () => {
        const type = $('#type-filter').val();
        const rows = Notifs.items.filter((n) => !type || n.type === type);
        [...checked].forEach((id) => { if (!Notifs.items.some((n) => n.id === id)) checked.delete(id); });
        $('#bulk-delete').prop('disabled', !checked.size).text(checked.size ? `Delete selected (${checked.size})` : 'Delete selected');
        $('#notif-table').attr('aria-busy', 'false').html(rows.length ? `
            <table class="w-full text-left text-sm">
                <caption class="sr-only">All notifications</caption>
                <thead class="border-b text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                        <th scope="col" class="py-2 pr-3"><input type="checkbox" id="check-all" class="h-4 w-4" aria-label="Select all shown notifications" ${rows.every((n) => checked.has(n.id)) ? 'checked' : ''}></th>
                        <th scope="col" class="py-2 pr-4">Title</th><th scope="col" class="py-2 pr-4">Type</th>
                        <th scope="col" class="py-2 pr-4">Audience</th><th scope="col" class="py-2 pr-4">Created</th><th scope="col" class="py-2"><span class="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y">${rows.map((n) => `
                    <tr>
                        <td class="py-3 pr-3"><input type="checkbox" class="h-4 w-4" data-check="${n.id}" ${checked.has(n.id) ? 'checked' : ''} aria-label="Select ${esc(n.title)}"></td>
                        <td class="py-3 pr-4"><a href="notifications.html?id=${n.id}" class="font-medium text-gray-900 hover:text-leaf-700 hover:underline">${esc(n.title)}</a><p class="text-xs text-gray-600 line-clamp-2">${esc(n.message)}</p></td>
                        <td class="py-3 pr-4">${UI.badge(n.type, 'gray')}</td>
                        <td class="py-3 pr-4 text-gray-700">${n.recipient_id ? 'One user' : 'Everyone'}</td>
                        <td class="py-3 pr-4 whitespace-nowrap text-gray-600">${UI.timeAgo(n.created_at)}</td>
                        <td class="py-3 text-right"><button type="button" class="btn-ghost !text-red-700 hover:!bg-red-50" data-row-del="${n.id}" aria-label="Delete ${esc(n.title)}">${icon('trash', 'w-4 h-4')}</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>` : UI.empty('No notifications', 'Nothing to manage right now.'));
    };

    const renderAll = () => { typeCounts(); renderSelect(); renderTable(); };

    const load = () => {
        $('#notif-table').html(UI.skeletonRows(5));
        Notifs.load().catch((err) => UI.errorState($('#notif-table'), err, load));
    };
    Notifs.onChange(renderAll);
    load();

    const removeMany = async (ids) => {
        let failed = 0;
        for (const id of ids) {
            try { await Notifs.remove(id); checked.delete(id); } catch { failed += 1; }
        }
        if (failed) UI.toast(`${failed} notification(s) could not be deleted.`, 'error');
        else UI.toast(ids.length > 1 ? `${ids.length} notifications deleted` : 'Notification deleted', 'success');
    };

    // Delete form
    $('#delete-form').on('submit', async (e) => {
        e.preventDefault();
        const id = $('#del-select').val();
        if (!UI.fieldError($('#del-select'), id ? '' : 'Choose a notification to delete.')) return $('#del-select').trigger('focus');
        const title = $('#del-select option:selected').text();
        const ok = await UI.confirm({ title: 'Delete notification?', message: `${title}\n\nIt will be removed for every resident.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        const done = UI.busy($('#del-submit'), 'Deleting…');
        await removeMany([id]);
        done();
    });

    $('#type-filter').on('change', renderTable);
    $(document).on('change', '[data-check]', function () {
        const id = $(this).data('check');
        this.checked ? checked.add(id) : checked.delete(id);
        renderTable();
    });
    $(document).on('change', '#check-all', function () {
        const type = $('#type-filter').val();
        Notifs.items.filter((n) => !type || n.type === type).forEach((n) => (this.checked ? checked.add(n.id) : checked.delete(n.id)));
        renderTable();
    });
    $(document).on('click', '[data-row-del]', async function () {
        const ok = await UI.confirm({ title: 'Delete notification?', message: 'It will be removed for every resident.', confirmText: 'Delete', danger: true });
        if (ok) removeMany([$(this).data('row-del')]);
    });
    $('#bulk-delete').on('click', async () => {
        const ids = [...checked];
        const ok = await UI.confirm({ title: `Delete ${ids.length} notifications?`, message: 'They will be removed for every resident. This cannot be undone.', confirmText: 'Delete all', danger: true });
        if (ok) removeMany(ids);
    });
});
