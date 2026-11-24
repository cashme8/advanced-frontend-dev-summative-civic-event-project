/**
 * pages/promos.js — video promos list (GET /api/promos).
 * Residents: published only. Admins: status filter + publish/unpublish/edit/delete per card.
 * The list is cached (Services.promos.list) and the cache is invalidated on any write.
 */
App.init(() => {
    const admin = Auth.isAdmin(); // ROLE GUARD (UI only — backend enforces authorize(['admin']))
    let all = [];
    let page = 1;

    if (admin) {
        $('#new-btn').removeClass('hidden').html(`${UI.icon('plus', 'w-4 h-4')} New promo`);
        $('#status-wrap').removeClass('hidden');
    }
    if (UI.param('q')) $('#q').val(UI.param('q'));

    const filtered = () => {
        const q = $('#q').val().trim().toLowerCase();
        const status = admin ? $('#status').val() : 'published'; // normal users never see drafts
        return all.filter((p) => {
            if (status === 'published' && !p.published) return false;
            if (status === 'draft' && p.published) return false;
            return !q || `${p.title} ${p.description || ''}`.toLowerCase().includes(q);
        });
    };

    const render = () => {
        const list = filtered();
        const size = CivicConfig.PAGE_SIZE;
        const pages = Math.max(1, Math.ceil(list.length / size));
        page = Math.min(page, pages);
        const slice = list.slice((page - 1) * size, page * size);
        $('#result-count').text(`${list.length} promo${list.length === 1 ? '' : 's'}`);
        $('#list').attr('aria-busy', 'false').html(slice.length
            ? slice.map((p) => Components.promoCard(p).replace(/<\/article>\s*$/, `${admin ? `<div class="px-5 pb-4">${Components.adminBar('promo', p)}</div>` : ''}</article>`)).join('')
            : UI.empty('No promos found', admin ? 'Upload the first one with "New promo".' : 'New city videos will appear here.'));
        Components.lazyVideos($('#list')); // only load thumbnails that scroll into view
        UI.pagination($('#pager'), page, pages, (p) => { page = p; render(); });
    };

    const load = async () => {
        $('#list').attr('aria-busy', 'true').html(UI.skeletonCards(6));
        try {
            const res = await Services.promos.list();
            all = res.data || [];
            render();
        } catch (err) { UI.errorState($('#list'), err, load); }
    };

    let t;
    $('#q').on('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; render(); }, 200); });
    $('#status').on('change', () => { page = 1; render(); });

    // ---------- ADMIN actions ----------
    $(document).on('click', '[data-toggle-pub]', async function () {
        const id = $(this).data('toggle-pub');
        const isPub = String($(this).data('pub')) === 'true';
        const done = UI.busy($(this), isPub ? 'Unpublishing…' : 'Publishing…');
        try {
            const res = isPub ? await Services.promos.unpublish(id) : await Services.promos.publish(id);
            all = all.map((p) => (p.id === id ? res.data : p));
            UI.toast(isPub ? 'Promo hidden from residents' : 'Promo published — residents notified', 'success');
            render();
        } catch (err) { done(); UI.toast(err.message, 'error'); }
    });

    $(document).on('click', '[data-del]', async function () {
        const id = $(this).data('del');
        const ok = await UI.confirm({ title: 'Delete promo?', message: `"${$(this).data('title')}" will be permanently deleted.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
            await Services.promos.remove(id);
            all = all.filter((p) => p.id !== id);
            UI.toast('Promo deleted', 'success');
            render();
        } catch (err) { UI.toast(err.message, 'error'); }
    });

    load();
});
