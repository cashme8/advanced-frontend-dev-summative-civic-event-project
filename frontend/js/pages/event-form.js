/**
 * pages/event-form.js — ADMIN ONLY create/edit event.
 * Access: <body data-role="admin"> → Auth.guard() blocks non-admins before this runs,
 * and the backend route uses authorize(['admin']) as the real enforcement.
 *
 * Upload: multipart/form-data with the file under key "image"
 * (backend: uploadEventImage.single('image')) plus the event fields.
 */
App.init(() => {
    const id = UI.param('id');
    const editing = !!id;
    let existingImg = '';

    const setPreview = (src) => {
        $('#img-preview').html(src
            ? `<img src="${UI.esc(src)}" alt="Preview of the event image" class="h-full w-full object-cover fade-in">`
            : '<span class="text-sm">No image selected</span>');
    };

    const upload = Components.fileField($('.dropzone'), (file) => {
        if (!file) { setPreview(existingImg); $('#remove-img').addClass('hidden'); return; }
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result); // preview BEFORE submit
        reader.readAsDataURL(file);
        $('#remove-img').removeClass('hidden');
    });
    $('#remove-img').on('click', () => upload.clear());

    $('#description').on('input', function () { $('#desc-count').text(this.value.length); });

    // ---------- edit mode: prefill ----------
    if (editing) {
        $('#form-title').text('Edit event');
        $('#submit-btn').text('Save changes');
        document.title = 'Edit event · CivicEvents';
        $('#event-form').addClass('opacity-60 pointer-events-none').attr('aria-busy', 'true');
        Services.events.get(id).then((res) => {
            const ev = res.data;
            $('#title').val(ev.title);
            $('#description').val(ev.description || '').trigger('input');
            $('#location').val(ev.location || '');
            $('#starts_at').val(UI.toLocalInput(ev.starts_at));
            $('#ends_at').val(UI.toLocalInput(ev.ends_at));
            $('#published').prop('checked', ev.published !== false);
            existingImg = ev.metadata?.image_url ? Components.mediaUrl(ev.metadata.image_url) : '';
            setPreview(existingImg);
        }).catch((err) => {
            UI.formAlert($('#form-alert'), `Could not load event: ${err.message}`);
        }).finally(() => $('#event-form').removeClass('opacity-60 pointer-events-none').removeAttr('aria-busy'));
    }

    // ---------- validation ----------
    const validate = () => {
        const v = (s) => $(s).val().trim();
        let ok = true;
        ok = UI.fieldError($('#title'), v('#title').length < 3 ? 'Title must be at least 3 characters.' : '') && ok;
        ok = UI.fieldError($('#location'), !v('#location') ? 'Location is required.' : '') && ok;
        ok = UI.fieldError($('#starts_at'), !v('#starts_at') ? 'Start date and time are required.' : '') && ok;
        let endErr = '';
        if (!v('#ends_at')) endErr = 'End date and time are required.';
        else if (v('#starts_at') && new Date(v('#ends_at')) <= new Date(v('#starts_at'))) endErr = 'End must be after the start.';
        ok = UI.fieldError($('#ends_at'), endErr) && ok;
        if (!ok) $('#event-form [aria-invalid=true]').first().trigger('focus');
        return ok;
    };

    // ---------- submit ----------
    $('#event-form').on('submit', async function (e) {
        e.preventDefault();
        UI.formAlert($('#form-alert'), '');
        if (!validate()) return;

        const fd = new FormData();
        fd.append('title', $('#title').val().trim());
        fd.append('description', $('#description').val().trim());
        fd.append('location', $('#location').val().trim());
        fd.append('starts_at', new Date($('#starts_at').val()).toISOString());
        fd.append('ends_at', new Date($('#ends_at').val()).toISOString());
        fd.append('published', $('#published').is(':checked'));
        if (upload.file) fd.append('image', upload.file); // key must be "image"

        const done = UI.busy($('#submit-btn'), editing ? 'Saving…' : 'Creating…');
        const onProgress = upload.file ? UI.progressBar($('#upload-progress')) : null;
        try {
            const res = editing
                ? await Services.events.update(id, fd, { onProgress })
                : await Services.events.create(fd, { onProgress });
            UI.flash(editing ? 'Event updated successfully.' : 'Event created and residents notified!', 'success');
            location.href = `event.html?id=${res.data.id}`;
        } catch (err) {
            done();
            $('#upload-progress').addClass('hidden');
            UI.formAlert($('#form-alert'), err.message);
        }
    });
});
