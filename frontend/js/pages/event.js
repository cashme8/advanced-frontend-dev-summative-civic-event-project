/**
 * pages/event.js — Event detail.
 *  - Everyone: details, image, map link, add-to-calendar
 *  - Normal users: Register / Cancel registration, submit or edit ONE feedback
 *  - Admins: Edit / Delete, registrants list (GET /event-registrations/event/:id/attendees),
 *            all feedback (GET /event-feedback/event/:id)
 */
App.init(() => {
    const { esc, icon, fmtDate, fmtTime, badge } = UI;
    const id = UI.param('id');
    const admin = Auth.isAdmin();
    const me = Auth.getUser();
    let ev = null;
    let registration = null; // current user's registration row (if any)
    let myFeedback = null;

    if (!id) { UI.errorState($('#event-root'), { message: 'No event selected.' }); return; }

    const stars = (n, size = 'w-4 h-4') => Array.from({ length: 5 }, (_, i) =>
        `<span class="${i < Math.round(n) ? 'text-amber-500' : 'text-gray-300'}">${icon('star', size).replace('fill="none"', `fill="${i < Math.round(n) ? 'currentColor' : 'none'}"`)}</span>`).join('');

    const icsLink = () => {
        const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivicEvents//EN', 'BEGIN:VEVENT', `UID:${ev.id}@civicevents`,
            `DTSTAMP:${f(new Date())}`, `DTSTART:${f(ev.starts_at)}`, `DTEND:${f(ev.ends_at || ev.starts_at)}`,
            `SUMMARY:${ev.title}`, `LOCATION:${ev.location || ''}`, `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
            'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        return URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    };

    // ---------- registration panel (normal users only) ----------
    const regPanel = () => {
        const [status] = Components.eventStatus(ev);
        if (admin) {
            // ADMIN-ONLY actions
            return `
            <div class="space-y-2">
                <a href="event-form.html?id=${ev.id}" class="btn-primary w-full">${icon('edit', 'w-4 h-4')} Edit event</a>
                <button type="button" id="delete-event" class="btn-danger w-full">${icon('trash', 'w-4 h-4')} Delete event</button>
            </div>`;
        }
        if (status === 'Past') {
            return `<p class="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">This event has ended. ${registration?.status === 'registered' ? 'Thanks for attending — leave your feedback below!' : ''}</p>`;
        }
        if (registration?.status === 'registered') {
            return `
            <div class="rounded-lg bg-leaf-50 p-3 text-sm font-medium text-leaf-900 flex items-center gap-2">${icon('check', 'w-5 h-5')} You're registered for this event.</div>
            <button type="button" id="cancel-reg" class="btn-secondary mt-3 w-full !text-red-700">Cancel registration</button>`;
        }
        if (registration?.status === 'cancelled') {
            return `
            <p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">You cancelled your registration for this event.</p>
            <button type="button" id="register" class="btn-success mt-3 w-full">Register again</button>`;
        }
        return `<button type="button" id="register" class="btn-success w-full !py-3">Register for this event</button>
                <p class="mt-2 text-center text-xs text-gray-600">Free · You can cancel anytime</p>`;
    };

    const renderReg = () => $('#reg-panel').html(regPanel());

    const render = () => {
        const img = ev.metadata?.image_url ? Components.mediaUrl(ev.metadata.image_url) : '';
        const [status, color] = Components.eventStatus(ev);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location || '')}`;
        document.title = `${ev.title} · CivicEvents`;
        $('#crumb').text(ev.title);

        $('#event-root').html(`
        <article class="fade-in" aria-labelledby="event-title">
            <div class="relative h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-civic-700 to-leaf-500 sm:h-80">
                ${img ? `<img src="${esc(img)}" alt="${esc(ev.title)}" class="h-full w-full object-cover">` : `<div class="flex h-full items-center justify-center text-white/70">${icon('calendar', 'w-20 h-20')}</div>`}
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
                <div class="absolute bottom-0 left-0 p-6 text-white">
                    <div class="mb-2 flex gap-2">${badge(status, color)}${ev.published === false ? badge('Unpublished', 'amber') : ''}</div>
                    <h1 id="event-title" class="text-3xl font-bold sm:text-4xl">${esc(ev.title)}</h1>
                </div>
            </div>

            <div class="mt-6 grid gap-6 lg:grid-cols-3">
                <div class="space-y-6 lg:col-span-2">
                    <section class="card p-6" aria-labelledby="about-h">
                        <h2 id="about-h" class="text-lg font-semibold">About this event</h2>
                        <p class="mt-3 whitespace-pre-line leading-relaxed text-gray-700">${esc(ev.description || 'No description provided.')}</p>
                    </section>

                    <section id="feedback" class="card p-6 scroll-mt-24" aria-labelledby="fb-h">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="fb-h" class="text-lg font-semibold">Ratings & feedback</h2>
                            <div id="fb-summary" class="flex items-center gap-2 text-sm text-gray-700"></div>
                        </div>
                        <div id="fb-form-wrap" class="mt-4"></div>
                        <ul id="fb-list" class="mt-4 divide-y" aria-live="polite">${UI.skeletonRows(2)}</ul>
                    </section>

                    ${admin ? `
                    <section class="card p-6" aria-labelledby="att-h">
                        <div class="flex items-center justify-between">
                            <h2 id="att-h" class="text-lg font-semibold">Registrants <span class="text-sm font-normal text-gray-500">(admin only)</span></h2>
                            <span id="att-count"></span>
                        </div>
                        <div id="attendees" class="mt-4 overflow-x-auto">${UI.skeletonRows(3)}</div>
                    </section>` : ''}
                </div>

                <aside class="space-y-6">
                    <section class="card p-6" aria-labelledby="when-h">
                        <h2 id="when-h" class="sr-only">When and where</h2>
                        <dl class="space-y-4 text-sm">
                            <div class="flex gap-3"><dt class="text-leaf-700">${icon('calendar')}<span class="sr-only">Starts</span></dt>
                                <dd><p class="font-semibold text-gray-900">${fmtDate(ev.starts_at)}</p><p class="text-gray-600">${fmtTime(ev.starts_at)} – ${ev.ends_at ? `${new Date(ev.ends_at).toDateString() !== new Date(ev.starts_at).toDateString() ? fmtDate(ev.ends_at) + ' ' : ''}${fmtTime(ev.ends_at)}` : 'TBA'}</p></dd></div>
                            <div class="flex gap-3"><dt class="text-leaf-700">${icon('pin')}<span class="sr-only">Location</span></dt>
                                <dd><p class="font-semibold text-gray-900">${esc(ev.location || 'TBA')}</p>
                                ${ev.location ? `<a href="${mapUrl}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-leaf-700 hover:underline">Open in Google Maps ${icon('external', 'w-3.5 h-3.5')}<span class="sr-only">(opens in new tab)</span></a>` : ''}</dd></div>
                        </dl>
                        <a href="${icsLink()}" download="${esc(ev.title)}.ics" class="btn-ghost mt-4 w-full border border-civic-200">${icon('calendar', 'w-4 h-4')} Add to calendar</a>
                        <div id="reg-panel" class="mt-4 border-t pt-4"></div>
                    </section>
                </aside>
            </div>
        </article>`);
        renderReg();
    };

    // ---------- feedback ----------
    const feedbackForm = (existing) => `
        <form id="fb-form" class="rounded-xl border border-civic-100 bg-civic-50/50 p-4" novalidate>
            <fieldset>
                <legend class="label">${existing ? 'Update your rating' : 'Rate this event'}</legend>
                <div class="flex gap-1" id="star-input">
                    ${[1, 2, 3, 4, 5].map((n) => `
                        <label class="cursor-pointer text-gray-300 hover:text-amber-500" data-star="${n}">
                            <input type="radio" name="rating" value="${n}" class="sr-only" ${existing?.rating === n ? 'checked' : ''}>
                            ${icon('star', 'w-8 h-8')}<span class="sr-only">${n} star${n > 1 ? 's' : ''}</span>
                        </label>`).join('')}
                </div>
            </fieldset>
            <div class="field mt-3">
                <label for="fb-comment" class="label">Comment <span class="font-normal text-gray-500">(optional)</span></label>
                <textarea id="fb-comment" rows="3" maxlength="1000" class="input" placeholder="What did you enjoy? What could be better?">${esc(existing?.comment || '')}</textarea>
            </div>
            <div class="mt-3 flex gap-2">
                <button type="submit" class="btn-primary">${existing ? 'Save changes' : 'Submit feedback'}</button>
                ${existing ? '<button type="button" class="btn-secondary" id="fb-cancel">Cancel</button>' : ''}
            </div>
        </form>`;

    const paintStars = () => {
        const v = Number($('#star-input input:checked').val() || 0);
        $('#star-input label').each(function () {
            const on = $(this).data('star') <= v;
            $(this).toggleClass('text-amber-500', on).toggleClass('text-gray-300', !on)
                .find('svg').attr('fill', on ? 'currentColor' : 'none');
        });
    };

    const myFeedbackView = () => `
        <div class="flex items-start justify-between gap-3 rounded-xl bg-leaf-50 p-4">
            <div>
                <p class="text-sm font-semibold text-leaf-900">Your feedback</p>
                <div class="mt-1 flex">${stars(myFeedback.rating)}</div>
                ${myFeedback.comment ? `<p class="mt-1 text-sm text-gray-700">${esc(myFeedback.comment)}</p>` : ''}
            </div>
            <button type="button" id="fb-edit" class="btn-ghost text-sm">${icon('edit', 'w-4 h-4')} Edit</button>
        </div>`;

    const renderFeedbackForm = () => {
        if (admin) return $('#fb-form-wrap').empty(); // admins moderate, they don't rate
        $('#fb-form-wrap').html(myFeedback ? myFeedbackView() : feedbackForm());
        paintStars();
    };

    const loadFeedback = async () => {
        let list = null;
        try {
            // Admin endpoint; normal users get 403 → fall back to their own feedback only
            const res = await Services.feedback.forEvent(id);
            list = res.data || [];
        } catch (err) {
            if (err.status !== 403) { UI.errorState($('#fb-list'), err, loadFeedback); return; }
        }
        if (!admin) {
            const mine = await Services.feedback.mine().catch(() => ({ data: [] }));
            myFeedback = (mine.data || []).find((f) => f.event_id === id) || null;
        }
        renderFeedbackForm();

        if (list) {
            const avg = list.length ? list.reduce((s, f) => s + f.rating, 0) / list.length : 0;
            $('#fb-summary').html(list.length
                ? `<span class="flex">${stars(avg)}</span><span class="font-semibold">${avg.toFixed(1)}</span><span class="text-gray-500">(${list.length} review${list.length > 1 ? 's' : ''})</span>`
                : '<span class="text-gray-500">No ratings yet</span>');
            $('#fb-list').html(list.length ? list.map((f) => `
                <li class="py-4">
                    <div class="flex items-center justify-between gap-2">
                        <p class="font-medium text-gray-900">${esc(f.full_name || 'Resident')}${f.user_id === me.id ? ' <span class="text-xs text-gray-500">(you)</span>' : ''}</p>
                        <time class="text-xs text-gray-500" datetime="${f.created_at}">${UI.timeAgo(f.created_at)}</time>
                    </div>
                    <div class="mt-1 flex" aria-label="${f.rating} out of 5 stars">${stars(f.rating)}</div>
                    ${f.comment ? `<p class="mt-1 text-sm text-gray-700">${esc(f.comment)}</p>` : ''}
                </li>`).join('') : '<li class="py-4 text-sm text-gray-600">No feedback yet.</li>');
        } else {
            // Normal user view: backend only exposes their own rating
            $('#fb-summary').html(myFeedback ? `<span class="flex">${stars(myFeedback.rating)}</span><span class="font-semibold">${myFeedback.rating}.0</span><span class="text-gray-500">(your rating)</span>` : '<span class="text-gray-500">Be the first to rate this event</span>');
            $('#fb-list').html('<li class="pt-2 text-xs text-gray-500">Community reviews are moderated by city staff.</li>');
        }
    };

    // ---------- attendees (admin) ----------
    const loadAttendees = async () => {
        if (!admin) return;
        try {
            const res = await Services.registrations.attendees(id);
            const rows = res.data || [];
            $('#att-count').html(badge(`${rows.length} registered`, 'blue'));
            $('#attendees').html(rows.length ? `
                <table class="min-w-full text-left text-sm">
                    <caption class="sr-only">People registered for this event</caption>
                    <thead class="border-b text-xs uppercase text-gray-500"><tr><th scope="col" class="py-2 pr-4">Name</th><th scope="col" class="py-2 pr-4">Email</th><th scope="col" class="py-2">Registered</th></tr></thead>
                    <tbody class="divide-y">${rows.map((r) => `<tr><td class="py-2 pr-4 font-medium">${esc(r.full_name)}</td><td class="py-2 pr-4 text-gray-700">${esc(r.email)}</td><td class="py-2 text-gray-600">${fmtDate(r.created_at)}</td></tr>`).join('')}</tbody>
                </table>` : '<p class="text-sm text-gray-600">No one has registered yet.</p>');
        } catch (err) {
            UI.errorState($('#attendees'), err, loadAttendees);
        }
    };

    // ---------- load ----------
    const load = async () => {
        try {
            const [evRes, regRes] = await Promise.all([
                Services.events.get(id),
                admin ? Promise.resolve({ data: [] }) : Services.registrations.mine().catch(() => ({ data: [] })),
            ]);
            ev = evRes.data;
            // Normal users can't open unpublished events
            if (ev.published === false && !admin) throw { status: 404, message: 'This event is not available.' };
            registration = (regRes.data || []).find((r) => r.event_id === id) || null;
            render();
            loadFeedback();
            loadAttendees();
        } catch (err) {
            $('#crumb').text('Not found');
            UI.errorState($('#event-root'), err.status === 404 ? { message: 'This event does not exist or was removed.' } : err, err.status === 404 ? null : load);
        }
    };

    // ---------- interactions ----------
    $(document).on('click', '#register', async function () {
        const done = UI.busy($(this), 'Registering…');
        try {
            const res = await Services.registrations.register(id);
            registration = res.data;
            UI.toast('You\'re registered! We\'ll see you there.', 'success');
            renderReg();
        } catch (err) {
            done();
            UI.toast(err.status === 409 ? 'You already have a registration record for this event, so it can\'t be created again.' : err.message, 'error');
        }
    });

    $(document).on('click', '#cancel-reg', async function () {
        const ok = await UI.confirm({ title: 'Cancel registration?', message: 'Your spot will be released for other residents.', confirmText: 'Cancel registration', danger: true });
        if (!ok) return;
        const done = UI.busy($(this), 'Cancelling…');
        try {
            const res = await Services.registrations.cancel(id);
            registration = res.data;
            UI.toast('Your registration was cancelled.', 'success');
            renderReg();
        } catch (err) { done(); UI.toast(err.message, 'error'); }
    });

    $(document).on('click', '#delete-event', async function () {
        const ok = await UI.confirm({ title: 'Delete this event?', message: `"${ev.title}" will be permanently removed.`, confirmText: 'Delete event', danger: true });
        if (!ok) return;
        const done = UI.busy($(this), 'Deleting…');
        try {
            await Services.events.remove(id);
            UI.flash('Event deleted', 'success');
            location.href = 'events.html';
        } catch (err) { done(); UI.toast(err.status === 500 ? 'This event has registrations and cannot be deleted.' : err.message, 'error'); }
    });

    $(document).on('change', '#star-input input', paintStars);
    $(document).on('click', '#fb-edit', () => { $('#fb-form-wrap').html(feedbackForm(myFeedback)); paintStars(); });
    $(document).on('click', '#fb-cancel', renderFeedbackForm);

    $(document).on('submit', '#fb-form', async function (e) {
        e.preventDefault();
        const rating = Number($('#star-input input:checked').val());
        const comment = $('#fb-comment').val().trim();
        if (!rating) { UI.toast('Please choose a rating from 1 to 5 stars.', 'warning'); $('#star-input input').first().trigger('focus'); return; }
        const done = UI.busy($(this).find('[type=submit]'), 'Saving…');
        try {
            if (myFeedback) {
                await Services.feedback.update(myFeedback.id, { rating, comment });
                UI.toast('Your feedback was updated.', 'success');
            } else {
                await Services.feedback.create({ event_id: id, rating, comment });
                UI.toast('Thanks for your feedback!', 'success');
            }
            loadFeedback();
        } catch (err) {
            done();
            // unique(user_id, event_id) → one feedback per user per event
            UI.toast(err.status === 409 ? 'You have already left feedback for this event.' : err.message, 'error');
            if (err.status === 409) loadFeedback();
        }
    });

    load();
});
