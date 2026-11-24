/**
 * pages/promo.js — promo detail (GET /api/promos/:id).
 *
 * Video: native HTML5 controls (play/pause, volume, fullscreen, keyboard support).
 * Captions: the backend stores plain `caption_text` (no .vtt file), so we build a
 * WebVTT track in the browser — the text is split into sentences and spread evenly
 * over the video's duration — and attach it as <track kind="captions" default>.
 * If caption_text is already a WebVTT document it is used as-is.
 * The full text is also shown as a transcript below the player.
 */
App.init(() => {
    const id = UI.param('id');
    const admin = Auth.isAdmin();
    const { esc, icon, badge } = UI;
    const $root = $('#promo-root');
    let promo = null;
    let trackUrl = '';

    // ---------- captions ----------
    const vttTime = (s) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = (s % 60).toFixed(3);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${sec.padStart(6, '0')}`;
    };
    const buildVtt = (text, duration) => {
        if (/^\s*WEBVTT/.test(text)) return text;
        const lines = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*/g) || [text];
        const total = isFinite(duration) && duration > 0 ? duration : lines.length * 3;
        // weight each cue by its length so longer sentences stay on screen longer
        const chars = lines.reduce((n, l) => n + l.length, 0);
        let t = 0;
        const cues = lines.map((l, i) => {
            const len = (l.length / chars) * total;
            const cue = `${i + 1}\n${vttTime(t)} --> ${vttTime(Math.min(total, t + len))}\n${l.trim()}`;
            t += len;
            return cue;
        });
        return `WEBVTT\n\n${cues.join('\n\n')}\n`;
    };

    const attachCaptions = (video) => {
        if (!promo.caption_text) return;
        URL.revokeObjectURL(trackUrl);
        trackUrl = URL.createObjectURL(new Blob([buildVtt(promo.caption_text, video.duration)], { type: 'text/vtt' }));
        $(video).find('track').remove();
        $(video).append(`<track kind="captions" src="${trackUrl}" srclang="en" label="English" default>`);
        // Turn captions ON by default
        setTimeout(() => { if (video.textTracks[0]) video.textTracks[0].mode = 'showing'; syncCcBtn(video); }, 0);
    };

    const syncCcBtn = (video) => {
        const on = video.textTracks[0]?.mode === 'showing';
        $('#cc-btn').attr('aria-pressed', String(on)).html(`<span class="rounded border border-current px-1 text-xs font-bold">CC</span> Captions ${on ? 'on' : 'off'}`);
    };

    // ---------- render ----------
    const render = () => {
        const p = promo;
        document.title = `${p.title} · CivicEvents`;
        $root.attr('aria-busy', 'false').html(`
        <article class="fade-in" aria-labelledby="promo-title">
            <div class="overflow-hidden rounded-xl bg-black shadow-lg">
                <video id="player" class="aspect-video w-full" controls playsinline preload="metadata"
                       src="${esc(Components.mediaUrl(p.video_url))}" aria-describedby="promo-desc">
                    <p class="p-4 text-white">Your browser can't play this video. <a class="underline" href="${esc(Components.mediaUrl(p.video_url))}">Download it instead</a>.</p>
                </video>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
                ${p.caption_text ? `<button type="button" id="cc-btn" class="btn-secondary !py-2" aria-pressed="true"></button>` : `<span class="text-sm text-gray-600">No captions provided for this video.</span>`}
                ${p.published ? '' : badge('Unpublished', 'amber')}
            </div>

            <header class="mt-6">
                <h1 id="promo-title" class="text-3xl font-bold tracking-tight text-gray-900">${esc(p.title)}</h1>
                <p class="mt-1 text-sm text-gray-500">Added ${UI.fmtDate(p.created_at)}</p>
                <p id="promo-desc" class="mt-3 text-gray-700">${esc(p.description || '')}</p>
            </header>

            ${admin ? `
            <!-- ADMIN-ONLY controls (hidden for residents; the API also rejects non-admins) -->
            <div class="card mt-6 flex flex-wrap items-center gap-2 p-4">
                <span class="mr-auto text-sm font-semibold text-gray-700">Admin</span>
                <a href="promo-form.html?id=${p.id}" class="btn-secondary !py-2">${icon('edit', 'w-4 h-4')} Edit</a>
                <button type="button" id="pub-btn" class="btn-secondary !py-2">${p.published ? 'Unpublish' : 'Publish'}</button>
                <button type="button" id="del-btn" class="btn-danger !py-2">${icon('trash', 'w-4 h-4')} Delete</button>
            </div>` : ''}

            ${p.caption_text ? `
            <details class="card mt-6 p-5" open>
                <summary class="cursor-pointer font-semibold text-gray-900">Transcript</summary>
                <p class="mt-3 whitespace-pre-line text-gray-700">${esc(p.caption_text.replace(/^\s*WEBVTT[\s\S]*?\n\n/, ''))}</p>
            </details>` : ''}
        </article>`);

        const video = document.getElementById('player');
        video.addEventListener('loadedmetadata', () => attachCaptions(video), { once: true });
        video.addEventListener('error', () => UI.toast('The video file could not be loaded.', 'error'));
        if (video.readyState >= 1) attachCaptions(video);
        $('#cc-btn').on('click', () => {
            const tr = video.textTracks[0];
            if (!tr) return;
            tr.mode = tr.mode === 'showing' ? 'hidden' : 'showing';
            syncCcBtn(video);
        });
    };

    const load = async () => {
        if (!id) { $root.html(UI.empty('No promo selected', 'Go back to the promos list and pick one.')); return; }
        $root.html('<div class="skeleton aspect-video w-full"></div><div class="skeleton mt-6 h-8 w-1/2"></div><div class="skeleton mt-3 h-4 w-3/4"></div>');
        try {
            const res = await Services.promos.get(id);
            promo = res.data;
            // Residents must not see unpublished promos even via a direct link
            if (!promo.published && !admin) { $root.html(UI.empty('This promo is not available', 'It may have been unpublished by the city.')); return; }
            render();
        } catch (err) {
            if (err.status === 404) $root.html(UI.empty('Promo not found', 'It may have been deleted.'));
            else UI.errorState($root, err, load);
        }
    };

    // ---------- ADMIN actions ----------
    $(document).on('click', '#pub-btn', async function () {
        const done = UI.busy($(this));
        try {
            const res = promo.published ? await Services.promos.unpublish(id) : await Services.promos.publish(id);
            promo = res.data;
            UI.toast(promo.published ? 'Promo published — residents notified' : 'Promo unpublished', 'success');
            render();
        } catch (err) { done(); UI.toast(err.message, 'error'); }
    });
    $(document).on('click', '#del-btn', async () => {
        const ok = await UI.confirm({ title: 'Delete promo?', message: `"${promo.title}" will be permanently deleted.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await Services.promos.remove(id);
            UI.flash('Promo deleted', 'success');
            location.href = 'promos.html';
        } catch (err) { UI.toast(err.message, 'error'); }
    });

    load();
});
