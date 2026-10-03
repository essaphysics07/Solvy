# Solvy

A focused, responsive mathematics and physics workspace built with Next.js App Router, TypeScript, React, and Tailwind CSS v4.

## Run locally

Requires Node.js 20.9 or newer (Node 22+ recommended) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm run typecheck
npm run build
npm start
```

## Implemented

- Responsive indigo-and-white educational interface, keyboard focus indicators, skip link, semantic form labels, reduced-motion support, and live status messages.
- Mathematics/physics selection and three explanation levels.
- Text input with a 5,000-character limit and starter problems.
- Image selection, drag/drop, type/size validation, preview, and removal (JPG/PNG/WebP; 10 MB maximum).
- Browser speech recognition with permission and compatibility feedback, stop control, and editable transcription. Requires localhost or HTTPS and a compatible browser. The browser vendor may process speech remotely.
- Reusable step-based solution renderer and a checked, clearly labeled worked example.
- Typed multipart API client, server-side request validation, loading/error feedback, and timeout handling.

## Current boundary

This milestone establishes the interface and architecture. AI solving and image understanding are **not connected**. Valid solve requests deliberately return HTTP 503 with `SOLVER_NOT_CONFIGURED`; no arbitrary problem receives a fabricated answer. Inputs remain in the editor after failure and reset on page reload. No database, accounts, history, or provider credentials are included.

## Structure

```text
src/
  app/
    api/solve/route.ts       # Server validation and future provider orchestration
    globals.css             # Design tokens, Tailwind import, responsive styles
    layout.tsx              # Metadata and app shell
    page.tsx                # Route composition
  components/ui/brand.tsx    # Shared identity component
  features/solver/
    components/             # Workspace and reusable solution renderer
    hooks/use-voice-input.ts # Browser speech adapter and lifecycle
    services/solver.ts       # Typed browser-to-server transport
    types/index.ts          # Domain request, result, and solution contracts
```

## Next integration point

Replace the explicit unconfigured response in `src/app/api/solve/route.ts` with a server-only provider adapter. Keep secrets in environment variables, validate provider responses against the solution contract, and add appropriate request limits, authentication, rate limiting, and image decoding before exposing a production AI endpoint. The current MIME checks are usability validation, not a secure image decoder. The renderer accepts structured steps, expressions, an answer, and a note. Add a mathematical typesetting component here when general LaTeX output is introduced; never render unsanitized provider HTML.
