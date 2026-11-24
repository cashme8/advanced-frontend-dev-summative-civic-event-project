/**
 * pages/announcement-form.js — ADMIN ONLY create/edit audio announcement.
 * Access: <body data-role="admin"> → Auth.guard() shows a 403 view to non-admins;
 * the backend route also uses authorize(['admin']).
 *
 * Create: multipart/form-data with the file under key "audio" (uploadAudio.single('audio')),
 *         plus title + published. The backend then broadcasts a notification.
 * Edit:   the API only updates title/published (it ignores a new file), so the audio
 *         picker is hidden in edit mode and replaced by the current recording.
 */
App.init(() => {
    const id = UI.param('id');
    const editing = !!id;
    let previewUrl = '';

    const upload = Components.fileField($('.dropzone'), (file) => {
        URL.revokeObjectURL(previewUrl);
        if (!file) { $('#audio-preview').text('No audio selected'); return; }
        previewUrl = URL.createObjectURL(file);
        $('#audio-preview').html(`
            <audio controls preload="metadata" src="${previewUrl}" class="w-full" aria-label="Preview of ${UI.esc(file.name)}"></audio>
            <p class="mt-2 text-xs text-gray-600" id="preview-dur">Reading length…</p>`);
        $('#audio-preview audio').on('loadedmetadata', function () { $('#preview-dur').text(`Length: ${UI.fmtDuration(this.duration)}`); })
            .on('error', () => $('#preview-dur').text('Your browser cannot preview this format, but it can still be uploaded.'));
    });

    if (editing) {
        $('#form-title').text('Edit announcement');
        $('#submit-btn').text('Save changes');
        document.title = 'Edit announcement · CivicEvents';
        $('#announcement-form').addClass('opacity-60 pointer-events-none').attr('aria-busy', 'true');
        Services.announcements.get(id).then((res) => {
            const a = res.data;
            $('#title').val(a.title);
            $('#published').prop('checked', a.published !== false);
            $('#audio-section').html(`
                <p class="label">Current recording</p>
                <audio controls preload="metadata" src="${UI.esc(Components.mediaUrl(a.audio_url))}" class="w-full" aria-label="Current recording"></audio>
                <p class="hint">To replace the audio, create a new announcement and delete this one.</p>`);
        }).catch((err) => UI.formAlert($('#form-alert'), `Could not load announcement: ${err.message}`))
          .finally(() => $('#announcement-form').removeClass('opacity-60 pointer-events-none').removeAttr('aria-busy'));
    }

    $('#announcement-form').on('submit', async (e) => {
        e.preventDefault();
        UI.formAlert($('#form-alert'), '');
        let ok = UI.fieldError($('#title'), $('#title').val().trim().length < 3 ? 'Title must be at least 3 characters.' : '');
        if (!editing) ok = UI.fieldError($('#audio'), !upload.file ? 'Please choose an audio file.' : '') && ok;
        if (!ok) { $('#announcement-form [aria-invalid=true]').first().trigger('focus'); return; }

        const fd = new FormData();
        fd.append('title', $('#title').val().trim());
        fd.append('published', $('#published').is(':checked'));
        if (!editing) fd.append('audio', upload.file); // key must be "audio"

        const done = UI.busy($('#submit-btn'), editing ? 'Saving…' : 'Uploading…');
        const onProgress = editing ? null : UI.progressBar($('#upload-progress'));
        try {
            const res = editing ? await Services.announcements.update(id, fd) : await Services.announcements.create(fd, { onProgress });
            UI.flash(editing ? 'Announcement updated.' : 'Announcement created — residents have been notified!', 'success');
            location.href = `announcement.html?id=${res.data.id}`;
        } catch (err) {
            done();
            $('#upload-progress').addClass('hidden');
            UI.formAlert($('#form-alert'), err.message);
        }
    });
});
