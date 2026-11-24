/**
 * pages/promo-form.js — ADMIN ONLY create/edit promo.
 * Access: <body data-role="admin"> → Auth.guard() shows a 403 view to non-admins before
 * this runs; the backend route also uses authorize(['admin']).
 *
 * Upload: multipart/form-data, file under key "video" (backend: uploadPromoVideo.single('video'))
 * plus title, description, caption_text (all required by the API).
 * The create endpoint always publishes; if "Published" is off we call /unpublish right after.
 */
App.init(() => {
    const id = UI.param('id');
    const editing = !!id;
    let existing = null;
    let previewUrl = '';

    const setPreview = (src) => {
        $('#video-preview').html(src
            ? `<video src="${UI.esc(src)}" controls muted preload="metadata" class="h-full w-full bg-black" aria-label="Preview of the selected video"></video>`
            : '<span class="text-sm">No video selected</span>');
    };

    const upload = Components.fileField($('.dropzone'), (file) => {
        URL.revokeObjectURL(previewUrl);
        if (!file) { setPreview(existing ? Components.mediaUrl(existing.video_url) : ''); return; }
        previewUrl = URL.createObjectURL(file); // preview BEFORE upload
        setPreview(previewUrl);
    });

    // ---------- edit mode ----------
    if (editing) {
        $('#form-title').text('Edit promo');
        $('#submit-btn').text('Save changes');
        $('#video-req').text('(optional — leave empty to keep the current video)').addClass('font-normal text-gray-600');
        document.title = 'Edit promo · CivicEvents';
        $('#promo-form').addClass('opacity-60 pointer-events-none').attr('aria-busy', 'true');
        Services.promos.get(id).then((res) => {
            existing = res.data;
            $('#title').val(existing.title);
            $('#description').val(existing.description || '');
            $('#caption_text').val(existing.caption_text || '');
            $('#published').prop('checked', existing.published !== false);
            setPreview(Components.mediaUrl(existing.video_url));
        }).catch((err) => UI.formAlert($('#form-alert'), `Could not load promo: ${err.message}`))
          .finally(() => $('#promo-form').removeClass('opacity-60 pointer-events-none').removeAttr('aria-busy'));
    }

    const validate = () => {
        const v = (s) => $(s).val().trim();
        let ok = true;
        ok = UI.fieldError($('#title'), v('#title').length < 3 ? 'Title must be at least 3 characters.' : '') && ok;
        ok = UI.fieldError($('#description'), !v('#description') ? 'A short description is required.' : '') && ok;
        ok = UI.fieldError($('#caption_text'), !v('#caption_text') ? 'Captions are required so the video is accessible.' : '') && ok;
        ok = UI.fieldError($('#video'), !editing && !upload.file ? 'Please choose a video file.' : '') && ok;
        if (!ok) $('#promo-form [aria-invalid=true]').first().trigger('focus');
        return ok;
    };

    $('#promo-form').on('submit', async (e) => {
        e.preventDefault();
        UI.formAlert($('#form-alert'), '');
        if (!validate()) return;

        const published = $('#published').is(':checked');
        const fd = new FormData();
        fd.append('title', $('#title').val().trim());
        fd.append('description', $('#description').val().trim());
        fd.append('caption_text', $('#caption_text').val().trim());
        if (editing) fd.append('published', published);
        if (upload.file) fd.append('video', upload.file); // key must be "video"

        const done = UI.busy($('#submit-btn'), editing ? 'Saving…' : 'Uploading…');
        const onProgress = upload.file ? UI.progressBar($('#upload-progress')) : null;
        try {
            let res = editing ? await Services.promos.update(id, fd, { onProgress }) : await Services.promos.create(fd, { onProgress });
            if (!editing && !published) res = await Services.promos.unpublish(res.data.id);
            UI.flash(editing ? 'Promo updated.' : published ? 'Promo uploaded and residents notified!' : 'Promo saved as unpublished.', 'success');
            location.href = `promo.html?id=${res.data.id}`;
        } catch (err) {
            done();
            $('#upload-progress').addClass('hidden');
            UI.formAlert($('#form-alert'), err.message);
        }
    });
});
