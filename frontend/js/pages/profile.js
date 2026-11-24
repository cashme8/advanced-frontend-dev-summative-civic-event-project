/**
 * pages/profile.js — My profile (GET/PATCH /api/users/profile/me) + activity (GET /api/dashboard/me).
 * Only full_name and email are editable. Role and is_active are shown read-only and are
 * never sent (the API also rejects them). Email changes ask for confirmation, and a 409
 * from the API ("Email is already in use") is shown on the email field.
 */
App.init(() => {
    const { esc, icon, badge } = UI;
    let user = null;

    const renderCard = () => {
        const initials = user.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        $('#profile-card').attr('aria-busy', 'false').html(`
            <div class="text-center fade-in">
                <span class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-leaf-100 text-2xl font-bold text-leaf-900" aria-hidden="true">${esc(initials)}</span>
                <h2 id="pc-h" class="mt-3 text-lg font-semibold text-gray-900">${esc(user.full_name)}</h2>
                <p class="text-sm text-gray-600 break-all">${esc(user.email)}</p>
                <div class="mt-3 flex justify-center gap-2">
                    ${badge(user.role === 'admin' ? 'Administrator' : 'Resident', user.role === 'admin' ? 'blue' : 'gray')}
                    ${badge(user.is_active ? 'Active' : 'Disabled', user.is_active ? 'green' : 'amber')}
                </div>
                <p class="mt-4 text-xs text-gray-500">Member since ${UI.fmtDate(user.created_at)}</p>
            </div>`);
    };

    const fillForm = () => {
        $('#full_name').val(user.full_name);
        $('#email').val(user.email);
        $('#role').val(user.role === 'admin' ? 'Administrator' : 'Resident');
        $('#is_active').val(user.is_active ? 'Active' : 'Disabled');
    };

    const loadProfile = async () => {
        $('#profile-card').html(UI.skeletonRows(3));
        try {
            const res = await Services.users.me();
            user = res.data;
            renderCard();
            fillForm();
        } catch (err) { UI.errorState($('#profile-card'), err, loadProfile); }
    };

    const loadStats = async () => {
        $('#my-stats').html(UI.skeletonCards(4, false));
        try {
            const { data: s } = await Services.dashboard.me();
            const tiles = [
                ['Events registered', s.registrations?.total_registered_events, 'ticket', 'my-registrations.html'],
                ['Feedback given', s.feedbacks?.total_feedbacks, 'star', 'my-registrations.html?tab=past'],
                ['Unread notifications', Notifs.unreadCount(), 'bell', 'notifications.html'],
                ['Announcements', s.announcements?.total_announcements, 'mic', 'announcements.html'],
            ];
            $('#my-stats').html(tiles.map(([l, v, ic, href]) => `
                <a href="${href}" class="card flex items-center gap-3 p-4 transition hover:shadow-lg fade-in">
                    <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-leaf-50 text-leaf-800">${icon(ic)}</span>
                    <span><span class="block text-2xl font-bold tabular-nums text-gray-900">${Number(v || 0)}</span><span class="text-sm text-gray-600">${l}</span></span>
                </a>`).join(''));
        } catch (err) { UI.errorState($('#my-stats'), err, loadStats); }
    };

    $('#profile-form').on('reset', (e) => { e.preventDefault(); if (user) fillForm(); UI.fieldError($('#full_name'), ''); UI.fieldError($('#email'), ''); UI.formAlert($('#form-alert'), ''); });

    $('#profile-form').on('submit', async (e) => {
        e.preventDefault();
        UI.formAlert($('#form-alert'), '');
        const full_name = $('#full_name').val().trim();
        const email = $('#email').val().trim().toLowerCase();
        let ok = UI.fieldError($('#full_name'), full_name.length < 2 ? 'Please enter your full name.' : '');
        ok = UI.fieldError($('#email'), !UI.isEmail(email) ? 'Enter a valid email address.' : '') && ok;
        if (!ok) return $('#profile-form [aria-invalid=true]').first().trigger('focus');

        // Only send fields that changed — never role or is_active
        const body = {};
        if (full_name !== user.full_name) body.full_name = full_name;
        if (email !== user.email.toLowerCase()) body.email = email;
        if (!Object.keys(body).length) return UI.toast('No changes to save.', 'info');

        if (body.email) {
            const confirmed = await UI.confirm({ title: 'Change your email?', message: `You'll log in with ${email} from now on.`, confirmText: 'Yes, change it' });
            if (!confirmed) return;
        }

        const done = UI.busy($('#save-btn'), 'Saving…');
        try {
            const res = await Services.users.updateMe(body);
            user = res.data;
            Auth.updateUser(user); // keep the header / auth context in sync
            renderCard();
            fillForm();
            $('#profile-menu .font-semibold.truncate').text(user.full_name);
            $('#profile-menu .text-xs.truncate').text(user.email);
            UI.toast('Profile updated', 'success');
        } catch (err) {
            if (err.status === 409) {
                UI.fieldError($('#email'), 'That email is already used by another account. Please use a different one.');
                $('#email').trigger('focus');
            } else UI.formAlert($('#form-alert'), err.message);
        } finally { done(); }
    });

    loadProfile();
    loadStats();
});
