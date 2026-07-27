name: SmartHire AI - Terminal Dark
colors:
  bg: '#0d0d12'
  card: '#13131a'
  panel: '#1a1a24'
  line: '#252535'
  line-2: '#2e2e42'
  text: '#e4e1e9'
  text-muted: '#8b8b99'
  blue: '#00c8ff'
  blue-bg: '#001f2a'
  green: '#00e87a'
  green-bg: '#001f12'
  yellow: '#f5e100'
  yellow-bg: '#1f1d00'
  red: '#ff4d4d'
  red-bg: '#1f0808'
typography:
  heading:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    transform: uppercase
    letterSpacing: 0.06em
  h1:
    fontSize: 22px
    fontWeight: '600'
  h2:
    fontSize: 13px
    fontWeight: '600'
    letterSpacing: 0.08em
    color: text-muted
  body:
    fontFamily: system-ui, -apple-system, 'Segoe UI', sans-serif
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 1.5
  mono:
    fontFamily: 'JetBrains Mono', ui-monospace, monospace
    usage: numbers, dates, IDs, form inputs, status chips
rounded:
  DEFAULT: 6px
  full: 9999px
spacing:
  container-max: 1200px
  page-padding: 24px
  card-padding: 16px
  grid-gap: 16px

# SmartHire AI — Terminal Dark

## Brand & style

SmartHire AI is an AI-powered mock interview and candidate assessment platform. The interface
reads as a technical, no-nonsense operator console: a near-black background, uppercase
system-font headings, and JetBrains Mono reserved for anything numeric or IDlike (scores, dates,
timestamps). There is no display typeface and no icon font — buttons and labels are plain text,
and the whole system is one hand-written stylesheet with no CSS framework.

This replaces an earlier "Developer Dark" direction that used Bebas Neue headlines, a
Material3-style token set, and a wider neon palette (blue / purple / green / yellow). That
palette is gone; **`blue` is now the only accent used for actions, links, and data** — green,
yellow and red are reserved for status meaning only (success, warning, error/recording), never
for decoration.

## Colors

Six neutrals, four semantic accents. Every accent pairs a bright value with a near-black `-bg`
tone for use as a badge fill.

| Token | Hex | Use |
| :--- | :--- | :--- |
| `--bg` | `#0d0d12` | Page background |
| `--card` | `#13131a` | Cards, the topbar |
| `--panel` | `#1a1a24` | Nested surfaces (bars, choice buttons, dev switcher) |
| `--line` / `--line-2` | `#252535` / `#2e2e42` | Card borders / input & interactive borders |
| `--tx` / `--tx-2` | `#e4e1e9` / `#8b8b99` | Primary text / muted text |
| `--blue` | `#00c8ff` | The only accent: primary buttons, links, active nav, data values, focus ring |
| `--green` | `#00e87a` | Success only (badge-ok, brand mark, deltas trending up) |
| `--yellow` | `#f5e100` | Warning only (badge-warn) |
| `--red` | `#ff4d4d` | Destructive / recording / error only (badge-bad, logout hover) |

## Typography

No display font. Headings are the system sans stack, uppercase, with letter-spacing — this reads
as "technical" without loading a webfont for it. JetBrains Mono is the only loaded font
(`index.html`), used only where a value is numeric or ID-like: scores, dates, durations, table
numeric columns, mono-labelled badges, and every form input's typed value.

| Role | Spec |
| :--- | :--- |
| `h1` (page title) | System sans, 22px / 600, uppercase, 0.06em tracking |
| `h2` (card title) | System sans, 13px / 600, uppercase, 0.08em tracking, muted color |
| Body | System sans, 14px / 400, 1.5 line-height |
| `.muted` | 13px, muted color |
| `.label` (form labels) | 11px / 600, uppercase, 0.08em tracking, muted |
| `.mono` / `.num` / form inputs | JetBrains Mono, 12px |

## Layout & spacing

No fixed 8px grid — spacing is defined per-component in `index.css` rather than as scale tokens.
Page content sits in `.container` (max-width 1200px, 24px padding). Cards use 16px internal
padding; grids (`.grid.cols-2/3/4`) use a 16px gap and collapse to fewer columns under 860px, then
1 column under 480px for `.cols-4`.

## Shape & elevation

