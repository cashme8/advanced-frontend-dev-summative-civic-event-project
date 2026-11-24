/**
 * pages/dashboard.js — ADMIN ONLY dashboard (GET /api/dashboard/admin).
 * Access: <body data-role="admin"> → Auth.guard() shows a 403 view to normal users;
 * the API route is authorize(['admin']).
 *
 * Charts are hand-built with HTML/SVG (no chart library — the project is Tailwind + jQuery only):
 *  - every chart has a hover/focus tooltip and a "Show as table" alternative
 *  - bars animate to new values, and the data auto-refreshes every 60 s (and on "Refresh")
 */
App.init(() => {
    const { esc, icon } = UI;
    const GREEN = '#15803d', AMBER = '#b45309';
    const num = (v) => Number(v || 0);
    let timer = null;

    // ---------- tooltip ----------
    const $tip = $('<div class="chart-tip hidden" role="tooltip"></div>').appendTo('body');
    $(document).on('mouseenter focus', '[data-tip]', function () {
        const r = this.getBoundingClientRect();
        $tip.text($(this).data('tip')).removeClass('hidden').css({ left: r.left + r.width / 2 - $tip.outerWidth() / 2, top: r.top - $tip.outerHeight() - 8 });
    }).on('mouseleave blur', '[data-tip]', () => $tip.addClass('hidden'));

    const tableToggle = (rows, head) => `
        <details class="mt-4 text-sm">
            <summary class="cursor-pointer text-leaf-700 hover:underline">Show as table</summary>
            <table class="mt-2 w-full text-left"><thead class="text-xs uppercase text-gray-500"><tr>${head.map((h) => `<th scope="col" class="py-1 pr-4">${h}</th>`).join('')}</tr></thead>
            <tbody class="divide-y">${rows.map((r) => `<tr>${r.map((c, i) => `<td class="py-1 pr-4 ${i ? 'tabular-nums' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </details>`;

    /** Horizontal bar chart, single series (one hue, no legend needed). */
    const hBars = ($el, data) => {
        const max = Math.max(1, ...data.map((d) => d.value));
        // keep existing bars so widths can transition smoothly on refresh
        if (!$el.find('[data-bar]').length || $el.find('[data-bar]').length !== data.length) {
            $el.html(`<ul class="space-y-3">${data.map((d, i) => `
                <li class="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3 text-sm">
                    <span class="truncate text-gray-700">${esc(d.label)}</span>
                    <span class="h-5 rounded-r bg-gray-100"><span data-bar="${i}" tabindex="0" class="block h-5 rounded-r transition-[width] duration-700" style="width:0;background:${GREEN}"></span></span>
                    <span data-val="${i}" class="text-right font-semibold tabular-nums text-gray-900"></span>
                </li>`).join('')}</ul><div data-table></div>`);
            void $el[0].offsetWidth; // force reflow so bars animate from 0 on first render
        }
        data.forEach((d, i) => {
            $el.find(`[data-bar="${i}"]`).css('width', `${Math.max(d.value ? 2 : 0, (d.value / max) * 100)}%`).attr({ 'data-tip': `${d.label}: ${d.value}`, 'aria-label': `${d.label}: ${d.value}` });
            $el.find(`[data-val="${i}"]`).text(d.value);
        });
        $el.find('[data-table]').html(tableToggle(data.map((d) => [d.label, d.value]), ['Section', 'Total']));
    };

    /** Vertical column chart for monthly sign-ups (single series). */
    const columns = ($el, data) => {
        const max = Math.max(1, ...data.map((d) => d.value));
        const W = 480, H = 200, pad = 28, bw = (W - pad) / data.length;
        const ticks = [0, Math.ceil(max / 2), max];
        $el.html(`
            <svg viewBox="0 0 ${W} ${H + 24}" class="w-full" role="img" aria-label="New users per month: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}">
                ${ticks.map((t) => { const y = H - (t / max) * (H - 16); return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}" stroke="#e4e4e7"/><text x="${pad - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="#71717a">${t}</text>`; }).join('')}
                ${data.map((d, i) => {
                    const h = (d.value / max) * (H - 16), x = pad + i * bw + bw * 0.2, w = bw * 0.6;
                    return `<g>
                        <rect x="${x}" y="${H - h}" width="${w}" height="${Math.max(h, 0)}" rx="4" fill="${GREEN}" tabindex="0" data-tip="${esc(d.label)}: ${d.value} new user${d.value === 1 ? '' : 's'}"/>
                        ${d.value ? `<text x="${x + w / 2}" y="${H - h - 5}" text-anchor="middle" font-size="11" font-weight="600" fill="#18181b">${d.value}</text>` : ''}
                        <text x="${x + w / 2}" y="${H + 16}" text-anchor="middle" font-size="11" fill="#52525b">${esc(d.label)}</text>
                    </g>`;
                }).join('')}
            </svg>${tableToggle(data.map((d) => [d.label, d.value]), ['Month', 'New users'])}`);
    };

    /** 100% stacked bar with legend + direct labels (two series). */
    const stacked = ($el, parts) => {
        const total = parts.reduce((n, p) => n + p.value, 0) || 1;
        $el.html(`
            <div class="flex h-8 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label="${parts.map((p) => `${p.label} ${p.value}`).join(', ')}">
                ${parts.map((p) => p.value ? `<span tabindex="0" class="flex items-center justify-center text-xs font-semibold text-white transition-[width] duration-700" style="width:${(p.value / total) * 100}%;background:${p.color}" data-tip="${esc(p.label)}: ${p.value} (${Math.round((p.value / total) * 100)}%)">${(p.value / total) > 0.12 ? `${Math.round((p.value / total) * 100)}%` : ''}</span>` : '').join('')}
            </div>
            <ul class="mt-3 flex flex-wrap gap-4 text-sm" aria-label="Legend">
                ${parts.map((p) => `<li class="flex items-center gap-2"><span class="h-3 w-3 rounded-sm" style="background:${p.color}" aria-hidden="true"></span><span class="text-gray-700">${esc(p.label)}</span><span class="font-semibold tabular-nums text-gray-900">${p.value}</span></li>`).join('')}
            </ul>${tableToggle(parts.map((p) => [p.label, p.value]), ['Status', 'Users'])}`);
    };

    const tile = (label, value, sub, ic, href) => `
        <a href="${href}" class="card group block p-5 transition hover:shadow-lg fade-in">
            <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-gray-600">${label}</p>
                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-50 text-leaf-800">${icon(ic, 'w-5 h-5')}</span>
            </div>
            <p class="mt-2 text-3xl font-bold tabular-nums text-gray-900">${value}</p>
            <p class="mt-1 text-xs text-gray-500">${sub}</p>
        </a>`;

    /** Last 6 months, filling months with no sign-ups with 0. */
    const growthSeries = (rows = []) => {
        const map = Object.fromEntries(rows.map((r) => [r.month, num(r.new_users)]));
        const out = [];
        const d = new Date(); d.setDate(1);
        for (let i = 5; i >= 0; i--) {
            const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
            const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
            out.push({ label: m.toLocaleString(undefined, { month: 'short' }), value: map[key] || 0 });
        }
        return out;
    };

    const render = (s) => {
        const u = s.users || {}, e = s.events || {};
        const totalEv = num(e.total_events), up = num(e.upcoming_events), past = num(e.past_events);
        $('#tiles').attr('aria-busy', 'false').html([
            tile('Users', num(u.total_users), `${num(u.active_users)} active · ${num(u.inactive_users)} disabled`, 'users', 'users.html'),
            tile('Events', totalEv, `${up} upcoming · ${past} past`, 'calendar', 'events.html'),
            tile('Registrations', num(s.registrations?.total_registrations), `${num(s.feedbacks?.total_feedback)} feedback entries`, 'ticket', 'events.html'),
            tile('Unread notifications', Notifs.unreadCount(), `${num(s.notifications?.total_notifications)} sent in total`, 'bell', 'admin-notifications.html'),
            tile('Promos', num(s.promos?.total_promos), 'Captioned videos', 'video', 'promos.html'),
            tile('Announcements', num(s.announcements?.total_announcements), 'Audio updates', 'mic', 'announcements.html'),
        ].join(''));

        hBars($('#chart-content'), [
            { label: 'Events', value: totalEv },
            { label: 'Registrations', value: num(s.registrations?.total_registrations) },
            { label: 'Feedback', value: num(s.feedbacks?.total_feedback) },
            { label: 'Announcements', value: num(s.announcements?.total_announcements) },
            { label: 'Promos', value: num(s.promos?.total_promos) },
            { label: 'Notifications', value: num(s.notifications?.total_notifications) },
        ]);
        columns($('#chart-growth'), growthSeries(s.user_growth));
        stacked($('#chart-users'), [
            { label: 'Active', value: num(u.active_users), color: GREEN },
            { label: 'Disabled', value: num(u.inactive_users), color: AMBER },
        ]);
        hBars($('#chart-events'), [
            { label: 'Upcoming', value: up },
            { label: 'In progress', value: Math.max(0, totalEv - up - past) },
            { label: 'Finished', value: past },
        ]);
        $('#updated-at').text(`Updated ${UI.fmtTime(new Date())}`);
    };

    const loadRecentUsers = async () => {
        try {
            const res = await Services.users.list({ page: 1, limit: 5 });
            const rows = res.data || [];
            $('#recent-users').html(rows.length ? `
                <table class="w-full text-left text-sm"><thead class="text-xs uppercase text-gray-500"><tr><th scope="col" class="py-2 pr-4">Name</th><th scope="col" class="py-2 pr-4">Email</th><th scope="col" class="py-2 pr-4">Role</th><th scope="col" class="py-2">Joined</th></tr></thead>
                <tbody class="divide-y">${rows.map((x) => `<tr><td class="py-2 pr-4 font-medium"><a class="hover:text-leaf-700 hover:underline" href="users.html?id=${x.id}">${esc(x.full_name)}</a></td><td class="py-2 pr-4 text-gray-700">${esc(x.email)}</td><td class="py-2 pr-4">${UI.badge(x.role, x.role === 'admin' ? 'blue' : 'gray')}</td><td class="py-2 text-gray-600">${UI.fmtDate(x.created_at)}</td></tr>`).join('')}</tbody></table>`
                : UI.empty('No users yet'));
        } catch (err) { UI.errorState($('#recent-users'), err, loadRecentUsers); }
    };

    const load = async (manual) => {
        const done = manual ? UI.busy($('#refresh'), 'Refreshing…') : null;
        try {
            const res = await Services.dashboard.admin();
            render(res.data || {});
            if (manual) UI.toast('Dashboard refreshed', 'success', 2000);
        } catch (err) {
            if (!$('#tiles .card').length) UI.errorState($('#tiles'), err, () => load(true));
            else UI.toast(`Could not refresh: ${err.message}`, 'error');
        } finally { done && done(); }
    };

    $('#refresh').html(`${icon('refresh', 'w-4 h-4')} Refresh`).on('click', () => { load(true); loadRecentUsers(); });
    $('#tiles').html(UI.skeletonCards(6, false));
    ['#chart-content', '#chart-growth', '#chart-users', '#chart-events'].forEach((s) => $(s).html('<div class="skeleton h-40 w-full"></div>'));

    Notifs.onChange(() => { if ($('#tiles .card').length) $('#tiles .card').eq(3).find('.text-3xl').text(Notifs.unreadCount()); });
    load();
    loadRecentUsers();
    // keep numbers fresh while the tab is visible
    timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    $(window).on('beforeunload', () => clearInterval(timer));
});
