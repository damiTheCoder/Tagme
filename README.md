# tagly

AI chat ordering system for micro businesses

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Tech stack

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS + `tailwindcss-animate`
- shadcn/ui
- `lucide-react`
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## Note

This is Step 1 of an incremental build. Auth, dashboard, AI agent, and public chat page come in later steps.