One border radius throughout: **6px** (`--radius`), applied to cards, buttons, inputs, badges'
outer shape is 3px. Depth comes from a single background step (`--bg` → `--card` → `--panel`) plus
a 1px border — no shadows, no glow effects.

## Components

The full component vocabulary is documented in `frontend/README` conventions and lives entirely
in `frontend/src/index.css` (~820 lines, one file, no build plugin). Reference these class names
rather than writing new CSS or inline styles:

| Class | Purpose |
| :--- | :--- |
| `.topbar` / `.nav` / `.brand` | App shell header, present on every authenticated page via `AppLayout` |
| `.container` / `.page-head` | Page content wrapper and title/subtitle/action row (`PageHead`) |
| `.card` / `.card-narrow` | Bordered content panel; narrow variant centers a single-column form |
| `.tile` | Clickable capability card (dashboard shortcuts) |
| `.stat` | Big-number metric tile |
| `.btn` / `.btn-primary` / `.btn-danger` / `.btn-block` | Buttons — `.btn` alone is secondary style |
| `.field` / `.label` / `.choices` / `.choice` | Form row, label, and segmented toggle group |
| `.table` (inside `.scroll-x`) | Data table that scrolls instead of squashing on narrow screens |
| `.badge` + tone suffix (`-ok` `-info` `-warn` `-bad` `-muted`) | Status chip |
| `.meter` / `.bar` | Labelled score bar |
| `.chart` | Column chart (bar heights set in px per-datum) |
| `.row` / `.cell` / `.avatar` | List row with divider, and inline avatar+label |
| `.note` / `.quote` / `.drop` / `.tags` | Callout, question block, file drop zone, chip list |
| `.center` / `.box` | Centered single-column page shell (landing, login, register, 404, settings) |

## App structure

Pages live under `frontend/src/pages/`. Public pages sit at the root; role-gated pages are
grouped into one folder per role:

- **root** — `Landing`, `Login`, `Register`, `NotFound` (public, no role required)
- **`candidate/`** — `CandidateDashboard`, `ResumeUpload`, `InterviewSetup`, `LiveSession`,
  `InterviewResults`, `InterviewHistory`, `Analytics`, `Candidatesetting` (account settings)
- **`recruiter/`** — `RecruiterDashboard`, `RecruiterAnalytics`, `CandidateReports`,
  `CompareCandidates`, `InterviewTemplates`, `SessionMonitor`
- **`admin/`** — `AdminDashboard`, `ManageUsers`, `CreateRecruiter`, `PlatformSettings`,
  `SystemActivity`, `AiConfig`, `PlatformAnalytics`

Outside `pages/` there are only four folders, each with a single clear job: `components/`
(`AppLayout`, `PageHead`, `ProtectedRoute`, `DevScreenSwitcher`), `context/` (`AuthContext`),
`lib/` (`report.js`), and the root files `App.jsx`, `main.jsx`, `index.css`.

Every route is guarded by `ProtectedRoute` per role (`components/ProtectedRoute.jsx`) and every
authenticated page is wrapped in `AppLayout`, which renders the topbar/nav for the signed-in
user's role only. `/settings` is candidate-only for now — the avatar in the topbar only links
there when `role === 'candidate'`; recruiter and admin show a plain (non-linking) avatar until
their own settings pages exist.

## Current state — mid-redesign

Most feature pages (`Analytics`, `AiConfig`, `CandidateReports`, `CompareCandidates`,
`InterviewTemplates`, `SessionMonitor`, `RecruiterAnalytics`, `ManageUsers`, `InterviewHistory`,
`PlatformAnalytics`, `PlatformSettings`, `SystemActivity`) have been intentionally trimmed down
to a bare `AppLayout` + `PageHead` shell — title and subtitle only, no mock data or content. This
is deliberate scaffolding, not a bug: the surrounding structure (routes, nav, layout, guards,
CSS vocabulary) is in place so each page can be redesigned and rebuilt independently without
touching anything else. `CandidateDashboard`, `Login`, `Register`, `Landing`, `InterviewSetup`,
`LiveSession`, `InterviewResults`, `ResumeUpload`, `CreateRecruiter`, `AdminDashboard`,
`RecruiterDashboard` and `Candidatesetting` still carry their full content.
