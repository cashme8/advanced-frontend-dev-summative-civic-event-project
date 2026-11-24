/**
 * pages/announcement.js — announcement detail (GET /api/announcements/:id).
 *
 * Accessible custom audio player wrapped around a real <audio> element:
 *  - labelled buttons (play/pause, back/forward 10 s, mute), a seek slider with
 *    aria-valuetext ("1:05 of 3:20"), volume slider and playback speed
 *  - keyboard: Space/K play-pause, ←/→ seek 5 s, M mute (when the player has focus)
 *  - current time / duration display, fallback text + download link if the format can't play
 */
App.init(() => {
    const id = UI.param('id');
    const admin = Auth.isAdmin();
    const { esc, icon, badge, fmtDuration } = UI;
    const $root = $('#announcement-root');
    let item = null;

    const render = () => {
        const a = item;
        const src = Components.mediaUrl(a.audio_url);
        document.title = `${a.title} · CivicEvents`;
        $root.attr('aria-busy', 'false').html(`
        <article class="fade-in" aria-labelledby="an-title">
            <header>
                <p class="inline-flex items-center gap-2 text-sm font-semibold text-leaf-800">${icon('megaphone', 'w-4 h-4')} City announcement</p>
                <h1 id="an-title" class="mt-2 text-3xl font-bold tracking-tight text-gray-900">${esc(a.title)}</h1>
                <p class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">Published ${UI.fmtDateTime(a.created_at)} ${a.published ? '' : badge('Unpublished', 'amber')}</p>
            </header>

            <section id="player" class="card mt-6 p-5 sm:p-6" role="region" aria-label="Audio player for ${esc(a.title)}" tabindex="0">
                <audio id="audio" preload="metadata" src="${esc(src)}">
                    Your browser does not support HTML5 audio. <a href="${esc(src)}">Download the announcement</a>.
                </audio>
                <div class="flex items-center gap-3">
                    <button type="button" id="back10" class="flex flex-col items-center rounded-lg p-1.5 text-gray-700 hover:bg-gray-100" aria-label="Back 10 seconds">${icon('refresh', 'w-5 h-5 -scale-x-100')}<span class="text-[10px] font-semibold" aria-hidden="true">−10</span></button>
                    <button type="button" id="play" class="flex h-14 w-14 items-center justify-center rounded-full bg-leaf-700 text-white shadow hover:bg-leaf-800" aria-label="Play">${icon('play', 'w-6 h-6')}</button>
                    <button type="button" id="fwd10" class="flex flex-col items-center rounded-lg p-1.5 text-gray-700 hover:bg-gray-100" aria-label="Forward 10 seconds">${icon('refresh', 'w-5 h-5')}<span class="text-[10px] font-semibold" aria-hidden="true">+10</span></button>
                    <div class="min-w-0 flex-1">
                        <label for="seek" class="sr-only">Seek</label>
                        <input id="seek" type="range" min="0" max="100" step="0.1" value="0" class="w-full" aria-valuetext="0:00 of --:--">
                        <div class="mt-1 flex justify-between text-xs font-medium text-gray-600" aria-hidden="true"><span id="cur">0:00</span><span id="dur">--:--</span></div>
                    </div>
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-sm">
                    <div class="flex items-center gap-2">
                        <button type="button" id="mute" class="rounded-lg p-1.5 text-gray-700 hover:bg-gray-100" aria-label="Mute" aria-pressed="false">${icon('volume', 'w-5 h-5')}</button>
                        <label for="vol" class="sr-only">Volume</label>
                        <input id="vol" type="range" min="0" max="1" step="0.05" value="1" class="w-24">
                    </div>
                    <div class="flex items-center gap-2">
                        <label for="speed" class="text-gray-700">Speed</label>
                        <select id="speed" class="input !w-auto !py-1 text-sm">
                            <option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
                        </select>
                    </div>
                    <a href="${esc(src)}" download class="ml-auto text-leaf-700 hover:underline">Download audio</a>
                </div>
                <p id="player-status" class="sr-only" aria-live="polite"></p>
                <p id="player-error" class="mt-3 hidden rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert"></p>
                <p class="mt-3 text-xs text-gray-500">Keyboard: Space or K to play/pause · ← → to skip 5 s · M to mute</p>
            </section>

            <section class="card mt-6 p-5" aria-labelledby="tr-h">
                <h2 id="tr-h" class="font-semibold text-gray-900">Transcript</h2>
                ${a.transcript
                    ? `<p class="mt-2 whitespace-pre-line text-gray-700">${esc(a.transcript)}</p>`
                    : `<p class="mt-2 text-sm text-gray-600">A written transcript wasn't provided for this announcement. Summary: <strong>${esc(a.title)}</strong>. If you need this announcement in another format, <a class="text-leaf-700 underline" href="mailto:support@civicevents.example">contact the city</a>.</p>`}
            </section>

            ${admin ? `
            <!-- ADMIN-ONLY controls (hidden for residents; API also rejects non-admins) -->
            <div class="card mt-6 flex flex-wrap items-center gap-2 p-4">
                <span class="mr-auto text-sm font-semibold text-gray-700">Admin</span>
                <a href="announcement-form.html?id=${a.id}" class="btn-secondary !py-2">${icon('edit', 'w-4 h-4')} Edit</a>
                <button type="button" id="pub-btn" class="btn-secondary !py-2">${a.published ? 'Unpublish' : 'Publish'}</button>
                <button type="button" id="del-btn" class="btn-danger !py-2">${icon('trash', 'w-4 h-4')} Delete</button>
            </div>` : ''}
        </article>`);
        wirePlayer();
    };

    const wirePlayer = () => {
        const audio = document.getElementById('audio');
        const $seek = $('#seek');
        const status = (t) => $('#player-status').text(t);
        const syncTime = () => {
            const d = audio.duration;
            $('#cur').text(fmtDuration(audio.currentTime));
            if (isFinite(d)) $seek.val((audio.currentTime / d) * 100);
            $seek.attr('aria-valuetext', `${fmtDuration(audio.currentTime)} of ${fmtDuration(d)}`);
        };
        const toggle = () => (audio.paused ? audio.play().catch(() => {}) : audio.pause());
        const skip = (s) => { audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + s)); };

        audio.addEventListener('loadedmetadata', () => { $('#dur').text(fmtDuration(audio.duration)); syncTime(); });
        audio.addEventListener('timeupdate', syncTime);
        audio.addEventListener('play', () => { $('#play').attr('aria-label', 'Pause').html(icon('pause', 'w-6 h-6')); status('Playing'); });
        audio.addEventListener('pause', () => { $('#play').attr('aria-label', 'Play').html(icon('play', 'w-6 h-6')); status('Paused'); });
        audio.addEventListener('ended', () => status('Finished'));
        audio.addEventListener('error', () => {
            $('#player-error').removeClass('hidden').html(`This audio couldn't be played in your browser. <a class="underline" href="${esc(audio.src)}" download>Download it</a> to listen instead.`);
            $('#play, #back10, #fwd10, #seek').prop('disabled', true);
        });

        $('#play').on('click', toggle);
        $('#back10').on('click', () => skip(-10));
        $('#fwd10').on('click', () => skip(10));
        $seek.on('input', () => { if (isFinite(audio.duration)) audio.currentTime = ($seek.val() / 100) * audio.duration; });
        $('#vol').on('input', function () { audio.volume = this.value; audio.muted = this.value == 0; syncMute(); });
        const syncMute = () => $('#mute').attr({ 'aria-pressed': String(audio.muted), 'aria-label': audio.muted ? 'Unmute' : 'Mute' }).html(icon(audio.muted ? 'mute' : 'volume', 'w-5 h-5'));
        $('#mute').on('click', () => { audio.muted = !audio.muted; syncMute(); });
        $('#speed').on('change', function () { audio.playbackRate = Number(this.value); status(`Speed ${this.value} times`); });

        $('#player').on('keydown', (e) => {
            if ($(e.target).is('input, select')) return; // let sliders/selects keep their own keys
            if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); skip(-5); }
            if (e.key === 'ArrowRight') { e.preventDefault(); skip(5); }
            if (e.key === 'm') { audio.muted = !audio.muted; syncMute(); }
        });
    };

    const load = async () => {
        if (!id) { $root.html(UI.empty('No announcement selected', 'Go back to the list and pick one.')); return; }
        $root.html('<div class="skeleton h-8 w-2/3"></div><div class="skeleton mt-6 h-40 w-full"></div>');
        try {
            const res = await Services.announcements.get(id);
            item = res.data;
            if (!item.published && !admin) { $root.html(UI.empty('This announcement is not available', 'It may have been unpublished.')); return; }
            render();
        } catch (err) {
            if (err.status === 404) $root.html(UI.empty('Announcement not found', 'It may have been deleted.'));
            else UI.errorState($root, err, load);
        }
    };

    // ---------- ADMIN actions ----------
    $(document).on('click', '#pub-btn', async function () {
        const done = UI.busy($(this));
        try {
            const res = item.published ? await Services.announcements.unpublish(id) : await Services.announcements.publish(id);
            item = res.data;
            UI.toast(item.published ? 'Announcement published — residents notified' : 'Announcement unpublished', 'success');
            render();
        } catch (err) { done(); UI.toast(err.message, 'error'); }
    });
    $(document).on('click', '#del-btn', async () => {
        const ok = await UI.confirm({ title: 'Delete announcement?', message: `"${item.title}" will be permanently deleted.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await Services.announcements.remove(id);
            UI.flash('Announcement deleted', 'success');
            location.href = 'announcements.html';
        } catch (err) { UI.toast(err.message, 'error'); }
    });

    load();
});
