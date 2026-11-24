/**
 * pages/my-registrations.js — the logged-in user's registrations
 * (GET /api/event-registrations/my-registrations), grouped into Upcoming / Past / Cancelled.
 * Cancel calls POST /api/event-registrations/cancel { event_id } (optimistic, reverted on failure).
 */
App.init(() => {
    const { esc, icon, badge } = UI;
    let rows = [];
    let tab = ['upcoming', 'past', 'cancelled'].includes(UI.param('tab')) ? UI.param('tab') : 'upcoming';

    const group = (r) => {
        if (r.status === 'cancelled') return 'cancelled';
        return new Date(r.ends_at || r.starts_at) < new Date() ? 'past' : 'upcoming';
    };

    const row = (r) => {
        const g = group(r);
        return `
        <article class="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center fade-in" aria-labelledby="reg-${r.id}">
            ${Components.dateTile(r.starts_at)}
            <div class="min-w-0 flex-1">
                <h2 id="reg-${r.id}" class="font-semibold text-gray-900"><a href="event.html?id=${r.event_id}" class="hover:text-leaf-700 hover:underline">${esc(r.title)}</a></h2>
                <p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span class="inline-flex items-center gap-1">${icon('calendar', 'w-4 h-4')} ${UI.fmtDateTime(r.starts_at)}</span>
                    <span class="inline-flex items-center gap-1">${icon('pin', 'w-4 h-4')} ${esc(r.location || 'Location TBA')}</span>
                </p>
                <p class="mt-1 text-xs text-gray-500">Registered ${UI.timeAgo(r.created_at)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                ${g === 'upcoming' ? `${badge('Registered', 'green')}<button type="button" class="btn-secondary !py-2 !text-red-700" data-cancel="${r.event_id}" data-title="${esc(r.title)}">Cancel</button>` : ''}
                ${g === 'past' ? `<a href="event.html?id=${r.event_id}#feedback" class="btn-secondary !py-2">${icon('star', 'w-4 h-4')} Leave feedback</a>` : ''}
                ${g === 'cancelled' ? badge('Cancelled', 'gray') : ''}
            </div>
        </article>`;
    };

    const render = () => {
        ['upcoming', 'past', 'cancelled'].forEach((g) => $(`[data-count="${g}"]`).text(`(${rows.filter((r) => group(r) === g).length})`));
        $('[data-tab]').attr('aria-selected', 'false').filter(`[data-tab="${tab}"]`).attr('aria-selected', 'true');
        const list = rows.filter((r) => group(r) === tab)
            .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.starts_at) - new Date(b.starts_at)));
        const emptyText = { upcoming: ['No upcoming events', 'Browse events and register for something you like.'], past: ['No past events yet', 'Events you attended will appear here.'], cancelled: ['No cancelled registrations', ''] }[tab];
        $('#reg-list').attr('aria-busy', 'false').html(list.length ? list.map(row).join('')
            : UI.empty(emptyText[0], emptyText[1], tab === 'upcoming' ? '<a href="events.html" class="btn-primary mt-4">Browse events</a>' : ''));
    };

    const load = async () => {
        $('#reg-list').attr('aria-busy', 'true').html(UI.skeletonRows(4));
        try {
            const res = await Services.registrations.mine();
            rows = res.data || [];
            render();
        } catch (err) { UI.errorState($('#reg-list'), err, load); }
    };

    $('[data-tab]').on('click', function () {
        tab = $(this).data('tab');
        history.replaceState(null, '', `my-registrations.html?tab=${tab}`);
        render();
    }).on('keydown', function (e) { // arrow keys between tabs
        const tabs = $('[data-tab]').toArray();
        const i = tabs.indexOf(this);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            next.focus(); next.click();
        }
    });

    $(document).on('click', '[data-cancel]', async function () {
        const eventId = $(this).data('cancel');
        // Note: the API keeps one registration row per user+event, so a cancelled place can't be re-booked.
        const ok = await UI.confirm({ title: 'Cancel registration?', message: `You'll lose your place at "${$(this).data('title')}" and won't be able to register for it again.`, confirmText: 'Cancel registration', danger: true });
        if (!ok) return;
        const r = rows.find((x) => x.event_id === eventId);
        const prev = r.status;
        r.status = 'cancelled'; // optimistic
        render();
        try {
            await Services.registrations.cancel(eventId);
            UI.toast('Registration cancelled', 'success');
        } catch (err) {
            r.status = prev; render();
            UI.toast(err.message, 'error');
        }
    });

    load();
});
