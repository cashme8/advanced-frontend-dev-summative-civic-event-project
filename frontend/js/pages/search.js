/**
 * pages/search.js — global search across events, announcements and promos.
 * The API has no search endpoint, so the three (cached) lists are fetched in parallel
 * and filtered here. ROLE GUARD: residents only get published items; admins see all.
 * Each section fails independently (Promise.allSettled) with its own retry.
 */
App.init(() => {
    const { esc, icon, badge } = UI;
    const admin = Auth.isAdmin();
    const q = (UI.param('q') || '').trim();
    $('#sq').val(q);

    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = (text) => terms.every((t) => text.toLowerCase().includes(t));
    const mark = (text) => {
        let out = esc(text || '');
        terms.forEach((t) => { out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="rounded bg-amber-100 px-0.5 text-gray-900">$1</mark>'); });
        return out;
    };
    const visible = (x) => admin || x.published !== false;

    const resultRow = (href, ic, title, meta, snippet, extra = '') => `
        <li><a href="${href}" class="card flex items-start gap-4 p-4 transition hover:shadow-lg">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-leaf-50 text-leaf-800">${icon(ic)}</span>
            <span class="min-w-0 flex-1">
                <span class="block font-semibold text-gray-900">${title} ${extra}</span>
                <span class="mt-0.5 block text-sm text-gray-600">${meta}</span>
                ${snippet ? `<span class="mt-1 block text-sm text-gray-700 line-clamp-2">${snippet}</span>` : ''}
            </span>
        </a></li>`;

    const sections = [
        {
            key: 'events', label: 'Events', load: Services.events.list,
            pick: (e) => matches(`${e.title} ${e.description || ''} ${e.location || ''}`),
            row: (e) => resultRow(`event.html?id=${e.id}`, 'calendar', mark(e.title), `${UI.fmtDateTime(e.starts_at)} · ${mark(e.location || 'Location TBA')}`, mark(e.description), e.published === false ? badge('Unpublished', 'amber') : ''),
        },
        {
            key: 'announcements', label: 'Announcements', load: Services.announcements.list,
            pick: (a) => matches(a.title),
            row: (a) => resultRow(`announcement.html?id=${a.id}`, 'mic', mark(a.title), `Audio · ${UI.fmtDate(a.created_at)}`, '', a.published === false ? badge('Unpublished', 'amber') : ''),
        },
        {
            key: 'promos', label: 'Promos', load: Services.promos.list,
            pick: (p) => matches(`${p.title} ${p.description || ''} ${p.caption_text || ''}`),
            row: (p) => resultRow(`promo.html?id=${p.id}`, 'video', mark(p.title), `Video · ${UI.fmtDate(p.created_at)}`, mark(p.description), p.published === false ? badge('Unpublished', 'amber') : ''),
        },
    ];

    const sectionHtml = (s, body) => `
        <section aria-labelledby="sr-${s.key}" id="sec-${s.key}">
            <h2 id="sr-${s.key}" class="text-lg font-semibold text-gray-900">${s.label} <span data-n class="text-sm font-normal text-gray-500"></span></h2>
            <div class="mt-3" data-body>${body}</div>
        </section>`;

    const run = async () => {
        if (!terms.length) {
            $('#search-summary').text('');
            $('#search-results').html(UI.empty('What are you looking for?', 'Search by event name, location, announcement or promo title.'));
            $('#sq').trigger('focus');
            return;
        }
        document.title = `"${q}" · Search · CivicEvents`;
        $('#search-summary').text('Searching…');
        $('#search-results').html(sections.map((s) => sectionHtml(s, UI.skeletonRows(2))).join(''));

        const results = await Promise.allSettled(sections.map((s) => s.load()));
        let total = 0;
        results.forEach((r, i) => {
            const s = sections[i];
            const $sec = $(`#sec-${s.key}`);
            if (r.status === 'rejected') { UI.errorState($sec.find('[data-body]'), r.reason, run); return; }
            const hits = (r.value.data || []).filter(visible).filter(s.pick);
            total += hits.length;
            $sec.find('[data-n]').text(`(${hits.length})`);
            $sec.find('[data-body]').html(hits.length
                ? `<ul class="space-y-3">${hits.slice(0, 20).map(s.row).join('')}</ul>`
                : `<p class="text-sm text-gray-600">No ${s.label.toLowerCase()} match "${esc(q)}".</p>`);
        });
        $('#search-summary').text(`${total} result${total === 1 ? '' : 's'} for "${q}"`);
    };

    $('#search-form').on('submit', (e) => {
        const v = $('#sq').val().trim();
        if (!v) { e.preventDefault(); $('#sq').trigger('focus'); }
    });

    run();
});
