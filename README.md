# ئیش خواز (Ish-khwaz) — Kurdistan Jobs Marketplace

A full-stack jobs marketplace built for the Kurdistan Region — freelancers and
companies post, discover, and manage real work: job listings, CV applications
with payment verification, subscription plans, AI-assisted CV building, live
in-app notifications, and an interactive map of jobs across every governorate,
qaza and nahiya in the region.

**Live:** [ishkhwaz.zeraworld.com](https://ishkhwaz.zeraworld.com)

## Screenshots

_TODO: add real screenshots to `docs/screenshots/` and reference them here
— the home feed, a job detail page, the post-a-job flow, the location map,
and a profile page are the best ones to show._

## What it does

- **Job listings** — full CRUD for companies, real Kurdistan location
  hierarchy (governorate → qaza → nahiya), category and work-type filters,
  salary ranges, boosted/featured listings.
- **CV applications** — freelancers apply with a paid CV submission fee
  (FastPay manual transfer, verified by proof-of-payment upload), employers
  review and accept/reject applications.
- **Subscription plans** — Pro/VIP tiers purchased either through manual
  FastPay transfer or a real payment gateway integration (Zera Payment),
  unlocking CV credits, profile boosting, and AI features.
- **AI CV Assistant** — an OpenAI-backed conversational flow that builds a
  polished, professionally-worded Kurdish CV from a short chat, with a
  second "copy-edit" pass that catches invented or mistranslated words
  before the CV is finalized.
- **Real-time everything** — Pusher-backed live notifications, new-message
  badges, and an admin dashboard that updates the moment a real event
  happens (new signup, job posted, payment submitted) instead of on a timer.
- **Disputes & support** — a real ticketing flow for rejected payments, with
  a threaded conversation between the user and an admin and a resolution
  that can refund, approve, or deny.
- **PWA** — installable, offline-tolerant, with real push notifications and
  an app icon badge.
- **Company & freelancer profiles** — public profile pages, saved jobs,
  profile-view tracking, verified-company badges, portfolio/experience
  timelines.
- **Admin tooling** — the operational admin surface for this app actually
  lives in a separate console
  ([Zera Group Console](https://github.com/arbmeng/zera-console)),
  connected over a server-to-server single-sign-on bridge — this repo's
  backend is what that console drives.

## Tech stack

**Frontend** — React 18 + Vite, Tailwind CSS 4, Framer Motion, a custom
Context-based state layer (no Redux/Router — routing is handled by a single
`activeTab` state machine in `App.jsx`), Pusher for real-time push,
`jspdf`/`html-to-image` for CV export, Dexie (IndexedDB) for offline caching.

**Backend** — a single PHP 8 file (`public/api/index.php`) serving a REST
API over MySQL via PDO. No framework — deliberately explicit route
matching (`preg_match` per endpoint), JWT session tokens, PHPMailer over
authenticated Gmail SMTP for transactional email, a real Pusher server
integration for push events, and OpenAI's API for the CV assistant.

**Infrastructure** — a Python/paramiko deploy script that zips the built
frontend + API, uploads over SFTP, and extracts on the host while
preserving the live production database. A custom service worker handles
PWA installability and push delivery.

## Project structure

```
src1/                    React frontend (the only active frontend tree)
  components/            Feature-organized: profile, employer, freelancer,
                          company, admin, auth, map, plans, layout...
  context/                AuthContext, StoreContext — the app's global state
  services/               api.js (REST client), realtimeService.js (Pusher),
                          pushService.js, soundService.js
  data/                   Real Kurdistan governorate/qaza/nahiya hierarchy
public/api/
  index.php               The entire backend — REST API, auth, payments,
                          real-time triggers, AI integration
  config.example.php      Config shape — copy to config.php with real values
deploy.py                 Build + deploy pipeline
```

## Running locally

```bash
npm install
cp public/api/config.example.php public/api/config.php   # fill in real values
npm run dev        # Vite dev server
```

The PHP API needs a MySQL database and a PHP 8 runtime; point `DB_HOST` /
`DB_NAME` / `DB_USER` / `DB_PASS` in `config.php` at your own database — the
schema is created automatically on first request.

## Notes on this repo

This is the real, live codebase for a production app with real users — the
git history here starts fresh (no user data, payment records, or secrets
were ever committed). `config.php`, `deploy_config.py`, and the local
SQLite/log files are git-ignored; see the `.example` files for what they
should contain.
