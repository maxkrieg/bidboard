# 🏠 BidBoard

A collaborative web app for homeowners to collect, compare, and analyze contractor bids for home improvement projects. Invite collaborators, discuss bids in real time, and leverage AI-powered analysis to make confident decisions.

## ✨ Features

- 📋 **Project management** — Create projects for home improvement jobs and invite collaborators
- 💰 **Bid tracking** — Add contractor bids with line items and supporting documents
- 🔍 **Contractor enrichment** — Automatically pulls Google ratings, reviews, and business info for each contractor
- 🤖 **AI analysis** — Claude-powered comparison that surfaces red flags, highlights, and clarifying questions across all bids
- 💬 **Real-time collaboration** — Comment on bids and message project members with live updates via Supabase Realtime
- 🔔 **Invites & notifications** — Invite collaborators by email; get notified when bids, comments, or messages are added

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database / Auth / Realtime / Storage:** Supabase
- **AI:** Anthropic Claude API
- **Contractor data:** Google Places API + Firecrawl
- **Email:** Resend
- **Deployment:** Vercel

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables and fill in values
cp .env.local.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 🔑 Environment Variables

See `.env.local.example` for the full list of required variables. Key ones:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI analysis |
| `GOOGLE_PLACES_API_KEY` | Google Places API key for contractor enrichment |
| `FIRECRAWL_API_KEY` | Firecrawl API key for contractor website scraping |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `NEXT_PUBLIC_SITE_URL` | Fully-qualified production URL (e.g. `https://bidboard.vercel.app`) |

### 🗄️ Database

```bash
# Apply migrations
npx supabase db push

# Regenerate TypeScript types after schema changes
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
```

## ☁️ Deployment

Deploy to Vercel. Set `NEXT_PUBLIC_SITE_URL` to your production URL in the Vercel dashboard under Project → Settings → Environment Variables — all email links and internal API calls depend on it being a fully-qualified URL.
