# CivicEvent+ Project
Accessible city events and services portal. The frontend is built with HTML, Tailwind CSS and jQuery, and runs against the provided Node/Express + PostgreSQL API.

- **Frontend:** [`frontend/`](frontend/). Setup, backend connection, role guards and features are documented in [`frontend/README.md`](frontend/README.md).
- **Backend API:** [`backend/`](backend/). Copy `backend/.env.example` to `backend/.env`, then run `npm install`, `npm run db:init` and `npm run dev` (API at `http://localhost:4000/api`).

Demo logins (after running `npm run db:seed:demo` in `backend/`): admin `admin@civic.test` / `Admin@123` · user `user@civic.test` / `User@1234`.
