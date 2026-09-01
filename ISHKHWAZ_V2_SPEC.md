# Ishkhwaz (ئیش خوازە) V2 — Full Build Architecture & Specification Document

## 1. Project Overview & Brand System

**Ishkhwaz** is a two-sided Kurdish Sorani job marketplace connecting **Job Posters** (companies, government bodies, private sector orgs, and marketplace shop owners) with **Freelancers / Job Seekers**. Posters list jobs; freelancers browse, view job requirements, and submit CVs gated behind an account wallet balance (pay-per-application model). Full admin control panel included.

### Visual Identity & Theme Tokens
- **Primary Background**: Near-Black Obsidian `#0D0D0D`
- **Elevated Surfaces**: Deep Dark `#141414`
- **Hover/Active State**: Slate Obsidian `#1C1C1C`
- **Accent Brand Color**: Acid Neon Lime `#C4E538` (Hover `#BFE026`, Soft tint `#DDF06B`)
- **Borders & Dividers**: `#2A2A2A`
- **Text Headings**: `#FFFFFF`
- **Secondary Text**: `#B3B3B3` & `#8A8A8A`
- **Destructive**: `#E5484D`
- **Icon Motif**: Magnifier + Megaphone + Briefcase + Document + Person-in-tie (Search, hiring & opportunity).

---

## 2. Localization & RTL (Kurdish Sorani)

- Primary Language: **Kurdish Sorani (`ckb`)**
- Layout: Full RTL (`dir="rtl"`) with logical CSS properties (`margin-inline-start`, `padding-inline-end`).
- Typography: Vazirmatn / Noto Sans Arabic.
- Icon Direction: Automatic RTL mirroring for navigation arrows, chevrons, and step indicators.

---

## 3. Technology Stack & Architecture

- **Frontend**: React (Vite), React Router, Tailwind CSS, TanStack Query, Zustand / Context API.
- **Backend API**: PHP SQLite REST API Engine deployed on Hostinger (`https://studentkrd.com/ishkhwaz/api/v1`).
- **Auth**: Sanctum-compatible token authentication with separate guards for `company`, `freelancer`, and `admin`.
- **Filesystem**: CV uploads, avatars, company logos.
- **Wallet Ledger**: Balance-gated CV submission model with transaction audit logs (`wallet_transactions`).

---

## 4. User Roles & Account Capabilities

### 🏢 Company / Job Poster
- Registration: Organization Name, Mobile Number, Email, Password, Logo, Sector (Private / Government / Marketplace Shop), Governorate.
- Post, edit, close, delete job listings.
- Receive instant notifications upon freelancer CV submissions.
- Accept or reject submitted CVs with automatic freelancer status notification.
- Dashboard analytics: Active listings, applicants per listing, status breakdown.

### 👤 Freelancer / Job Seeker
- Registration: Full Name, Mobile Number, Gender (Male, Female, Prefer not to say), Password, Profile Photo.
- Browse, search, and live-filter jobs by category, governorate, salary range, and job type.
- Submit CV (requires wallet balance >= per-application fee).
- Receive notifications on application status changes (accepted/rejected).
- Dashboard: Submitted applications, saved jobs, wallet balance & top-up history.

### 👑 Admin
- Complete control panel: Manage companies, freelancers, job postings, and CV submissions.
- Block, suspend, or blacklist accounts.
- Moderate job listings.
- Platform analytics: User signups over time, total applications sent, revenue/wallet activity.

---

## 5. Core Feature: Balance-Gated CV Submission

```
Freelancer clicks "Submit CV"
       │
       ▼
Check Wallet Balance >= Fee (2,500 IQD)
 ├── YES ──► Deduct Fee from Wallet ──► Log Ledger Transaction ──► Create Application ──► Notify Company
 └── NO  ──► Block Action ──► Open Wallet Recharge Modal ("شارژکردنەوەی جزدان")
```

All balance operations (top-ups, deductions, refunds) are written atomically to `wallet_transactions` table.

---

## 6. Database Schema (Hostinger SQLite / MySQL)

### `users`
- `id` (VARCHAR PRIMARY KEY)
- `name` (TEXT)
- `phone` (TEXT UNIQUE)
- `email` (TEXT)
- `password` (TEXT)
- `role` ('company' | 'freelancer' | 'admin')
- `gender` ('male' | 'female' | 'other')
- `governorate` (TEXT)
- `district` (TEXT)
- `sub_district` (TEXT)
- `skills` (JSON TEXT)
- `company_name` (TEXT)
- `industry` (TEXT)
- `bio` (TEXT)
- `avatar` (TEXT)
- `cv_url` (TEXT)
- `wallet_balance` (INTEGER DEFAULT 25000)
- `status` ('active' | 'blocked' | 'frozen')
- `created_at` (TIMESTAMP)

### `jobs`
- `id` (VARCHAR PRIMARY KEY)
- `company_id` (VARCHAR)
- `company_name` (TEXT)
- `title_ku` (TEXT)
- `category` (TEXT)
- `job_type` ('fullTime' | 'partTime' | 'remote' | 'freelance')
- `governorate_id` (TEXT)
- `salary_min` (INTEGER)
- `salary_max` (INTEGER)
- `description` (TEXT)
- `fee_amount` (INTEGER DEFAULT 2500)
- `status` ('active' | 'closed' | 'deleted')
- `created_at` (TIMESTAMP)

### `applications`
- `id` (VARCHAR PRIMARY KEY)
- `job_id` (VARCHAR)
- `job_title` (TEXT)
- `company_name` (TEXT)
- `freelancer_id` (VARCHAR)
- `freelancer_name` (TEXT)
- `freelancer_phone` (TEXT)
- `payment_method` ('FastPay' | 'ZainCash' | 'Fib')
- `payment_tx_id` (TEXT)
- `fee_paid` (INTEGER DEFAULT 2500)
- `payment_status` ('pending' | 'approved' | 'rejected')
- `company_status` ('pending' | 'accepted' | 'rejected' | 'shortlisted')
- `created_at` (TIMESTAMP)

### `wallet_transactions`
- `id` (VARCHAR PRIMARY KEY)
- `freelancer_id` (VARCHAR)
- `amount` (INTEGER)
- `type` ('topup' | 'deduction' | 'refund')
- `reference` (TEXT)
- `created_at` (TIMESTAMP)

---

## 7. Responsive Shell Architecture

- **Mobile View**: Bottom tab navigation (`پەڕەی سەرەکی`, `کارەکان`, `داواکارییەکان`, `نۆتیفیکەیشن`, `پڕۆفایل`), compact tap targets, native PWA feel.
- **Desktop/Tablet View**: Top bar navigation with dark obsidian header, multi-column grid layouts, and admin sidebar navigation.

---

## 8. Deployment Endpoint Summary

- **Local Development**: `http://localhost:3000`
- **Hostinger Production REST API**: `https://studentkrd.com/ishkhwaz/api/v1`
- **Hostinger Production Web Server**: `https://ishkhwaz.studentkrd.com`
