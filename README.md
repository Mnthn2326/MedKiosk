# MediKiosk+

A unified health platform combining Clinical Core, FinHealth, and Emergency modules on a single shared data layer.

## 🌟 Overview

MediKiosk+ is a project built to showcase a full-stack health platform using a minimal, modern tech stack. The platform features three core modules:

1. **Clinical Core**: Multi-contributor patient timeline, RAG-powered pre-visit doctor summaries, patient self-service view, and data de-identification.
2. **FinHealth**: Simulated insurance/payment bridge for claims management.
3. **Emergency**: Live ambulance dispatch with real-time location sharing.

## 🛠️ Tech Stack

- **Frontend & Backend:** [Next.js App Router](https://nextjs.org/) (Single framework for all pages and API routes)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database, Auth & Realtime:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row Level Security, Supabase Realtime)
- **AI & Vector Search:** [Gemini API](https://deepmind.google/technologies/gemini/) + `pgvector` for RAG retrieval over clinical events
- **Payments:** Razorpay (Test Mode)
- **Maps:** Leaflet.js + OpenStreetMap
- **Hosting:** Vercel (Frontend) & Supabase (Backend/DB)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Git](https://git-scm.com/)
- Gemini API Key
- Supabase Project URL and Anon Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd MedKiosk
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env.local` file in the root directory based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required variables (Supabase keys, Gemini API key, Razorpay keys).

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the app in action.

## 📂 Project Structure

```text
/app
  /patient        # Patient-facing routes
  /doctor         # Doctor-facing routes
  /contributor    # Lab/diagnostic center routes
  /driver-sim     # Internal ambulance driver simulator (demo tool)
  /admin          # Claim status admin panel (demo tool)
  /api            # API routes (Gemini calls, RAG retrieval, dispatch logic)
/components
  /clinical       # Timeline, summary card, trust-tier badge
  /finhealth      # Payment form, claim tracker
  /emergency      # Map view, call-ambulance button
  /ui             # Shared design system primitives
/lib              # Supabase client, Gemini API wrapper, RAG logic
/types            # Shared TypeScript types matching DB schema
/docs             # Architecture, data models, schema, and product requirements
```

## 🔒 Security & Safety Rules

- **De-identification:** Contributors never see a patient's real name — interaction is via a `deidentified_code`.
- **Doctor in the Loop:** AI-generated clinical content is never auto-final; it always requires doctor review (Accept/Edit/Reject).
- **Patient Privacy:** RAG chat answers solely from the patient's own `clinical_events`. No general medical advice.
- **Sandbox Environment:** All payments use Razorpay Test Mode. No real money or real insurer API calls.
- **Row Level Security (RLS):** Role-based access is strictly enforced at the database level via Supabase RLS.

## 📖 Documentation

Detailed documentation and specs can be found in the `/docs` folder and the root project spec:
- [Project Specification](PROJECT_SPEC.md)
- [Product Requirements](docs/product-requirements.md)
- [Architecture](docs/architecture.md)
- [Data Model & Schema](docs/data-model.md)
- [Roles & Permissions](docs/roles-and-permissions.md)

## 🎨 Design System

Clean, clinical, and calm design tailored for healthcare.
- **Typography:** Inter
- **Palette:** Trust-tier badge colors (Teal for verified, Green for confirmed, Amber for user-uploaded, Gray for self-reported).
- **Components:** Restrained visual treatment for core clinical screens, with higher urgency colors (e.g., Red/Coral) reserved for emergency actions.

## 🌐 Live Demo
You can view and interact with the live deployment of MediKiosk+ here:
**[View Live Demo](https://medkiosk.vercel.app)**

*(Note: Since this is a test environment, payments use Razorpay Test Mode and no real money is processed.)*
