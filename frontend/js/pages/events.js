/**
 * pages/events.js — Events list: search, date/location filters, client-side pagination.
 * GET /api/events returns every event, so filtering + paging happen here.
 */
App.init(() => {
    const admin = Auth.isAdmin();
    let all = [];
    let registeredIds = new Set();
    let page = Number(UI.param('page')) || 1;

    // ROLE GUARD (UI): reveal admin-only controls
    if (admin) {
        $('#new-event-btn').removeClass('hidden').html(`${UI.icon('plus', 'w-4 h-4')} New event`);
        $('#status-filter').removeClass('hidden').addClass('flex');
    }
    if (UI.param('q')) $('#f-q').val(UI.param('q'));

    const inRange = (ev, when) => {
        const s = new Date(ev.starts_at), e = new Date(ev.ends_at || ev.starts_at), now = new Date();
        const days = (n) => new Date(now.getTime() + n * 86400000);
        switch (when) {
            case 'upcoming': return e >= now;
            case 'today': return s.toDateString() === now.toDateString() || (s <= now && e >= now);
            case 'week': return e >= now && s <= days(7);
            case 'month': return e >= now && s <= days(30);
            case 'past': return e < now;
            default: return true;
        }
    };

    const filtered = () => {
        const q = $('#f-q').val().trim().toLowerCase();
        const loc = $('#f-location').val();
        const when = $('#f-date').val();
        const from = $('#f-from').val();
        const status = admin ? $('input[name=status]:checked').val() : 'published';
        return all.filter((ev) => {
            // Normal users only ever see published events; admins can choose
            if (status === 'published' && ev.published === false) return false;
            if (status === 'draft' && ev.published !== false) return false;
            if (q && !`${ev.title} ${ev.description} ${ev.location}`.toLowerCase().includes(q)) return false;
            if (loc && ev.location !== loc) return false;
            if (from && new Date(ev.starts_at) < new Date(`${from}T00:00`)) return false;
            return inRange(ev, when);
        }).sort((a, b) => (when === 'past' ? new Date(b.starts_at) - new Date(a.starts_at) : new Date(a.starts_at) - new Date(b.starts_at)));
    };

    const render = () => {
        const list = filtered();
        const size = CivicConfig.PAGE_SIZE;
        const pages = Math.max(1, Math.ceil(list.length / size));
        page = Math.min(Math.max(1, page), pages);
        const slice = list.slice((page - 1) * size, page * size);

        $('#result-count').text(`${list.length} event${list.length === 1 ? '' : 's'} found`);
        $('#events-grid').attr('aria-busy', 'false').html(slice.length
            ? slice.map((ev) => Components.eventCard(ev, { registered: registeredIds.has(ev.id) })).join('')
            : UI.empty('No events match your filters', 'Try a different date range or clear the filters.', '<button type="button" class="btn-secondary mt-4" id="empty-reset">Clear filters</button>'));
        UI.pagination($('#pager'), page, pages, (p) => { page = p; render(); $('#main')[0].scrollIntoView({ behavior: 'smooth' }); });
    };

    const load = async () => {
        $('#events-grid').attr('aria-busy', 'true').html(UI.skeletonCards(6));
        try {
            const [evRes, regRes] = await Promise.all([
                Services.events.list(),
                admin ? Promise.resolve({ data: [] }) : Services.registrations.mine().catch(() => ({ data: [] })),
            ]);
            all = evRes.data || [];
            registeredIds = new Set((regRes.data || []).filter((r) => r.status === 'registered').map((r) => r.event_id));
            const locations = [...new Set(all.map((e) => e.location).filter(Boolean))].sort();
            $('#f-location').html('<option value="">All locations</option>' + locations.map((l) => `<option>${UI.esc(l)}</option>`).join(''));
            render();
        } catch (err) {
            UI.errorState($('#events-grid'), err, load);
        }
    };

    // Filters (debounced search)
    let t;
    $('#f-q').on('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(); }, 250); });
    $('#f-location, #f-date, #f-from, input[name=status]').on('change', () => { page = 1; render(); });
    $('#filters').on('submit', (e) => { e.preventDefault(); page = 1; render(); });
    $('#filters').on('reset', () => setTimeout(() => { page = 1; render(); }));
    $(document).on('click', '#empty-reset', () => $('#filters')[0].reset());

    // Register (normal users)
    $(document).on('click', '[data-register]', async function () {
        const id = $(this).data('register');
        const done = UI.busy($(this), 'Registering…');
        try {
            await Services.registrations.register(id);
            registeredIds.add(id);
            UI.toast('You are registered! See it under "My registrations".', 'success');
            render();
        } catch (err) {
            done();
            UI.toast(err.status === 409 ? 'You have already registered for this event before.' : err.message, 'error');
        }
    });

    // Delete (admins only — backend also enforces authorize(['admin']))
    $(document).on('click', '[data-delete-event]', async function () {
        const id = $(this).data('delete-event');
        const ok = await UI.confirm({ title: 'Delete this event?', message: `"${$(this).data('title')}" will be permanently removed, along with its feedback.`, confirmText: 'Delete event', danger: true });
        if (!ok) return;
        try {
            await Services.events.remove(id);
            all = all.filter((e) => e.id !== id);
            UI.toast('Event deleted', 'success');
            render();
        } catch (err) {
            UI.toast(err.status === 500 ? 'This event has registrations and cannot be deleted.' : err.message, 'error');
        }
    });

    load();
});
