/**
 * ui.js — reusable UI building blocks (toasts, confirm modal, skeletons,
 * empty/error states, formatting, file validation, button loading states).
 */
const UI = (() => {
    // ---------- helpers ----------
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const param = (name) => new URLSearchParams(location.search).get(name);

    const fmtDate = (d, opts = {}) => d ? new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...opts }) : '—';
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
    const fmtDateTime = (d) => d ? `${fmtDate(d)} · ${fmtTime(d)}` : '—';
    const fmtDuration = (sec) => {
        if (!isFinite(sec) || sec < 0) return '--:--';
        const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    };
    const timeAgo = (d) => {
        const s = Math.round((Date.now() - new Date(d)) / 1000);
        if (s < 60) return 'just now';
        const units = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
        let v = s / 60;
        for (const [n, u] of units) { if (v < n) { v = Math.floor(v); return `${v} ${u}${v > 1 ? 's' : ''} ago`; } v /= n; }
        return fmtDate(d);
    };
    /** Convert a Date/ISO string to the value format of <input type="datetime-local"> */
    const toLocalInput = (d) => {
        if (!d) return '';
        const x = new Date(d);
        return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    // ---------- icons (inline SVG, aria-hidden) ----------
    const icon = (name, cls = 'w-5 h-5') => {
        const paths = {
            calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
            pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
            bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
            search: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
            play: 'M5 3l14 9-14 9V3z',
            pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
            mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
            video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
            edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
            trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
            plus: 'M12 4v16m8-8H4',
            check: 'M5 13l4 4L19 7',
            x: 'M6 18L18 6M6 6l12 12',
            user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
            chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            star: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
            refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
            alert: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
            logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
            menu: 'M4 6h16M4 12h16M4 18h16',
            ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
            megaphone: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
            upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
            external: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14',
            eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
            eyeOff: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21',
            home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
            volume: 'M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
            mute: 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4',
        };
        return `<svg class="${cls}" aria-hidden="true" focusable="false" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || ''}"/></svg>`;
    };

    // ---------- toasts (aria-live region) ----------
    const ensureToastRoot = () => {
        let $r = $('#toast-root');
        if (!$r.length) {
            $r = $('<div id="toast-root" class="fixed top-4 right-4 z-[90] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite" aria-atomic="false"></div>');
            $('body').append($r);
        }
        return $r;
    };
    const toastStyles = {
        success: ['bg-leaf-50 border-leaf-600 text-leaf-900', 'check'],
        error: ['bg-red-50 border-red-600 text-red-900', 'alert'],
        warning: ['bg-amber-50 border-amber-500 text-amber-900', 'alert'],
        info: ['bg-civic-50 border-civic-600 text-civic-900', 'bell'],
    };
    const toast = (message, type = 'info', ms = 4500) => {
        const [cls, ic] = toastStyles[type] || toastStyles.info;
        const $t = $(`
            <div class="toast-enter flex items-start gap-3 rounded-lg border-l-4 ${cls} p-3 shadow-lg" role="${type === 'error' ? 'alert' : 'status'}">
                <span class="mt-0.5 shrink-0">${icon(ic)}</span>
                <p class="text-sm font-medium flex-1">${esc(message)}</p>
                <button type="button" class="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss notification">${icon('x', 'w-4 h-4')}</button>
            </div>`);
        $t.find('button').on('click', () => $t.remove());
        ensureToastRoot().append($t);
        setTimeout(() => $t.fadeOut(200, () => $t.remove()), ms);
    };
    /** Toast that survives a redirect (shown on next page load by Layout). */
    const flash = (message, type = 'info') => sessionStorage.setItem('civic_flash', JSON.stringify({ message, type }));
    const consumeFlash = () => {
        const f = sessionStorage.getItem('civic_flash');
        if (!f) return;
        sessionStorage.removeItem('civic_flash');
        try { const { message, type } = JSON.parse(f); toast(message, type); } catch { /* ignore */ }
    };

    // ---------- accessible confirm modal (focus trapped, Esc to cancel) ----------
    const confirm = ({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false } = {}) => new Promise((resolve) => {
        const prevFocus = document.activeElement;
        const $m = $(`
            <div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-gray-900/50" data-close></div>
                <div class="relative fade-in w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg">
                    <h2 id="cf-title" class="text-lg font-semibold text-gray-900">${esc(title)}</h2>
                    <p id="cf-msg" class="mt-2 text-sm text-gray-600">${esc(message)}</p>
                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" class="btn-secondary" data-cancel>Cancel</button>
                        <button type="button" class="${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button>
                    </div>
                </div>
            </div>`);
        const close = (val) => { $m.remove(); $(document).off('keydown.cf'); prevFocus?.focus(); resolve(val); };
        $m.on('click', '[data-cancel],[data-close]', () => close(false));
        $m.on('click', '[data-ok]', () => close(true));
        $(document).on('keydown.cf', (e) => {
            if (e.key === 'Escape') close(false);
            if (e.key === 'Tab') { // trap focus between the two buttons
                const f = $m.find('button').toArray();
                const i = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        });
        $('body').append($m);
        $m.find('[data-cancel]').trigger('focus');
    });

    // ---------- loading / empty / error states ----------
    const skeletonCards = (n = 6, withImage = true) => Array.from({ length: n }, () => `
        <div class="rounded-xl bg-white p-4 shadow-card" aria-hidden="true">
            ${withImage ? '<div class="skeleton h-40 w-full mb-4"></div>' : ''}
            <div class="skeleton h-4 w-3/4 mb-3"></div>
            <div class="skeleton h-3 w-1/2 mb-2"></div>
            <div class="skeleton h-3 w-2/3"></div>
        </div>`).join('');
    const skeletonRows = (n = 5) => Array.from({ length: n }, () => `
        <div class="flex items-center gap-4 p-4" aria-hidden="true">
            <div class="skeleton h-10 w-10 rounded-full"></div>
            <div class="flex-1"><div class="skeleton h-3 w-1/3 mb-2"></div><div class="skeleton h-3 w-1/2"></div></div>
        </div>`).join('');

    const empty = (title, text = '', action = '') => `
        <div class="col-span-full rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center fade-in">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-civic-50 text-civic-600">${icon('search', 'w-6 h-6')}</div>
            <h3 class="font-semibold text-gray-900">${esc(title)}</h3>
            ${text ? `<p class="mt-1 text-sm text-gray-600">${esc(text)}</p>` : ''}
            ${action}
        </div>`;

    /** Error panel with a Retry button (network fallback for critical loads). */
    const errorState = ($el, err, retryFn) => {
        const offline = err?.status === 0;
        $el.html(`
            <div class="col-span-full rounded-xl border border-red-200 bg-red-50 p-8 text-center fade-in" role="alert">
                <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">${icon('alert', 'w-6 h-6')}</div>
                <h3 class="font-semibold text-red-900">${offline ? 'Connection problem' : 'Could not load this content'}</h3>
                <p class="mt-1 text-sm text-red-800">${esc(err?.message || 'Unexpected error')}</p>
                ${retryFn ? `<button type="button" class="btn-secondary mt-4" data-retry>${icon('refresh', 'w-4 h-4')} Try again</button>` : ''}
            </div>`);
        if (retryFn) $el.find('[data-retry]').on('click', retryFn);
    };

    /** Put a button into a loading state; returns a function that restores it. */
    const busy = ($btn, label = 'Please wait…') => {
        const html = $btn.html();
        $btn.prop('disabled', true).attr('aria-busy', 'true').html(`
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" class="opacity-75"/></svg>
            <span>${esc(label)}</span>`);
        return () => $btn.prop('disabled', false).removeAttr('aria-busy').html(html);
    };

    // ---------- forms ----------
    /** Show / clear an inline error under a field (wired with aria-describedby). */
    const fieldError = ($input, msg) => {
        const id = `${$input.attr('id')}-error`;
        $(`#${id}`).remove();
        if (msg) {
            $input.attr({ 'aria-invalid': 'true', 'aria-describedby': id }).addClass('!border-red-500');
            $input.closest('.field').append(`<p id="${id}" class="mt-1 text-sm text-red-700">${esc(msg)}</p>`);
        } else {
            $input.removeAttr('aria-invalid aria-describedby').removeClass('!border-red-500');
        }
        return !msg;
    };
    const formAlert = ($el, msg, type = 'error') => {
        if (!msg) return $el.empty().addClass('hidden');
        const cls = type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-leaf-50 text-leaf-900 border-leaf-200';
        $el.removeClass('hidden').html(`<div class="rounded-lg border ${cls} p-3 text-sm" role="alert">${esc(msg)}</div>`);
    };
    const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

    /** Validate a File against CivicConfig.UPLOAD_LIMITS before uploading. Returns error string or ''. */
    const validateFile = (file, kind) => {
        if (!file) return '';
        const { maxMB, ext } = CivicConfig.UPLOAD_LIMITS[kind];
        const e = file.name.split('.').pop().toLowerCase();
        if (!ext.includes(e)) return `Unsupported file type ".${e}". Allowed: ${ext.join(', ')}.`;
        if (file.size > maxMB * 1024 * 1024) return `File is ${(file.size / 1048576).toFixed(1)} MB — the limit is ${maxMB} MB.`;
        return '';
    };
    const fileSize = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`;

    /** Upload progress bar HTML + updater */
    const progressBar = ($el) => {
        $el.removeClass('hidden').html(`
            <div class="flex justify-between text-sm text-gray-700 mb-1"><span>Uploading…</span><span data-pct>0%</span></div>
            <div class="h-2 w-full rounded-full bg-gray-200" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
                <div class="h-2 rounded-full bg-civic-600 transition-all" style="width:0%"></div>
            </div>`);
        return (pct) => {
            $el.find('[data-pct]').text(`${pct}%`);
            $el.find('[role=progressbar]').attr('aria-valuenow', pct).children().css('width', `${pct}%`);
            if (pct >= 100) $el.find('span').first().text('Processing…');
        };
    };

    /** Rendered when a normal user opens an admin-only page (client-side guard). */
    const renderForbidden = () => {
        $('#main').html(`
            <section class="mx-auto max-w-lg py-16 text-center fade-in" aria-labelledby="forbidden-title">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">${icon('alert', 'w-8 h-8')}</div>
                <p class="text-sm font-semibold uppercase tracking-wide text-amber-700">403 · Forbidden</p>
                <h1 id="forbidden-title" class="mt-2 text-2xl font-bold text-gray-900">Administrators only</h1>
                <p class="mt-2 text-gray-600">Your account doesn't have permission to view this page. If you believe this is a mistake, please contact a city administrator.</p>
                <div class="mt-6 flex justify-center gap-3">
                    <a href="events.html" class="btn-primary">Back to events</a>
                    <a href="mailto:support@civicevents.example" class="btn-secondary">Contact admin</a>
                </div>
            </section>`);
        document.title = 'Access denied · CivicEvents';
    };

    const badge = (text, color = 'gray') => {
        const c = { gray: 'bg-gray-100 text-gray-800', green: 'bg-leaf-100 text-leaf-800', blue: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-900' }[color];
        return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}">${esc(text)}</span>`;
    };

    /** Accessible pagination control. onPage(n) is called with the new page. */
    const pagination = ($el, page, pages, onPage) => {
        if (pages <= 1) return $el.empty();
        const btn = (p, label, disabled, current) => `<button type="button" data-p="${p}" class="min-w-[2.5rem] rounded-lg px-3 py-2 text-sm font-medium ${current ? 'bg-civic-700 text-white' : 'bg-white text-gray-800 hover:bg-civic-50 border border-gray-300'} disabled:opacity-40 disabled:cursor-not-allowed" ${disabled ? 'disabled' : ''} ${current ? 'aria-current="page"' : ''} aria-label="${label}">${label.startsWith('Page') ? p : label}</button>`;
        let html = btn(page - 1, 'Previous', page === 1);
        for (let p = 1; p <= pages; p++) html += btn(p, `Page ${p}`, false, p === page);
        html += btn(page + 1, 'Next', page === pages);
        $el.html(`<nav class="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">${html}</nav>`);
        $el.find('button').on('click', function () { onPage(Number($(this).data('p'))); });
    };

    return {
        esc, param, fmtDate, fmtTime, fmtDateTime, fmtDuration, timeAgo, toLocalInput, icon,
        toast, flash, consumeFlash, confirm, skeletonCards, skeletonRows, empty, errorState, busy,
        fieldError, formAlert, isEmail, validateFile, fileSize, progressBar, renderForbidden, badge, pagination,
    };
})();
