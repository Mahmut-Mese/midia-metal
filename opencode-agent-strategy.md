# OpenCode Multi-Provider Sub-Agent Strategy
## Reusable Template for Large-Scale Frontend Framework Migrations

> Created for the Midia Metal project: React SPA → Astro + React Islands migration.
> Applicable to any framework migration (Next.js, Nuxt, SvelteKit, etc.)

---

## 1. Philosophy

1. **Do expensive thinking ONCE** — create patterns and reference implementations with the smartest model
2. **Replicate patterns with cheap/free models** — bulk work follows templates
3. **Never waste premium tokens on repetitive tasks** — if a task follows a pattern, use a free model
4. **Save 40% of premium quota as buffer** — unexpected issues always arise
5. **Review with mid-tier, not premium** — code review needs less reasoning than code generation

---

## 2. Provider Tier System

| Tier | Examples | Token Cost | Best Use Cases |
|------|----------|------------|----------------|
| **Tier 1 (Premium)** | GitHub Copilot (Claude Opus), Antigravity Opus | High / Limited daily | Architecture, state management design, complex integrations, payment/auth logic |
| **Tier 2 (Mid)** | Antigravity Gemini, ChatGPT Free, Copilot (smaller models) | Medium / Rate-limited | Code review, validation, second opinions on critical files |
| **Tier 3 (Free)** | OpenCode built-in free models | Unlimited | Bulk conversions, repetitive pattern work, builds, verification, simple component wiring |

### Important Notes
- **Antigravity with 1000 tokens/month**: Only useful for 3-15 focused exchanges. Reserve for reviewing the 3-4 most critical files.
- **ChatGPT Free Tier**: Best used by pasting diffs/code for review. No project context needed.
- **GitHub Copilot**: Context window is not huge — give focused, specific prompts. Don't paste entire files unnecessarily.

---

## 3. Agent Architecture

### Agent 1: "Architect" (Tier 1 — Premium)
- **Role**: Master planner and orchestrator
- **Responsibilities**:
  - Design project structure and configuration
  - Create ONE reference conversion per file type (static page, interactive page, layout, island)
  - Design state management migration (e.g., Context → Nanostores)
  - Handle payment/auth integration
  - Review critical code from other agents
- **Budget**: ~40-50% of premium quota
- **Key Rule**: Every pattern this agent creates becomes a template for Agent 2

### Agent 2: "Bulk Converter" (Tier 3 — Free)
- **Role**: Pattern follower for repetitive conversions
- **Responsibilities**:
  - Convert static/semi-static pages following reference templates
  - Convert layout components
  - Create simple Astro wrappers for React islands
- **Budget**: Unlimited
- **Key Rule**: ALWAYS give this agent the reference conversion as context + explicit step-by-step instructions

### Agent 3: "Interactive Builder" (Tier 3 + Tier 1 review)
- **Role**: Handle complex interactive components
- **Responsibilities**:
  - Free model does first pass on interactive pages
  - Premium model reviews and fixes only what free model gets wrong
- **Budget**: Unlimited free + ~20-30% premium for review
- **Key Rule**: Free model attempt first, premium fixes only

### Agent 4: "Critical Reviewer" (Tier 2 — Mid)
- **Role**: Review only the most important 3-5 files
- **Responsibilities**:
  - Review state management migration
  - Review payment/checkout flow
  - Review auth/security-critical code
- **Budget**: 3-5 exchanges maximum
- **Key Rule**: Only review files where bugs would cost money or break security

### Agent 5: "Verifier" (Tier 3 — Free)
- **Role**: Build and verify everything works
- **Responsibilities**:
  - Run builds, fix build errors
  - Verify routes load correctly
  - Check that interactive elements work
- **Budget**: Unlimited
- **Key Rule**: This is manual verification, NOT writing automated tests

---

## 4. Execution Flow Template

```
Phase 1: SETUP (Premium — Agent 1)
  ├── Initialize new framework project
  ├── Configure build tools, CSS, path aliases
  ├── Design and implement state management migration
  └── Create reference conversions (1 per file type)

Phase 2: BULK CONVERSION (Free — Agent 2)
  ├── Convert all static/simple pages following patterns
  ├── Convert layout components
  └── Handle SEO/meta tags migration

Phase 3: INTERACTIVE MIGRATION (Free + Premium Review — Agent 3)
  ├── Free model: first pass on interactive pages
  ├── Premium: review complex logic (payments, auth, state)
  └── Free model: wire up simple islands

Phase 4: CRITICAL REVIEW (Mid-tier — Agent 4)
  └── Review 3-5 most critical files only

Phase 5: VERIFY & CLEANUP (Free — Agent 5)
  ├── Build project, fix errors
  ├── Verify all routes
  ├── Remove old framework files
  └── Update package.json scripts

Phase 6: FINAL CHECK (Premium — Agent 1)
  └── Final integration review, deployment config
```

