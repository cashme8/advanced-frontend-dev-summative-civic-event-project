/**
 * layout.js — renders the shared shell on every page:
 *   skip link, top navigation (logo, global search, links, bell, profile menu,
 *   ADMIN menu), notification drawer, admin sidebar and footer.
 *
 * Page markup contract:
 *   <body data-page="events" data-auth="required" [data-role="admin"] [data-layout="admin"]>
 *     <div id="app-header"></div>
 *     <main id="main">…</main>
 *     <div id="app-footer"></div>
 */
const Layout = (() => {
    const { icon, esc } = UI;

    const links = [
        { page: 'events', href: 'events.html', label: 'Events', ic: 'calendar' },
        { page: 'announcements', href: 'announcements.html', label: 'Announcements', ic: 'mic' },
        { page: 'promos', href: 'promos.html', label: 'Promos', ic: 'video' },
    ];
    // Admin-only navigation (rendered ONLY when Auth.isAdmin())
    const adminLinks = [
        { page: 'dashboard', href: 'dashboard.html', label: 'Dashboard', ic: 'chart' },
        { page: 'users', href: 'users.html', label: 'Manage users', ic: 'users' },
        { page: 'admin-notifications', href: 'admin-notifications.html', label: 'Manage notifications', ic: 'bell' },
        { page: 'event-form', href: 'event-form.html', label: 'New event', ic: 'plus' },
        { page: 'announcement-form', href: 'announcement-form.html', label: 'New announcement', ic: 'plus' },
        { page: 'promo-form', href: 'promo-form.html', label: 'New promo', ic: 'plus' },
    ];

    const current = () => document.body.dataset.page;
    const cur = (p) => (p === current() ? 'aria-current="page"' : '');

    const initials = (name = '') => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

    const header = () => {
        const user = Auth.getUser();
        const loggedIn = Auth.isLoggedIn();
        const admin = Auth.isAdmin(); // ROLE GUARD: controls visibility of Admin + Dashboard links
        const q = UI.param('q') || '';

        const navLinks = links.map((l) => `<a href="${l.href}" class="nav-link" ${cur(l.page)}>${icon(l.ic, 'w-4 h-4')}${l.label}</a>`).join('');

        return `
        <a href="#main" class="skip-link btn-primary">Skip to main content</a>
        <header class="sticky top-0 z-40 bg-gradient-to-r from-civic-800 via-civic-700 to-civic-800 text-white shadow-md">
            <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
                <a href="${loggedIn ? 'events.html' : 'index.html'}" class="flex items-center gap-2 shrink-0" aria-label="CivicEvents home">
                    <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-300 text-civic-900 font-extrabold">CE</span>
                    <span class="hidden sm:block text-lg font-bold tracking-tight">Civic<span class="text-leaf-300">Events</span></span>
                </a>

                ${loggedIn ? `
                <form id="global-search" role="search" action="search.html" class="hidden md:flex flex-1 max-w-md mx-2">
                    <label for="global-q" class="sr-only">Search events, announcements and promos</label>
                    <div class="relative w-full">
                        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-civic-200">${icon('search', 'w-4 h-4')}</span>
                        <input id="global-q" name="q" type="search" value="${esc(q)}" placeholder="Search events, announcements, promos…" class="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder-civic-200 focus:bg-white focus:text-gray-900 focus:placeholder-gray-500 focus:outline-none">
                    </div>
                </form>
                <nav aria-label="Main" class="hidden lg:flex items-center gap-1">${navLinks}</nav>` : '<div class="flex-1"></div>'}

                <div class="ml-auto flex items-center gap-1">
                ${loggedIn ? `
                    ${admin ? `
                    <div class="relative hidden lg:block" data-dropdown>
                        <button type="button" class="nav-link" aria-haspopup="true" aria-expanded="false" aria-controls="admin-menu" data-toggle ${['dashboard', 'users', 'admin-notifications'].includes(current()) ? 'aria-current="page"' : ''}>
                            ${icon('chart', 'w-4 h-4')} Admin <span aria-hidden="true">▾</span>
                        </button>
                        <div id="admin-menu" class="absolute right-0 mt-2 hidden w-56 rounded-xl bg-white p-2 text-gray-800 shadow-xl ring-1 ring-black/5" role="menu">
                            ${adminLinks.map((l) => `<a role="menuitem" href="${l.href}" class="side-link">${icon(l.ic, 'w-4 h-4')}${l.label}</a>`).join('')}
                        </div>
                    </div>` : ''}

                    <button type="button" id="bell-btn" class="relative rounded-lg p-2 hover:bg-white/10" aria-controls="notif-drawer" aria-expanded="false" aria-label="Notifications">
                        ${icon('bell', 'w-6 h-6')}
                        <span id="bell-count" class="absolute -right-0.5 -top-0.5 hidden min-w-[1.25rem] rounded-full bg-leaf-400 px-1 text-center text-xs font-bold leading-5 text-civic-950"></span>
                    </button>

                    <div class="relative" data-dropdown>
                        <button type="button" class="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/10" aria-haspopup="true" aria-expanded="false" aria-controls="profile-menu" data-toggle>
                            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-200 text-sm font-bold text-civic-900" aria-hidden="true">${esc(initials(user?.full_name))}</span>
                            <span class="hidden xl:block text-sm font-medium max-w-[9rem] truncate">${esc(user?.full_name)}</span>
                            <span class="sr-only">Open profile menu</span>
                        </button>
                        <div id="profile-menu" class="absolute right-0 mt-2 hidden w-60 rounded-xl bg-white p-2 text-gray-800 shadow-xl ring-1 ring-black/5" role="menu">
                            <div class="border-b border-gray-100 px-3 py-2 mb-1">
                                <p class="font-semibold truncate">${esc(user?.full_name)}</p>
                                <p class="text-xs text-gray-600 truncate">${esc(user?.email)}</p>
                                <p class="mt-1">${UI.badge(user?.role === 'admin' ? 'Administrator' : 'Resident', user?.role === 'admin' ? 'blue' : 'green')}</p>
                            </div>
                            <a role="menuitem" href="profile.html" class="side-link">${icon('user', 'w-4 h-4')} My profile</a>
                            <a role="menuitem" href="my-registrations.html" class="side-link">${icon('ticket', 'w-4 h-4')} My registrations</a>
                            <a role="menuitem" href="notifications.html" class="side-link">${icon('bell', 'w-4 h-4')} Notifications</a>
                            ${admin ? `<a role="menuitem" href="dashboard.html" class="side-link">${icon('chart', 'w-4 h-4')} Dashboard</a>` : ''}
                            <button role="menuitem" type="button" id="logout-btn" class="side-link w-full text-red-700 hover:!bg-red-50 hover:!text-red-800">${icon('logout', 'w-4 h-4')} Sign out</button>
                        </div>
                    </div>

                    <button type="button" id="mobile-menu-btn" class="lg:hidden rounded-lg p-2 hover:bg-white/10" aria-controls="mobile-menu" aria-expanded="false" aria-label="Open menu">${icon('menu', 'w-6 h-6')}</button>
                ` : `
                    <a href="login.html" class="nav-link" ${cur('login')}>Log in</a>
                    <a href="signup.html" class="btn-success !py-2">Sign up</a>
                `}
                </div>
            </div>

            ${loggedIn ? `
            <div id="mobile-menu" class="hidden lg:hidden border-t border-white/10 px-4 pb-4">
                <form role="search" action="search.html" class="mt-3 md:hidden">
                    <label for="mobile-q" class="sr-only">Search</label>
                    <input id="mobile-q" name="q" type="search" value="${esc(q)}" placeholder="Search…" class="w-full rounded-lg bg-white px-3 py-2 text-sm text-gray-900">
                </form>
                <nav aria-label="Mobile" class="mt-3 grid gap-1">
                    ${navLinks}
                    ${admin ? `<p class="mt-2 px-3 text-xs font-semibold uppercase tracking-wide text-leaf-300">Admin</p>${adminLinks.map((l) => `<a href="${l.href}" class="nav-link" ${cur(l.page)}>${icon(l.ic, 'w-4 h-4')}${l.label}</a>`).join('')}` : ''}
                </nav>
            </div>` : ''}
        </header>`;
    };

    const drawer = () => `
        <div id="notif-overlay" class="fixed inset-0 z-50 hidden bg-gray-900/40"></div>
        <aside id="notif-drawer" class="drawer closed fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true" tabindex="-1">
            <div class="flex items-center justify-between border-b px-5 py-4">
                <h2 id="drawer-title" class="text-lg font-semibold text-gray-900">Notifications</h2>
                <div class="flex items-center gap-1">
                    <button type="button" id="mark-all-read" class="btn-ghost text-sm">Mark all read</button>
                    <button type="button" id="drawer-close" class="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Close notifications">${icon('x')}</button>
                </div>
            </div>
            <div id="drawer-list" class="flex-1 overflow-y-auto divide-y" aria-live="polite">${UI.skeletonRows(5)}</div>
            <div class="border-t p-4"><a href="notifications.html" class="btn-secondary w-full">Open inbox</a></div>
        </aside>`;

    const footer = () => `
        <footer class="mt-16 border-t border-gray-200 bg-civic-950 text-civic-100">
            <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <p class="text-lg font-bold text-white">Civic<span class="text-leaf-300">Events</span></p>
                    <p class="mt-2 text-sm text-civic-200">Your accessible portal for city events, public announcements and community services.</p>
                </div>
                <nav aria-label="Footer – explore">
                    <h2 class="text-sm font-semibold uppercase tracking-wide text-leaf-300">Explore</h2>
                    <ul class="mt-3 space-y-2 text-sm">
                        <li><a class="hover:text-white hover:underline" href="events.html">Upcoming events</a></li>
                        <li><a class="hover:text-white hover:underline" href="announcements.html">Audio announcements</a></li>
                        <li><a class="hover:text-white hover:underline" href="promos.html">Video promos</a></li>
                        <li><a class="hover:text-white hover:underline" href="my-registrations.html">My registrations</a></li>
                    </ul>
                </nav>
                <div>
                    <h2 class="text-sm font-semibold uppercase tracking-wide text-leaf-300">Contact & help</h2>
                    <ul class="mt-3 space-y-2 text-sm">
                        <li>City Hall, KN 3 Ave, Kigali</li>
                        <li><a class="hover:text-white hover:underline" href="mailto:support@civicevents.example">support@civicevents.example</a></li>
                        <li><a class="hover:text-white hover:underline" href="tel:+250788000000">+250 788 000 000</a></li>
                        <li>Mon–Fri, 8:00–17:00</li>
                    </ul>
                </div>
                <div>
                    <h2 class="text-sm font-semibold uppercase tracking-wide text-leaf-300">Accessibility</h2>
                    <p class="mt-3 text-sm text-civic-200">All audio has a text summary and videos include captions. Every feature works with a keyboard. Need help? Contact us and we'll assist.</p>
                </div>
            </div>
            <div class="border-t border-white/10 py-4 text-center text-xs text-civic-300">© ${new Date().getFullYear()} CivicEvents · City Services Portal</div>
        </footer>`;

    /** Admin sidebar — only rendered for pages with data-layout="admin" (which are also data-role="admin"). */
    const adminShell = () => {
        if (document.body.dataset.layout !== 'admin' || !Auth.isAdmin()) return;
        const $main = $('#main');
        const inner = $main.html();
        $main.removeClass().addClass('mx-auto w-full max-w-7xl flex-1 px-4 py-8').html(`
            <div class="flex flex-col gap-6 lg:flex-row">
                <aside class="lg:w-60 shrink-0" aria-label="Admin sections">
                    <div class="card p-3 lg:sticky lg:top-24">
                        <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Admin panel</p>
                        <nav class="flex gap-1 overflow-x-auto lg:flex-col">
                            ${adminLinks.map((l) => `<a href="${l.href}" class="side-link shrink-0" ${cur(l.page)}>${icon(l.ic, 'w-4 h-4')}${l.label}</a>`).join('')}
                        </nav>
                    </div>
                </aside>
                <div class="min-w-0 flex-1" id="admin-content">${inner}</div>
            </div>`);
    };

    // ---------- notification bell + drawer ----------
    const renderBell = () => {
        const n = Notifs.unreadCount();
        const $c = $('#bell-count');
        $c.toggleClass('hidden', n === 0).text(n > 99 ? '99+' : n);
        $('#bell-btn').attr('aria-label', n ? `Notifications, ${n} unread` : 'Notifications, none unread');
    };

    const notifRow = (n) => {
        const [cls, ic] = Notifs.typeStyle(n.type);
        const read = Notifs.isRead(n);
        return `
        <button type="button" class="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-civic-50 ${read ? '' : 'bg-leaf-50/60'}" data-notif="${n.id}">
            <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}">${icon(ic, 'w-4 h-4')}</span>
            <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                    <span class="truncate font-semibold text-gray-900">${esc(n.title)}</span>
                    ${read ? '' : '<span class="h-2 w-2 shrink-0 rounded-full bg-leaf-600" aria-hidden="true"></span><span class="sr-only">(unread)</span>'}
                </span>
                <span class="mt-0.5 block text-sm text-gray-700 line-clamp-2">${esc(n.message)}</span>
                <span class="mt-1 block text-xs text-gray-500">${esc(n.type)} · ${UI.timeAgo(n.created_at)}</span>
            </span>
        </button>`;
    };

    const renderDrawer = () => {
        const items = Notifs.items;
        $('#drawer-list').html(items.length
            ? items.slice(0, 20).map(notifRow).join('')
            : `<div class="p-8">${UI.empty('You\'re all caught up', 'New events, announcements and promos will appear here.')}</div>`);
    };

    let lastFocus = null;
    const openDrawer = () => {
        lastFocus = document.activeElement;
        $('#notif-overlay').removeClass('hidden');
        $('#notif-drawer').removeClass('closed').attr('aria-hidden', 'false').trigger('focus');
        $('#bell-btn').attr('aria-expanded', 'true');
        Notifs.load().catch((err) => UI.errorState($('#drawer-list'), err, openDrawer));
    };
    const closeDrawer = () => {
        $('#notif-overlay').addClass('hidden');
        $('#notif-drawer').addClass('closed').attr('aria-hidden', 'true');
        $('#bell-btn').attr('aria-expanded', 'false');
        lastFocus?.focus();
    };

    const bindEvents = () => {
        // Dropdowns (profile + admin)
        $(document).on('click', '[data-dropdown] [data-toggle]', function (e) {
            e.stopPropagation();
            const $dd = $(this).closest('[data-dropdown]');
            const open = $(this).attr('aria-expanded') === 'true';
            $('[data-dropdown] [data-toggle]').attr('aria-expanded', 'false');
            $('[data-dropdown] [role=menu]').addClass('hidden');
            if (!open) {
                $(this).attr('aria-expanded', 'true');
                $dd.find('[role=menu]').removeClass('hidden').find('[role=menuitem]').first().trigger('focus');
            }
        });
        $(document).on('click', () => {
            $('[data-dropdown] [data-toggle]').attr('aria-expanded', 'false');
            $('[data-dropdown] [role=menu]').addClass('hidden');
        });
        // Arrow-key navigation inside menus
        $(document).on('keydown', '[role=menu]', function (e) {
            const items = $(this).find('[role=menuitem]').toArray();
            const i = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
            if (e.key === 'Escape') { $(this).addClass('hidden'); $(this).prev('[data-toggle]').attr('aria-expanded', 'false').trigger('focus'); }
        });

        $('#mobile-menu-btn').on('click', function () {
            const open = $(this).attr('aria-expanded') === 'true';
            $(this).attr('aria-expanded', String(!open));
            $('#mobile-menu').toggleClass('hidden', open);
        });

        $('#logout-btn').on('click', async () => {
            const ok = await UI.confirm({ title: 'Sign out?', message: 'You will need to log in again to access your events.', confirmText: 'Sign out' });
            if (ok) Auth.logout('You have been signed out.', 'success');
        });

        // Notification drawer
        $('#bell-btn').on('click', openDrawer);
        $('#drawer-close, #notif-overlay').on('click', closeDrawer);
        $(document).on('keydown', (e) => { if (e.key === 'Escape' && !$('#notif-drawer').hasClass('closed')) closeDrawer(); });
        $('#mark-all-read').on('click', () => { Notifs.markAllRead(); UI.toast('All notifications marked as read', 'success'); });
        $(document).on('click', '#drawer-list [data-notif]', function () {
            const id = $(this).data('notif');
            Notifs.markRead(id);
            location.href = `notifications.html?id=${id}`;
        });

        // Empty global search shouldn't navigate
        $('form[role=search]').on('submit', function (e) {
            if (!$(this).find('input').val().trim()) { e.preventDefault(); $(this).find('input').trigger('focus'); }
        });
    };

    const render = () => {
        $('#app-header').replaceWith(header() + (Auth.isLoggedIn() ? drawer() : ''));
        $('#app-footer').replaceWith(footer());
        adminShell();
        bindEvents();
        UI.consumeFlash();
        if (Auth.isLoggedIn()) {
            Notifs.onChange(() => { renderBell(); renderDrawer(); });
            Notifs.load().catch(() => {});
            Notifs.startPolling();
        }
    };

    return { render, notifRow };
})();

/**
 * App.init — entry point every page calls.
 * 1. Runs the auth/role guard (Auth.guard) — stops here if the page isn't allowed.
 * 2. Renders the shared layout.
 * 3. Runs the page's own code.
 */
const App = {
    init(pageFn) {
        $(() => {
            const access = Auth.guard();
            if (access === false) return;                                       // redirected (login / expired)
            Layout.render();
            if (access === 'forbidden') { UI.renderForbidden(); return; }       // admin page, normal user -> 403 view
            try { pageFn && pageFn(); } catch (e) { console.error(e); UI.toast('Something went wrong on this page.', 'error'); }
        });
    },
};
