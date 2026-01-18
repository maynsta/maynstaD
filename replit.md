# Maynsta

## Overview
A Next.js 16 application with Supabase authentication and React 19.

## Tech Stack
- **Framework**: Next.js 16 with Turbopack
- **UI**: React 19, TailwindCSS 4, Radix UI components, shadcn/ui
- **Authentication/Database**: Supabase
- **Other**: SWR for data fetching, Recharts for charts, Zod for validation

## Project Structure
- `app/` - Next.js App Router pages and components
- `components/` - Reusable UI components (shadcn/ui)
- `lib/` - Utility functions and Supabase client configuration
- `hooks/` - Custom React hooks
- `contexts/` - React context providers
- `public/` - Static assets
- `styles/` - Global styles

## Setup Requirements
This project requires the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

## Running the App
- Development: `npm run dev` (runs on port 5000)
- Production: `npm run build && npm run start`

## Deployment
Configured for autoscale deployment on Replit.