---

## 5. Token Budget Template

| Phase | Provider Tier | Budget Allocation |
|-------|--------------|-------------------|
| Phase 1 | Premium | 30-40% of daily quota |
| Phase 2 | Free | Unlimited |
| Phase 3 | Free + Premium | Unlimited free + 20-30% premium |
| Phase 4 | Mid-tier | 3-5 exchanges |
| Phase 5 | Free | Unlimited |
| Phase 6 | Premium | 10-15% of daily quota |
| **Buffer** | Premium | 20-40% saved for issues |

---

## 6. Prompt Templates for Sub-Agents

### Template for Agent 2 (Bulk Converter)

```
You are converting React pages to Astro pages.

REFERENCE CONVERSION (follow this exact pattern):
[Paste the reference .astro file here]

ORIGINAL REACT FILE:
[Paste the React .tsx file here]

RULES:
1. Follow the reference conversion pattern exactly
2. Move data fetching to the Astro frontmatter (top section between ---)
3. Replace React JSX with Astro template syntax
4. Replace react-router Link with <a href="...">
5. Replace useEffect/useState data fetching with top-level await fetch()
6. Keep the same Tailwind classes
7. Import the shared Layout component
8. Set proper <title> and meta tags in the Astro head
```

### Template for Agent 3 (Interactive Builder — First Pass)

```
You are wrapping a React component as an Astro island.

REFERENCE PATTERN:
[Paste the reference island .astro wrapper]

ORIGINAL REACT COMPONENT:
[Paste the .tsx file]

RULES:
1. Create an .astro file that imports the React component
2. Use client:load for immediately needed interactivity
3. Use client:visible for below-the-fold content
4. Use client:idle for non-critical interactivity (cookie banners, etc.)
5. Replace useContext calls with nanostores imports
6. Keep the React component mostly unchanged — just swap context for stores
```

### Template for Agent 4 (Critical Reviewer)

```
Review this code for:
1. State synchronization issues between Astro islands
2. Missing error handling
3. Security issues (XSS, CSRF, auth bypass)
4. Hydration mismatches
5. Memory leaks (event listeners, intervals not cleaned up)

FILE TO REVIEW:
[Paste the file]
```

---

## 7. Decision Framework: What Goes Where

### Convert to Astro (.astro files)
- Pages with mostly static content
- Pages that fetch data once and render (no user interaction)
- Layout components (Header, Footer)
- SEO meta tags (Astro handles these natively)
- Legal/info pages (Privacy, Terms, FAQ, About)

### Keep as React Islands (client:load/visible/idle)
- Forms (Contact, Login, Register, Checkout)
- Shopping cart operations
- Payment processing (Stripe, PayPal)
- Search/filtering interfaces
- Components with shared state (cart badge, wishlist buttons)
- Admin panels (mount as full React SPA)

### Decision Checklist
- [ ] Does the page use useState/useEffect for user interaction? → React Island
- [ ] Does the page only fetch data and display it? → Astro page
- [ ] Does the page use shared state (cart, auth, wishlist)? → React Island
- [ ] Is it an admin page? → Keep as React SPA
- [ ] Does it handle money (payments)? → React Island + Premium review
- [ ] Is it a legal/static info page? → Astro page

---

## 8. Common Pitfalls

1. **React islands don't share context** — Use nanostores or similar for cross-island state
2. **Hydration mismatches** — Ensure server-rendered HTML matches client React output
3. **client:only="react"** — Use this for components that can't render on server (localStorage, window)
4. **API proxy** — Must be configured in astro.config.mjs, not just vite.config
5. **react-router-dom** — Only works inside React islands, not in Astro pages. Use `<a>` for Astro navigation
6. **CSS imports** — Astro handles CSS differently. Global styles go in layout, component styles use Astro scoped styles
7. **Environment variables** — Astro uses `import.meta.env.PUBLIC_*` instead of `VITE_*`

---

## 9. Quality Gates

Before moving to the next phase, verify:

| Gate | Check |
|------|-------|
| Phase 1 → 2 | Reference conversions build and render correctly |
| Phase 2 → 3 | All static pages build, routes work, styles match |
| Phase 3 → 4 | Interactive pages load, forms submit, state updates |
| Phase 4 → 5 | Critical reviewer found no blocking issues |
| Phase 5 → Done | Full build succeeds, all routes work, no console errors |

---

## 10. Adapting This Strategy

This strategy works for any migration. Replace:
- "Astro" → target framework (Next.js, Nuxt, SvelteKit)
- "React Islands" → framework's partial hydration mechanism
- "Nanostores" → framework's recommended state solution
- ".astro files" → framework's page format (.vue, .svelte, etc.)

The agent architecture and token optimization principles remain the same regardless of the specific frameworks involved.
