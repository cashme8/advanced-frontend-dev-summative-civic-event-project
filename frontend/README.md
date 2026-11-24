# CivicEvents: Frontend

An accessible, responsive portal for city events, audio announcements, captioned video promos and in-app notifications. It is built with **HTML, Tailwind CSS (CDN) and jQuery only**, with no build step.

## 1. Run the backend (API + database)

Requirements: Node.js 18+ and PostgreSQL 14+.

```bash
cd backend
npm install
cp .env.example .env        # then edit DB_USER / DB_PASS / DB_NAME / JWT_SECRET
npm run db:init             # creates the database and runs migrations/001_create_tables.sql
npm run dev                 # API on http://localhost:4000
```

In a second terminal, with the API still running, load the demo data:

```bash
cd backend
npm run db:seed:demo        # creates the demo accounts and sample events through the API
```

| Role  | Email              | Password    |
|-------|--------------------|-------------|
| Admin | `admin@civic.test` | `Admin@123` |
| User  | `user@civic.test`  | `User@1234` |

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Secret used to sign login tokens |
| `PORT` | Optional; defaults to `4000` |

## 2. Run the frontend

The frontend is static files. Serve the `frontend/` folder with any static server:

```bash
cd frontend
npx serve .                 # or: python -m http.server 5500
```

Then open the URL the server prints (for example http://localhost:3000).

### Connecting to the backend

All backend URLs live in one file, [`js/config.js`](js/config.js):

```js
BASE_URL:     'http://localhost:4000',      // also serves uploaded media at /uploads/...
API_BASE_URL: 'http://localhost:4000/api',  // REST API root
```

Change these if the API runs on another host or port. The backend already enables CORS.

## 3. Project structure

```
frontend/
├── *.html                 one file per page (see table below)
├── css/app.css            shared component styles (buttons, inputs, switches, focus rings…)
└── js/
    ├── config.js          API base URL, page size, upload limits
    ├── tailwind.config.js theme colours (neutral "civic" + green "leaf")
    ├── core/
    │   ├── api.js         jQuery AJAX wrapper + Services (one function per endpoint)
    │   ├── auth.js        auth context, token storage, ROLE GUARDS
    │   ├── ui.js          toasts, confirm dialog, skeletons, empty/error states, validation
    │   ├── layout.js      header/nav, notification drawer, admin sidebar, footer, App.init
    │   ├── notifications.js shared notification state (bell, drawer, inbox)
    │   └── components.js  event/announcement/promo cards, upload zone, lazy video loading
    └── pages/             one script per page
```

| Page | Who | API endpoints used |
|---|---|---|
| `index.html` | everyone | none |
| `signup.html`, `login.html` | guests | `POST /auth/signup`, `POST /auth/login` |
| `events.html`, `event.html` | logged in | `/events`, `/event-registrations/*`, `/event-feedback/*` |
| `event-form.html` | **admin** | `POST/PUT /events` (multipart, `image`) |
| `announcements.html`, `announcement.html` | logged in | `/announcements`, `/announcements/:id` |
| `announcement-form.html` | **admin** | `POST/PUT /announcements` (multipart, `audio`) |
| `promos.html`, `promo.html` | logged in | `/promos`, `/promos/:id` |
| `promo-form.html` | **admin** | `POST/PUT /promos` (multipart, `video`) |
| `notifications.html` | logged in | `GET /notifications`, `GET /notifications/:id` |
| `admin-notifications.html` | **admin** | `DELETE /notifications/:id` |
| `dashboard.html` | **admin** | `GET /dashboard/admin`, `GET /users` |
| `users.html` | **admin** | `GET /users`, `GET /users/:id`, `PATCH /users/:id/enable\|disable` |
| `profile.html` | logged in | `GET/PATCH /users/profile/me`, `GET /dashboard/me` |
| `my-registrations.html` | logged in | `GET /event-registrations/my-registrations`, `POST /event-registrations/cancel` |
| `search.html` | logged in | events, announcements and promos lists (filtered in the browser) |

## 4. Authentication and role-based access

* **Token storage** ([`js/core/auth.js`](js/core/auth.js)): if "Keep me signed in" is unchecked, the token goes in `sessionStorage` and is cleared when the browser closes. If it is checked, the token goes in `localStorage`, which survives restarts but is more exposed to XSS. Only the JWT and public user fields `{ id, full_name, email, role }` are stored.
* **Bearer header:** every request goes through `Api.request` ([`js/core/api.js`](js/core/api.js)), which adds `Authorization: Bearer <token>`.
* **Expired or invalid tokens:** the user is signed out automatically, both when the JWT `exp` time passes and on any 401 response. The login page then shows a message.
* **403 responses** show a "contact an administrator" message.

**Where the role guards are** (search the code for `ROLE GUARD` and `ADMIN-ONLY`):

1. **Page guard** (`Auth.guard()` in `auth.js`, run by `App.init` in `layout.js`). Each page declares what it needs on `<body>`:
   * `data-auth="required"`: the user must be logged in, otherwise they are sent to login.
   * `data-role="admin"`: the user must also be an admin, otherwise they see a 403 screen.
2. **Navigation** (`layout.js`): the Admin menu, the Dashboard link and the admin sidebar are only rendered when `Auth.isAdmin()` is true.
3. **Controls** (`components.js` and each page script): Edit, Delete and Publish buttons, status filters and "New …" buttons are only rendered for admins. Register and feedback controls are only shown to residents.
4. **Rules the UI enforces:** admins can enable or disable users but **cannot change roles**. Users can edit only their own `full_name` and `email`.

> These are UX guards only. Real security is the backend's `authenticate` + `authorize(['admin'])` middleware.

## 5. UX and accessibility

* Semantic landmarks, a skip link, labelled controls, `aria-live` regions, visible focus rings and keyboard-operable menus, drawer and dialogs.
* Skeleton loaders, empty states, error states with **Try again**, toasts and confirmation dialogs.
* Uploads are checked for type and size before sending, show a preview first (image, audio or video) and display a progress bar.
* Audio player: labelled buttons, a seek slider with spoken time, volume, speed and keyboard shortcuts, plus a download fallback.
* Promo videos have **captions on by default**: a WebVTT track is generated from `caption_text`. The full transcript appears below the video.
* Promo thumbnails are lazy-loaded. The events, announcements and promos lists are cached for 2 minutes and the cache is cleared after any change.
* Mark-as-read is optimistic and is undone if it fails. Toggling a user on or off and cancelling a registration work the same way.

## 6. Backend limitations

* There is no API route for creating notifications. The backend creates them automatically when events, announcements or promos are created or published. Admins can view and delete them.
* There is no mark-as-read endpoint, so read state is kept per user in `localStorage`.
* `PUT /announcements/:id` ignores a new audio file, so editing covers title and published status only.
* Registrations are unique per user and event, so a cancelled registration can't be re-booked.
