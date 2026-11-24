/**
 * pages/auth.js — Signup + Login.
 * Both pages are data-auth="guest": the guard sends already-logged-in users away.
 */
App.init(() => {
    // ---------- show / hide password buttons ----------
    $('.pw-toggle').each(function () { $(this).html(UI.icon('eye')); }).on('click', function () {
        const $input = $(`#${$(this).data('target')}`);
        const show = $input.attr('type') === 'password';
        $input.attr('type', show ? 'text' : 'password');
        $(this).attr({ 'aria-pressed': String(show), 'aria-label': show ? 'Hide password' : 'Show password' }).html(UI.icon(show ? 'eyeOff' : 'eye'));
    });

    // =====================================================================
    // SIGNUP
    // =====================================================================
    const RULES = {
        length: (p) => p.length >= 8,
        upper: (p) => /[A-Z]/.test(p),
        lower: (p) => /[a-z]/.test(p),
        number: (p) => /\d/.test(p),
        special: (p) => /[\W_]/.test(p),
    };
    const LEVELS = [
        ['Too weak', 'bg-red-600', 'text-red-700'],
        ['Weak', 'bg-red-500', 'text-red-700'],
        ['Fair', 'bg-amber-500', 'text-amber-800'],
        ['Good', 'bg-civic-500', 'text-civic-800'],
        ['Strong', 'bg-leaf-600', 'text-leaf-800'],
    ];

    const checkPassword = (p) => {
        const passed = Object.entries(RULES).filter(([, fn]) => fn(p)).map(([k]) => k);
        return { passed, ok: passed.length === 5 };
    };

    const renderStrength = (p) => {
        const { passed } = checkPassword(p);
        const score = p ? Math.max(1, passed.length) : 0; // 0..5
        const [label, bar, text] = LEVELS[Math.max(0, score - 1)];
        $('.pw-bar').each(function (i) {
            $(this).removeClass().addClass(`pw-bar h-1.5 flex-1 rounded-full ${i < score ? bar : 'bg-gray-200'}`);
        });
        $('#pw-label').removeClass().addClass(`mt-1 text-xs font-semibold ${p ? text : 'text-gray-600'}`)
            .text(`Password strength: ${p ? label : '—'}`);
        $('#pw-rules li').each(function () {
            const ok = passed.includes($(this).data('rule'));
            $(this).toggleClass('text-leaf-700 font-medium', ok).toggleClass('text-gray-600', !ok)
                .html(`${ok ? '✓' : '○'} ${$(this).text().replace(/^[✓○]\s*/, '')}<span class="sr-only">${ok ? ' – met' : ' – not met'}</span>`);
        });
    };

    $('#signup-form #password').on('input', function () { renderStrength(this.value); });

    $('#signup-form').on('submit', async function (e) {
        e.preventDefault();
        const $f = $(this);
        const data = {
            full_name: $('#full_name').val().trim(),
            email: $('#email').val().trim().toLowerCase(),
            password: $('#password').val(),
            confirm: $('#confirm_password').val(),
        };
        UI.formAlert($('#form-alert'), '');

        // client-side validation before hitting the API
        let ok = true;
        ok = UI.fieldError($('#full_name'), data.full_name.length < 2 ? 'Please enter your full name.' : '') && ok;
        ok = UI.fieldError($('#email'), !UI.isEmail(data.email) ? 'Please enter a valid email address.' : '') && ok;
        ok = UI.fieldError($('#password'), !checkPassword(data.password).ok ? 'Password must meet all the requirements below.' : '') && ok;
        ok = UI.fieldError($('#confirm_password'), data.confirm !== data.password || !data.confirm ? 'Passwords do not match.' : '') && ok;
        if (!ok) { $f.find('[aria-invalid=true]').first().trigger('focus'); return; }

        const done = UI.busy($f.find('[type=submit]'), 'Creating account…');
        try {
            // NOTE: we never send a `role` — every self-signup is a normal user.
            await Services.auth.signup({ full_name: data.full_name, email: data.email, password: data.password });
            UI.flash('Account created! Please log in with your new credentials.', 'success');
            location.href = `login.html?email=${encodeURIComponent(data.email)}`;
        } catch (err) {
            done();
            if (err.status === 409) UI.fieldError($('#email'), 'An account with this email already exists.');
            UI.formAlert($('#form-alert'), err.message);
        }
    });

    // =====================================================================
    // LOGIN
    // =====================================================================
    if (UI.param('email')) { $('#login-form #email').val(UI.param('email')); $('#login-form #password').trigger('focus'); }

    $('#login-form').on('submit', async function (e) {
        e.preventDefault();
        const $f = $(this);
        const email = $('#email').val().trim().toLowerCase();
        const password = $('#password').val();
        const remember = $('#remember').is(':checked');
        UI.formAlert($('#form-alert'), '');

        let ok = UI.fieldError($('#email'), !UI.isEmail(email) ? 'Please enter a valid email address.' : '');
        ok = UI.fieldError($('#password'), !password ? 'Please enter your password.' : '') && ok;
        if (!ok) return;

        const done = UI.busy($f.find('[type=submit]'), 'Signing in…');
        try {
            const res = await Services.auth.login({ email, password });
            const { token, user } = res.data;
            // remember=true -> localStorage, otherwise sessionStorage (see auth.js)
            Auth.login(token, user, remember);
            UI.flash(`Welcome back, ${user.full_name.split(' ')[0]}!`, 'success');
            // ROLE-BASED REDIRECT: admins land on the dashboard, residents on events
            const next = UI.param('next');
            location.href = next && !/^(https?:)?\/\//.test(next) ? next : (user.role === 'admin' ? 'dashboard.html' : 'events.html');
        } catch (err) {
            done();
            UI.formAlert($('#form-alert'), err.status === 401 ? 'Incorrect email or password.' : err.message);
            $('#password').val('').trigger('focus');
        }
    });
});
