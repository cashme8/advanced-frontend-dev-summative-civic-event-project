/**
 * components.js — reusable card renderers shared by list pages and global search.
 */
const Components = (() => {
    const { esc, icon, fmtDate, fmtTime, badge } = UI;

    /** Resolve a media URL from the backend (absolute URL, or a /uploads path). */
    const mediaUrl = (u) => {
        if (!u) return '';
        if (/^https?:\/\//.test(u)) return u;
        return CivicConfig.BASE_URL + (u.startsWith('/') ? u : `/${u}`);
    };

    const eventStatus = (ev) => {
        const now = Date.now();
        const s = new Date(ev.starts_at).getTime(), e = new Date(ev.ends_at || ev.starts_at).getTime();
        if (e < now) return ['Past', 'gray'];
        if (s <= now && e >= now) return ['Happening now', 'green'];
        return ['Upcoming', 'blue'];
    };

    /**
     * Event card. opts.registered (bool) toggles Register/Registered.
     * ROLE GUARD: admins get Edit/Delete; normal users get Register.
     */
    const eventCard = (ev, opts = {}) => {
        const admin = Auth.isAdmin();
        const img = ev.metadata?.image_url ? mediaUrl(ev.metadata.image_url) : '';
        const [status, color] = eventStatus(ev);
        const past = status === 'Past';
        return `
        <article class="card group flex flex-col overflow-hidden fade-in transition hover:-translate-y-0.5 hover:shadow-lg" aria-labelledby="ev-${ev.id}">
            <div class="relative h-44 bg-gradient-to-br from-civic-600 to-leaf-500">
                ${img ? `<img src="${esc(img)}" alt="Image for ${esc(ev.title)}" loading="lazy" class="h-full w-full object-cover" onerror="this.remove()">`
                      : `<div class="flex h-full items-center justify-center text-white/80">${icon('calendar', 'w-12 h-12')}</div>`}
                <div class="absolute left-3 top-3 flex gap-2">${badge(status, color)}${ev.published === false ? badge('Unpublished', 'amber') : ''}</div>
                <div class="absolute bottom-3 right-3 rounded-lg bg-white/95 px-3 py-1 text-center shadow" aria-hidden="true">
                    <p class="text-xs font-semibold uppercase text-leaf-700">${new Date(ev.starts_at).toLocaleString(undefined, { month: 'short' })}</p>
                    <p class="text-xl font-extrabold leading-none text-gray-900">${new Date(ev.starts_at).getDate()}</p>
                </div>
            </div>
            <div class="flex flex-1 flex-col p-5">
                <h3 id="ev-${ev.id}" class="text-lg font-semibold text-gray-900"><a href="event.html?id=${ev.id}" class="hover:text-leaf-700 hover:underline">${esc(ev.title)}</a></h3>
                <ul class="mt-2 space-y-1 text-sm text-gray-700">
                    <li class="flex items-center gap-2">${icon('calendar', 'w-4 h-4 text-civic-600')}<span>${fmtDate(ev.starts_at)} · ${fmtTime(ev.starts_at)}${ev.ends_at ? `–${fmtTime(ev.ends_at)}` : ''}</span></li>
                    <li class="flex items-center gap-2">${icon('pin', 'w-4 h-4 text-civic-600')}<span>${esc(ev.location || 'Location TBA')}</span></li>
                </ul>
                <p class="mt-3 flex-1 text-sm text-gray-600 line-clamp-2">${esc(ev.description || '')}</p>
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <a href="event.html?id=${ev.id}" class="btn-secondary !py-2" aria-label="View details for ${esc(ev.title)}">View</a>
                    ${admin ? `
                        <a href="event-form.html?id=${ev.id}" class="btn-ghost" aria-label="Edit ${esc(ev.title)}">${icon('edit', 'w-4 h-4')} Edit</a>
                        <button type="button" class="btn-ghost !text-red-700 hover:!bg-red-50" data-delete-event="${ev.id}" data-title="${esc(ev.title)}" aria-label="Delete ${esc(ev.title)}">${icon('trash', 'w-4 h-4')} Delete</button>
                    ` : past ? '' : opts.registered
                        ? `<span class="inline-flex items-center gap-1 text-sm font-semibold text-leaf-700">${icon('check', 'w-4 h-4')} Registered</span>`
                        : `<button type="button" class="btn-success !py-2" data-register="${ev.id}" aria-label="Register for ${esc(ev.title)}">Register</button>`}
                </div>
            </div>
        </article>`;
    };

    const announcementCard = (a, duration) => `
        <article class="card flex flex-col p-5 fade-in transition hover:shadow-lg" aria-labelledby="an-${a.id}">
            <div class="flex items-start gap-4">
                <a href="announcement.html?id=${a.id}" class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-civic-700 text-white hover:bg-civic-800" aria-label="Play ${esc(a.title)}">${icon('play', 'w-6 h-6')}</a>
                <div class="min-w-0 flex-1">
                    <h3 id="an-${a.id}" class="font-semibold text-gray-900"><a href="announcement.html?id=${a.id}" class="hover:text-leaf-700 hover:underline">${esc(a.title)}</a></h3>
                    <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                        <span class="inline-flex items-center gap-1">${icon('mic', 'w-4 h-4')} <span data-duration="${a.id}">${duration || '--:--'}</span><span class="sr-only"> duration</span></span>
                        <span>${fmtDate(a.created_at)}</span>
                        ${a.published === false ? badge('Unpublished', 'amber') : ''}
                    </p>
                </div>
            </div>
        </article>`;

    const promoCard = (p) => `
        <article class="card group flex flex-col overflow-hidden fade-in transition hover:-translate-y-0.5 hover:shadow-lg" aria-labelledby="pr-${p.id}">
            <a href="promo.html?id=${p.id}" class="relative block aspect-video bg-gray-900" aria-label="Play promo: ${esc(p.title)}">
                <!-- thumbnail = first frame of the video. LAZY: src is only set when the card scrolls into view (see lazyVideos) -->
                <video class="h-full w-full object-cover opacity-90" data-lazy-src="${esc(mediaUrl(p.video_url))}#t=0.5" preload="none" muted playsinline tabindex="-1" aria-hidden="true"></video>
                <span class="absolute inset-0 flex items-center justify-center">
                    <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-civic-800 shadow-lg transition group-hover:scale-110">${icon('play', 'w-6 h-6')}</span>
                </span>
                <span class="absolute left-3 top-3 flex gap-2">${p.caption_text ? badge('CC', 'green') : ''}${p.published === false ? badge('Unpublished', 'amber') : ''}</span>
            </a>
            <div class="flex flex-1 flex-col p-5">
                <h3 id="pr-${p.id}" class="font-semibold text-gray-900"><a href="promo.html?id=${p.id}" class="hover:text-leaf-700 hover:underline">${esc(p.title)}</a></h3>
                <p class="mt-1 flex-1 text-sm text-gray-600 line-clamp-2">${esc(p.description || '')}</p>
                <p class="mt-3 text-xs text-gray-500">${fmtDate(p.created_at)}</p>
            </div>
        </article>`;

    /**
     * Wire up an accessible upload zone:
     *   <div class="dropzone" data-kind="image|audio|video"><input type="file" id="…"> … <p data-file-info></p></div>
     * Validates type/size BEFORE upload (CivicConfig.UPLOAD_LIMITS) and calls onFile(file|null).
     */
    const fileField = ($zone, onFile) => {
        const kind = $zone.data('kind');
        const $input = $zone.find('input[type=file]');
        const $info = $zone.find('[data-file-info]');
        const handle = (file) => {
            const err = UI.validateFile(file, kind);
            UI.fieldError($input, err);
            if (err || !file) {
                $input.val('');
                $info.text(err ? '' : 'No file chosen');
                onFile(null);
                return;
            }
            $info.html(`<span class="font-medium text-gray-900">${esc(file.name)}</span> · ${UI.fileSize(file.size)}`);
            onFile(file);
        };
        $input.on('change', () => handle($input[0].files[0]));
        $zone.on('dragover dragenter', (e) => { e.preventDefault(); $zone.addClass('dragover'); })
             .on('dragleave drop', (e) => { e.preventDefault(); $zone.removeClass('dragover'); })
             .on('drop', (e) => {
                 const file = e.originalEvent.dataTransfer.files[0];
                 if (!file) return;
                 const dt = new DataTransfer(); dt.items.add(file); $input[0].files = dt.files;
                 handle(file);
             });
        return { clear: () => handle(null), get file() { return $input[0].files[0] || null; } };
    };

    /** Lazy-load heavy media: <video data-lazy-src> only gets its src once it is near the viewport. */
    const lazyVideos = ($root = $(document)) => {
        const vids = $root.find('video[data-lazy-src]').toArray();
        const load = (v) => { v.preload = 'metadata'; v.src = v.dataset.lazySrc; v.removeAttribute('data-lazy-src'); };
        if (!('IntersectionObserver' in window)) return vids.forEach(load);
        const io = new IntersectionObserver((entries) => entries.forEach((e) => {
            if (e.isIntersecting) { load(e.target); io.unobserve(e.target); }
        }), { rootMargin: '200px' });
        vids.forEach((v) => io.observe(v));
    };

    /** Small reusable admin action bar (publish toggle / edit / delete). ROLE GUARD: callers only render it when Auth.isAdmin(). */
    const adminBar = (kind, item) => `
        <div class="mt-4 flex flex-wrap gap-2 border-t pt-3">
            <a href="${kind}-form.html?id=${item.id}" class="btn-ghost text-sm">${icon('edit', 'w-4 h-4')} Edit</a>
            <button type="button" class="btn-ghost text-sm" data-toggle-pub="${item.id}" data-pub="${item.published}">${item.published ? 'Unpublish' : 'Publish'}</button>
            <button type="button" class="btn-ghost text-sm !text-red-700 hover:!bg-red-50" data-del="${item.id}" data-title="${esc(item.title)}">${icon('trash', 'w-4 h-4')} Delete</button>
        </div>`;

    /** Date "tile" used in registration lists and search results. */
    const dateTile = (d) => `
        <div class="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-leaf-50 text-center ring-1 ring-leaf-200" aria-hidden="true">
            <span class="text-[11px] font-semibold uppercase text-leaf-800">${new Date(d).toLocaleString(undefined, { month: 'short' })}</span>
            <span class="text-lg font-extrabold leading-none text-gray-900">${new Date(d).getDate()}</span>
        </div>`;

    return { mediaUrl, eventStatus, eventCard, announcementCard, promoCard, fileField, lazyVideos, adminBar, dateTile };
})();
