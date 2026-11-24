/**
 * pages/announcements.js — audio announcements list.
 * Residents: published only. Admins: status filter + publish/unpublish/edit/delete per card.
 * Duration isn't stored by the backend, so it's read from each file's metadata (preload="metadata").
 */
App.init(() => {
    const admin = Auth.isAdmin();
    let all = [];
    let page = 1;
    const durations = {}; // id -> "m:ss" (cached across re-renders)

    if (admin) {
        $('#new-btn').removeClass('hidden').html(`${UI.icon('plus', 'w-4 h-4')} New announcement`);
        $('#status-wrap').removeClass('hidden');
    }

    const adminBar = (a) => `
        <div class="mt-4 flex flex-wrap gap-2 border-t pt-3">
            <a href="announcement-form.html?id=${a.id}" class="btn-ghost text-sm">${UI.icon('edit', 'w-4 h-4')} Edit</a>
            <button type="button" class="btn-ghost text-sm" data-toggle-pub="${a.id}" data-pub="${a.published}">${a.published ? 'Unpublish' : 'Publish'}</button>
            <button type="button" class="btn-ghost text-sm !text-red-700 hover:!bg-red-50" data-del="${a.id}" data-title="${UI.esc(a.title)}">${UI.icon('trash', 'w-4 h-4')} Delete</button>
        </div>`;

    const loadDuration = (a) => {
        if (durations[a.id]) return;
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = Components.mediaUrl(a.audio_url);
        audio.addEventListener('loadedmetadata', () => {
            durations[a.id] = UI.fmtDuration(audio.duration);
            $(`[data-duration="${a.id}"]`).text(durations[a.id]);
        });
        audio.addEventListener('error', () => $(`[data-duration="${a.id}"]`).text('unavailable'));
    };

    const filtered = () => {
        const q = $('#q').val().trim().toLowerCase();
        const status = admin ? $('#status').val() : 'published';
        return all.filter((a) => {
            if (status === 'published' && !a.published) return false;
            if (status === 'draft' && a.published) return false;
            return !q || a.title.toLowerCase().includes(q);
        });
    };

    const render = () => {
        const list = filtered();
        const size = CivicConfig.PAGE_SIZE;
        const pages = Math.max(1, Math.ceil(list.length / size));
        page = Math.min(page, pages);
        const slice = list.slice((page - 1) * size, page * size);
        $('#result-count').text(`${list.length} announcement${list.length === 1 ? '' : 's'}`);
        $('#list').attr('aria-busy', 'false').html(slice.length
            ? slice.map((a) => Components.announcementCard(a, durations[a.id]).replace(/<\/article>$/, `${admin ? adminBar(a) : ''}</article>`)).join('')
            : UI.empty('No announcements yet', admin ? 'Create the first one with "New announcement".' : 'Check back soon for city updates.'));
        slice.forEach(loadDuration);
        UI.pagination($('#pager'), page, pages, (p) => { page = p; render(); });
    };

    const load = async () => {
        $('#list').attr('aria-busy', 'true').html(UI.skeletonCards(4, false));
        try {
            const res = await Services.announcements.list();
            all = res.data || [];
            render();
        } catch (err) { UI.errorState($('#list'), err, load); }
    };

    $('#q').on('input', () => { page = 1; render(); });
    $('#status').on('change', () => { page = 1; render(); });

    // ADMIN actions
    $(document).on('click', '[data-toggle-pub]', async function () {
        const id = $(this).data('toggle-pub');
        const isPub = $(this).data('pub') === true || $(this).data('pub') === 'true';
        const done = UI.busy($(this), isPub ? 'Unpublishing…' : 'Publishing…');
        try {
            const res = isPub ? await Services.announcements.unpublish(id) : await Services.announcements.publish(id);
            all = all.map((a) => (a.id === id ? res.data : a));
            UI.toast(isPub ? 'Announcement hidden from residents' : 'Announcement published — residents notified', 'success');
            render();
        } catch (err) { done(); UI.toast(err.message, 'error'); }
    });

    $(document).on('click', '[data-del]', async function () {
        const id = $(this).data('del');
        const ok = await UI.confirm({ title: 'Delete announcement?', message: `"${$(this).data('title')}" will be permanently deleted.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await Services.announcements.remove(id);
            all = all.filter((a) => a.id !== id);
            UI.toast('Announcement deleted', 'success');
            render();
        } catch (err) { UI.toast(err.message, 'error'); }
    });

    load();
});
