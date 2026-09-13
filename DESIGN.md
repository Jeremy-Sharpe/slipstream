# Slipstream UI — the contract

Read this before touching any file. Every screen already follows it; new screens must too.

## The product in one line
A sales call (or email thread) comes in → Slipstream writes it into the CRM, drafts the follow-up, learns the ideal customer from the deals that were won, and finds the next companies like them. Fictional seller: **Harbourline IT** (12-person Melbourne managed-IT provider selling to 15–120 staff Australian firms; reps Sam Whitfield and Jordan Lee). All data in `lib/` is mock but shaped like the real API (`docs/api-shapes.ts`).

## Screens (nav: Home · Conversations · Leads · Intelligence · Revenue loop)
- **Home `/`** — one input card (Upload file · Record · Paste transcript). Nothing else.
- **Conversations `/conversations`** — the history list (calls and email threads), grouped by day.
- **The run `/calls/[id]`** — transcript/thread left; the sticky right rail streams "What Slipstream did" as gated steps. This is the product.
- **Leads `/leads`** — brief + search runs on the left (380px), a spreadsheet (Glide) on the right.
- **Intelligence `/intelligence`**, **Revenue loop `/loop`** — see their briefs.

## Skin (applai-derived; do not invent tokens)
- Font Open Runde (Inter fallback). No mono anywhere except nothing; numbers use `tabular-nums`.
- Ink `#181925`; text `#3f3f46` / `#666666` / `#737373` / `#a3a3a3`; hairline `#e8e8e8`; flat surfaces `#f5f5f5` / `#f6f6f7`; white canvas.
- Radius 12 (cards 16). **Pills (`rounded-full`) on every control.** Inputs filled grey, borderless, ring on focus (`focus-visible` only, never `focus:`).
- Shadow only `0 1px 3px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.02)`. No gradients on UI (gradient discs for people avatars only). No borders on grey cards.
- **Accent: tangerine `#FF6847` only** (text on it `#182521`): the one primary action per screen, the active nav item, focus rings, "waiting/in progress" dots. Never big fills, never on icons for decoration.
- Semantic colour only in status pills (tint bg + coloured text + dot: green won/approved, amber stalled/waiting, red lost, grey no-show) and scores (green ≥ 80, ink otherwise).
- People = gradient-disc avatars (`components/Avatar.tsx`), no initials. Companies = plain text, no tiles.
- Type: page titles 22px/600 −0.02em; section labels 12px/500 uppercase `#a3a3a3`; body 14px; meta 13.5px `#737373`; badges 12px/500 h-6.
- Copy: Australian English, plain, short. **No em dashes anywhere** (use a comma, a full stop, or " · "). No exclamation marks, no emoji, no "AI"/sparkles iconography, no marketing lines. Empty states are one muted 14px line.
- Lists are strict column grids so pills, times and states form straight vertical lines.

## Motion (from `components/run/`)
- `TraceStep`: step rows with ink check / spinner / waiting ring; shimmering label while working (`shimmer-text`), settles with `fade-in` to "Title · summary · 1.8s"; body expands `grid-template-rows 0fr→1fr` 400ms `cubic-bezier(0.23,1,0.32,1)`; sub-rows `fade-up` staggered 120ms.
- `WorkingLine`: shimmer label + elapsed timer (no pixel grid, it was removed).
- `StreamingText`: word-by-word with caret; citation chips are transcript timestamps.
- Colour transitions 150ms; slide-overs 200ms from the right; nothing bounces; `prefers-reduced-motion` skips delays and transitions; `?instant=1` skips all step delays.
- Pacing minimums for pipeline steps: 3.0 / 4.0 / 3.0 / 3.5 / 3.0 / 4.5 / 3.0s; sub-items ≥ 900ms; 500ms settle between steps.

## Scroll rules (hard-won, keep them)
- **Nothing scrolls under the pointer.** Hover only tints; only an explicit click may scroll the page (to a transcript turn) or the rail (to lift an expanded card above the fade). Auto-reveal of the running step happens only when the pointer is outside the rail and no wheel/touch in the last 3s.
- The run's right rail is one sticky scroll container (`calc(100vh - header - 48px)`), height set so the last visible row is cut mid-height, 40px bottom fade while scrollable-and-not-at-end, thin scrollbar on hover, `overflow-anchor: none`.

## Gates
Phase 1: Transcribed → Extracted 6 fields, then **wait** ("Approve & sync to CRM"). Phase 2: Scored → Follow-up drafted, then **wait** ("Approve follow-up"). Phase 3: ICP updated → Found 10 leads → Outreach drafted. Nothing is ever sent; approvals say "nothing is sent from Slipstream". No-show stops after step 1; lost skips leads.

## Engineering
- Next 16 App Router, React 19, TS strict, Tailwind v4, lucide. Glide Data Grid via `dynamic(ssr:false)` (Leads only).
- Store: `lib/store.ts` (`useSyncExternalStore`). Runs: `lib/useRun.ts` emits `{ stepId, status, progress, note }` events on timers, the shape a real SSE stream will carry.
- `npx tsc --noEmit` and `npm run lint` must be clean; no console errors; every route has `loading.tsx`; bad ids render not-found.
- Commit locally after each milestone (`git add -A && git commit -m "..."`); a post-commit hook pushes to the team branch. Never edit `.git/hooks`, never push manually, never touch `~/Desktop/slipstream`.
