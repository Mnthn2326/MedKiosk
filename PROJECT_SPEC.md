# MediKiosk+ — Project Specification

This is the single reference document for the whole project. Paste this into
every Antigravity session **before** the module-specific build prompts, so
every agent (and every teammate) is working from the same tech stack, visual
design, and architecture — no drift between the three parallel builds.

---

## 1. Project Overview

MediKiosk+ is a unified health platform with three modules on one shared
data layer:

1. **Clinical Core** — multi-contributor patient timeline, RAG-powered
   pre-visit doctor summaries, patient self-service view, de-identification
2. **FinHealth** — simulated insurance/payment bridge (test-mode only)
3. **Emergency** — live ambulance dispatch with real-time location sharing

Built as an academic subject project by a team of 2-3, using a deliberately
minimal, mostly-free tech stack.

---

## 2. Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | **Next.js** (App Router) | Single framework for all pages, patient/doctor/driver views, API routes |
| Styling | **Tailwind CSS** | Fast, consistent styling without hand-written CSS |
| Backend | **Next.js API routes** | No separate backend service needed — keeps the stack to one framework |
| Database | **Supabase Postgres** | Relational store for every table in the schema |
| Auth | **Supabase Auth** | Login/session handling, role-based access |
| Realtime | **Supabase Realtime** | Live updates for claim status and ambulance location — no extra service |
| Vector search | **pgvector** (Postgres extension) | RAG retrieval over clinical_events, same DB, no separate vector store |
| LLM | **Gemini API** | Conversation, summarization, structured extraction, patient chat |
| Payments | **Razorpay (Test Mode)** | Realistic payment UX with zero real money |
| Maps | **Leaflet.js + OpenStreetMap** | Live location display, free, no API key required |
| Hosting | **Vercel** (frontend) + **Supabase** (backend/DB) | Free-tier, fast deploy, live demo URL |

**Rule:** don't introduce a new tool outside this table without checking with the team first — the whole point of "minimal stack" is that everyone can reason about the full system.

---

## 3. Design System

### 3.1 Color Palette

| Token | Hex | Use |
|---|---|---|
| `primary` | `#0F4C5C` (deep teal) | Navigation, primary buttons, headers — the "trust" color |
| `primary-light` | `#E7EEF0` (pale ice) | Card backgrounds, section backgrounds |
| `accent` | `#D85A30` (coral) | AI-generated content, new/highlighted features, secondary CTAs |
| `success` | `#1B8A5A` (green) | "Doctor Confirmed" / "Lab Verified" badges, approved claims, arrived ambulance |
| `warning` | `#E0A106` (amber) | "Under Review" claims, pending states |
| `danger` | `#C1121F` (red) | Red-flag alerts, rejected claims, errors |
| `text-primary` | `#1B2B2E` | Body text |
| `text-muted` | `#64748B` | Secondary/helper text |
| `border` | `#E2E8F0` | Card borders, dividers |
| `background` | `#FFFFFF` | Page background |

**Trust-tier badge colors specifically** (used across Clinical Core):
- `self_reported` → gray (`#94A3B8`)
- `patient_uploaded` → amber (`#E0A106`)
- `institution_verified` → teal (`#0F4C5C`)
- `doctor_confirmed` → green (`#1B8A5A`)

### 3.2 Typography

- Font: **Inter** (Google Fonts, free, loads via `next/font/google`)
- Headings: 600-700 weight
- Body: 400 weight, 16px base size
- Small/meta text (timestamps, badges): 13px, 500 weight

### 3.3 Spacing & Shape

- Spacing scale: 4px, 8px, 16px, 24px, 32px (Tailwind defaults `1,2,4,6,8`)
- Card border radius: `rounded-xl` (12px)
- Button border radius: `rounded-lg` (8px)
- Cards: white background, 1px `border` color, subtle shadow (`shadow-sm`)

### 3.4 Tone

Clean, clinical, calm — this is a healthcare product, not a consumer app.
Avoid heavy gradients, avoid playful illustration for core clinical screens.
The Emergency module's "Call Ambulance" button is the one place a bolder,
higher-urgency visual treatment (larger button, `danger` or `accent` color)
is appropriate — everywhere else stays restrained.

---

## 4. Architecture

### 4.1 Module Layout

```
Clinical Core (owns the source-of-truth data)
        |
        |-- FinHealth Module (references patient_id, adds financial layer)
        |
        |-- Emergency Module (references patient_id, adds dispatch layer)
```

All three modules share **one Supabase project**, **one auth session**, and
**one Next.js app** — they are feature areas within a single app, not
separate services.

### 4.2 Data Flow — Clinical Core

```
Doctor / Lab / Diagnostic Center
        v
  clinical_events table (tagged by trust_tier)
        v
  pgvector embedding on insert
        v
  RAG retrieval (similarity + trust_tier ranking)
        v
  Gemini API --> structured summary
        v
  Doctor Review (Accept / Edit / Reject)
        v
  written back as ai_summary event
```

### 4.3 Data Flow — FinHealth

```
Patient scans/enters bill
        v
  Razorpay Test Mode payment
        v
  claims table row (status='submitted')
        v
  simulated status progression (timer or admin panel)
        v
  Supabase Realtime --> patient sees live status update
```

### 4.4 Data Flow — Emergency

```
Patient taps "Call Ambulance"
        v
  browser geolocation captured
        v
  dispatch_requests row created
        v
  nearest available driver auto-assigned (Haversine distance)
        v
  Supabase Realtime --> live map updates as driver "moves"
        v
  status: requested -> accepted -> enroute -> arrived
```

### 4.5 Database Schema

See the shared schema block in `Antigravity_Build_Prompts.md`, Section 0 —
that schema is authoritative and should not be duplicated or diverged from
across modules. If a module needs a new field, add it to the shared schema
doc first, then build against it.

### 4.6 Security & Safety Rules (non-negotiable across all modules)

1. Contributors never see a patient's real name — always join through
   `deidentified_code`.
2. AI-generated clinical content is never auto-final — always requires
   doctor Accept/Edit/Reject.
3. The patient-facing RAG chat answers only from that patient's own
   `clinical_events` — never general medical advice.
4. No real payment processing, no real insurer API calls — Test Mode only.
5. Role-based access enforced via Supabase Row Level Security (RLS)
   policies, not just UI-level checks.

---

## 5. Folder Structure Convention

```
/app
  /patient        -- patient-facing routes
  /doctor         -- doctor-facing routes
  /contributor    -- lab/diagnostic center routes
  /driver-sim     -- internal ambulance driver simulator (demo tool)
  /admin          -- claim status admin panel (demo tool)
  /api            -- API routes (Gemini calls, RAG retrieval, dispatch logic)
/components
  /clinical       -- timeline, summary card, trust-tier badge
  /finhealth      -- payment form, claim tracker
  /emergency      -- map view, call-ambulance button
  /ui             -- shared buttons, cards, inputs (design system primitives)
/lib
  /supabase.ts    -- Supabase client
  /gemini.ts      -- Gemini API wrapper
  /rag.ts         -- retrieval + ranking logic
/types            -- shared TypeScript types matching the DB schema
```

Keep each module's components in its own folder — this keeps the 2-3
parallel Antigravity sessions from generating conflicting files.
