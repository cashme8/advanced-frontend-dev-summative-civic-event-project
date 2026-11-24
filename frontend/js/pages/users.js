/**
 * pages/users.js — ADMIN ONLY user management.
 * Access: <body data-role="admin"> → Auth.guard() shows a 403 view to normal users;
 * GET /users, GET /users/:id and PATCH /users/:id/enable|disable are authorize(['admin']) on the API.
 *
 * RULES ENFORCED IN THE UI:
 *  - Admins can enable/disable accounts (optimistic toggle, reverted if the API fails).
 *  - Admins can NOT change anyone's role — role is display-only, there is no control for it.
 *  - An admin can't disable their own account (would lock them out).
 */
App.init(() => {
    const { esc, icon, badge } = UI;
    const me = Auth.getUser();
    const LIMIT = 10;
    let page = 1;
    let rows = [];

    const statusSwitch = (u) => {
        const self = u.id === me.id;
        return `
        <label class="inline-flex items-center gap-2">
            <span class="switch">
                <input type="checkbox" role="switch" data-toggle-user="${u.id}" ${u.is_active ? 'checked' : ''} ${self ? 'disabled' : ''}
                       aria-label="${u.is_active ? 'Disable' : 'Enable'} account for ${esc(u.full_name)}">
                <span class="track"></span>
            </span>
            <span class="text-sm ${u.is_active ? 'text-leaf-800' : 'text-gray-600'}" data-status-text="${u.id}">${u.is_active ? 'Active' : 'Disabled'}</span>
        </label>${self ? '<p class="mt-1 text-xs text-gray-500">This is you</p>' : ''}`;
    };

    const filtered = () => {
        const q = $('#q').val().trim().toLowerCase();
        const role = $('#role-filter').val();
        const st = $('#status-filter').val();
        return rows.filter((u) => (!q || `${u.full_name} ${u.email}`.toLowerCase().includes(q))
            && (!role || u.role === role)
            && (!st || (st === 'active' ? u.is_active : !u.is_active)));
    };

    const render = () => {
        const list = filtered();
        $('#users-table').attr('aria-busy', 'false').html(list.length ? `
            <table class="w-full text-left text-sm">
                <caption class="sr-only">Users, page ${page}</caption>
                <thead class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr><th scope="col" class="px-4 py-3">Name</th><th scope="col" class="px-4 py-3">Role</th><th scope="col" class="px-4 py-3">Status</th><th scope="col" class="px-4 py-3">Joined</th><th scope="col" class="px-4 py-3"><span class="sr-only">Actions</span></th></tr>
                </thead>
                <tbody class="divide-y">${list.map((u) => `
                    <tr class="${u.is_active ? '' : 'bg-gray-50'}">
                        <td class="px-4 py-3"><p class="font-medium text-gray-900">${esc(u.full_name)}</p><p class="text-gray-600">${esc(u.email)}</p></td>
                        <td class="px-4 py-3">${badge(u.role === 'admin' ? 'Admin' : 'Resident', u.role === 'admin' ? 'blue' : 'gray')}</td>
                        <td class="px-4 py-3">${statusSwitch(u)}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-gray-600">${UI.fmtDate(u.created_at)}</td>
                        <td class="px-4 py-3 text-right"><button type="button" class="btn-ghost" data-view="${u.id}">${icon('eye', 'w-4 h-4')} View<span class="sr-only"> ${esc(u.full_name)}</span></button></td>
                    </tr>`).join('')}
                </tbody>
            </table>` : `<div class="p-6">${UI.empty('No users match', 'Try another search or filter.')}</div>`);

        $('#pager').html(`
            <button type="button" class="btn-secondary" data-goto="${page - 1}" ${page === 1 ? 'disabled' : ''}>← Previous</button>
            <span class="text-sm text-gray-600" aria-live="polite">Page ${page}</span>
            <button type="button" class="btn-secondary" data-goto="${page + 1}" ${rows.length < LIMIT ? 'disabled' : ''}>Next →</button>`);
    };

    const load = async () => {
        $('#users-table').attr('aria-busy', 'true').html(UI.skeletonRows(6));
        try {
            const res = await Services.users.list({ page, limit: LIMIT });
            rows = res.data || [];
            render();
        } catch (err) { UI.errorState($('#users-table'), err, load); }
    };

    // ---------- profile modal (GET /users/:id) ----------
    const openProfile = async (id) => {
        const prev = document.activeElement;
        const $m = $(`
            <div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-gray-900/50" data-close></div>
                <div class="relative fade-in w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="um-title" tabindex="-1">
                    <button type="button" class="absolute right-3 top-3 rounded-lg p-2 text-gray-600 hover:bg-gray-100" data-close aria-label="Close">${icon('x')}</button>
                    <div id="um-body">${UI.skeletonRows(3)}</div>
                </div>
            </div>`).appendTo('body');
        const close = () => { $m.remove(); $(document).off('keydown.um'); prev?.focus(); history.replaceState(null, '', 'users.html'); };
        $m.on('click', '[data-close]', close);
        $(document).on('keydown.um', (e) => { if (e.key === 'Escape') close(); });
        $m.find('[role=dialog]').trigger('focus');
        history.replaceState(null, '', `users.html?id=${id}`);
        try {
            const { data: u } = await Services.users.get(id);
            $m.find('#um-body').html(`
                <div class="flex items-center gap-4">
                    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-100 text-lg font-bold text-leaf-900" aria-hidden="true">${esc(u.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase())}</span>
                    <div><h2 id="um-title" class="text-lg font-semibold">${esc(u.full_name)}</h2><p class="text-sm text-gray-600">${esc(u.email)}</p></div>
                </div>
                <dl class="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div><dt class="text-gray-500">Role</dt><dd class="mt-1">${badge(u.role === 'admin' ? 'Admin' : 'Resident', u.role === 'admin' ? 'blue' : 'gray')}</dd></div>
                    <div><dt class="text-gray-500">Status</dt><dd class="mt-1">${badge(u.is_active ? 'Active' : 'Disabled', u.is_active ? 'green' : 'amber')}</dd></div>
                    <div><dt class="text-gray-500">Joined</dt><dd class="mt-1 font-medium">${UI.fmtDate(u.created_at)}</dd></div>
                    <div><dt class="text-gray-500">Last updated</dt><dd class="mt-1 font-medium">${UI.fmtDate(u.updated_at)}</dd></div>
                </dl>
                <p class="mt-5 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">Roles can't be changed from the portal. Use the status switch in the table to enable or disable this account.</p>`);
        } catch (err) { UI.errorState($m.find('#um-body'), err, () => { close(); openProfile(id); }); }
    };

    // ---------- events ----------
    $('#q').on('input', render);
    $('#role-filter, #status-filter').on('change', render);
    $(document).on('click', '[data-goto]', function () { page = Number($(this).data('goto')); load(); });
    $(document).on('click', '[data-view]', function () { openProfile($(this).data('view')); });

    // Enable / disable — OPTIMISTIC: flip immediately, revert if the PATCH fails
    $(document).on('change', '[data-toggle-user]', async function () {
        const id = $(this).data('toggle-user');
        const u = rows.find((x) => x.id === id);
        const enable = this.checked;
        if (!enable) {
            const ok = await UI.confirm({ title: `Disable ${u.full_name}?`, message: 'They will no longer be able to use their account until it is enabled again.', confirmText: 'Disable account', danger: true });
            if (!ok) { this.checked = true; return; }
        }
        u.is_active = enable;
        render();
        try {
            const res = enable ? await Services.users.enable(id) : await Services.users.disable(id);
            Object.assign(u, res.data);
            UI.toast(`${u.full_name} ${enable ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            u.is_active = !enable; // revert
            render();
            UI.toast(`Could not update ${u.full_name}: ${err.message}`, 'error');
        }
    });

    load().then(() => { if (UI.param('id')) openProfile(UI.param('id')); });
});
