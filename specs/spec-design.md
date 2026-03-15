# spec-design.md — BidBoard Design System

## Design Philosophy

BidBoard is a tool for making confident, high-stakes decisions. The design should feel like a well-organized workspace — calm, clear, and professional. Every visual choice should reduce cognitive load, not add to it. Users are comparing contractors, reviewing bids, and coordinating with family members. The UI should get out of the way and let the data speak.

**North star references:** Linear, Notion
**Mood:** Calm, organized, trustworthy, professional
**Mode:** Light only

---

## Core Aesthetic Principles

1. **Whitespace is a feature** — generous padding and breathing room between elements. Never crowd the UI.
2. **Hierarchy through weight, not decoration** — use font weight and size to establish importance. Avoid heavy use of color to convey hierarchy.
3. **Subtle everything** — borders are faint, shadows are light, radius is small. Nothing should feel loud.
4. **Data-forward** — numbers, contractor names, and bid amounts are the heroes. Typography and layout should frame them, not compete with them.
5. **Consistent density** — desktop-first, comfortably dense but never cramped. Think a well-designed spreadsheet, not a marketing page.

---

## Color System

### Palette

| Token | Tailwind | Hex | Usage |
|---|---|---|---|
| `color-bg` | `zinc-50` | `#fafafa` | Page background |
| `color-surface` | `white` | `#ffffff` | Cards, panels, modals |
| `color-surface-subtle` | `zinc-100` | `#f4f4f5` | Hover states, secondary surfaces |
| `color-border` | `zinc-200` | `#e4e4e7` | All borders and dividers |
| `color-border-strong` | `zinc-300` | `#d4d4d8` | Focused inputs, emphasized dividers |
| `color-text-primary` | `zinc-900` | `#18181b` | Headings, primary content |
| `color-text-secondary` | `zinc-600` | `#52525b` | Subtext, labels, metadata |
| `color-text-muted` | `zinc-400` | `#a1a1aa` | Placeholder text, disabled states |
| `color-accent` | `indigo-600` | `#4f46e5` | Primary actions, active states, links |
| `color-accent-hover` | `indigo-700` | `#4338ca` | Hover on primary accent |
| `color-accent-subtle` | `indigo-50` | `#eef2ff` | Accent backgrounds, AI panels |
| `color-accent-border` | `indigo-200` | `#c7d2fe` | Accent-tinted borders |
| `color-success` | `emerald-600` | `#059669` | Accepted status, positive indicators |
| `color-success-subtle` | `emerald-50` | `#ecfdf5` | Success backgrounds |
| `color-warning` | `amber-500` | `#f59e0b` | Pending status, expiry warnings |
| `color-warning-subtle` | `amber-50` | `#fffbeb` | Warning backgrounds |
| `color-danger` | `red-500` | `#ef4444` | Rejected status, red flags, errors |
| `color-danger-subtle` | `red-50` | `#fef2f2` | Danger backgrounds |

### Color Usage Rules

- **Never use accent color for decorative purposes** — only for interactive elements (buttons, links, active tabs) and AI-generated content panels
- **Backgrounds should be mostly white and zinc-50** — color appears in accents and status indicators only
- **Status colors are always paired** — use the subtle background with the main color (e.g. `emerald-50` bg + `emerald-600` text for accepted badges)
- **No gradients** — flat colors only throughout the app

---

## Typography

### Font Stack

**Primary font:** `Geist` (Vercel's typeface — clean, modern, excellent at small sizes for data)
**Fallback:** `system-ui, -apple-system, sans-serif`

```css
font-family: 'Geist', system-ui, -apple-system, sans-serif;
```

Import via: `npm install geist` and configure in `layout.tsx` using the `GeistSans` variable font.

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `text-display` | 24px / 1.5rem | 600 | 1.3 | Page titles |
| `text-heading` | 18px / 1.125rem | 600 | 1.4 | Section headings, card titles |
| `text-subheading` | 15px / 0.9375rem | 500 | 1.4 | Sub-section labels, tab labels |
| `text-body` | 14px / 0.875rem | 400 | 1.6 | Body copy, descriptions |
| `text-body-medium` | 14px / 0.875rem | 500 | 1.6 | Emphasized body, labels |
| `text-small` | 13px / 0.8125rem | 400 | 1.5 | Metadata, timestamps, captions |
| `text-small-medium` | 13px / 0.8125rem | 500 | 1.5 | Badge text, status labels |
| `text-mono` | 13px / 0.8125rem | 400 | 1.5 | Code, license numbers, IDs |
| `text-data` | 20px / 1.25rem | 600 | 1.2 | Bid prices, key numbers |

### Typography Rules

- **Body text is 14px** — this is a dense data app, not a marketing site
- **Bid prices and key numbers use `text-data`** — they should always stand out
- **Labels are always `text-small-medium`** — consistent sizing for all form labels, column headers
- **Never use font sizes below 12px**
- **Line-height 1.6 for all body copy** — improves readability in data-dense layouts

---

## Spacing System

Use Tailwind's default spacing scale. Key values:

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Tight internal padding (badges, chips) |
| `space-2` | 8px | Icon gaps, tight component spacing |
| `space-3` | 12px | Input padding, compact list items |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Card padding (mobile) |
| `space-6` | 24px | Card padding (desktop), section spacing |
| `space-8` | 32px | Between major sections |
| `space-12` | 48px | Page-level vertical spacing |

### Spacing Rules

- **Cards always use `p-6`** on desktop
- **Page content max-width is `max-w-7xl` with `px-6`** horizontal padding
- **Section gaps use `gap-6` or `gap-8`** in grid/flex layouts
- **Form fields have `gap-4`** between fields, `gap-6` between field groups

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded` | 4px | Badges, chips, small elements |
| `rounded-md` | 6px | Buttons, inputs, tags |
| `rounded-lg` | 8px | Cards, panels, dropdowns, modals |
| `rounded-xl` | 12px | Large modals, sheet panels |

### Radius Rules

- **All cards use `rounded-lg`** (8px) — the signature radius of the app
- **All buttons and inputs use `rounded-md`** (6px)
- **Never use `rounded-full` on non-circular elements** (avatars only)
- **Consistent radius throughout** — do not mix large and small radius on related components

---

## Shadows & Elevation

BidBoard uses minimal, subtle shadows. The goal is depth, not drama.

| Token | Tailwind | Usage |
|---|---|---|
| `shadow-none` | — | Flat elements, table rows |
| `shadow-xs` | `shadow-sm` with opacity 50% | Subtle card lift |
| `shadow-card` | `shadow-sm` | Standard card shadow |
| `shadow-elevated` | `shadow-md` | Dropdowns, floating elements |
| `shadow-overlay` | `shadow-xl` | Modals, dialogs |

```css
/* Custom shadow tokens in globals.css */
--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
--shadow-elevated: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
--shadow-overlay: 0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08);
```

### Shadow Rules

- **Cards always have `shadow-card`** — never completely flat, never heavy
- **No colored shadows** — always black with low opacity
- **Hover state on interactive cards:** slight shadow increase + `translate-y-[-1px]` transition

---

## Component Specifications

### Buttons

Three variants only:

**Primary**
```
bg-indigo-600, text-white, hover:bg-indigo-700
h-9, px-4, rounded-md, text-sm font-medium
transition-colors duration-150
```

**Secondary**
```
bg-white, text-zinc-700, border border-zinc-200
hover:bg-zinc-50, hover:border-zinc-300
h-9, px-4, rounded-md, text-sm font-medium
```

**Ghost**
```
bg-transparent, text-zinc-600
hover:bg-zinc-100, hover:text-zinc-900
h-9, px-3, rounded-md, text-sm font-medium
```

**Destructive**
```
bg-white, text-red-600, border border-red-200
hover:bg-red-50
h-9, px-4, rounded-md, text-sm font-medium
```

- **Icon buttons** use `h-8 w-8` with `rounded-md`
- **No large/jumbo buttons** — `h-9` is the standard, `h-8` for compact contexts
- **Loading state:** replace label with a spinner, keep button width stable

---

### Cards

Standard card pattern used throughout:

```
bg-white rounded-lg border border-zinc-200 shadow-card p-6
```

**Interactive card (bid cards):**
```
+ hover:border-zinc-300 hover:shadow-elevated
+ transition-all duration-150 cursor-pointer
```

**Selected/active card:**
```
+ border-indigo-300 ring-1 ring-indigo-200
```

---

### Inputs & Form Fields

```
h-9, px-3, rounded-md
bg-white, border border-zinc-200, text-sm text-zinc-900
placeholder:text-zinc-400
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
transition-shadow duration-150
```

**Textarea:**
Same as input but `min-h-[80px] py-2`, no fixed height.

**Labels:**
```
text-sm font-medium text-zinc-700, mb-1.5
```

**Helper text:**
```
text-xs text-zinc-500, mt-1.5
```

**Error state:**
```
border-red-400 focus:ring-red-400
+ error message: text-xs text-red-600 mt-1.5
```

---

### Status Badges

Always use the `<StatusBadge>` component. Three bid statuses:

**Pending**
```
bg-amber-50 text-amber-700 border border-amber-200
```

**Accepted**
```
bg-emerald-50 text-emerald-700 border border-emerald-200
```

**Rejected**
```
bg-red-50 text-red-600 border border-red-200
```

**Collaborator invite status:**

**Accepted** → same as above
**Pending** → same amber as above

All badges:
```
inline-flex items-center px-2 py-0.5
rounded text-xs font-medium
```

---

### Navigation & Layout

**Top Navbar:**
```
bg-white border-b border-zinc-200 h-14
px-6 flex items-center justify-between
sticky top-0 z-40
```

- Logo/wordmark on the left: `text-base font-semibold text-zinc-900`
- Nav items (if any): `text-sm text-zinc-600 hover:text-zinc-900`
- Right side: notifications bell + user avatar

**Page Layout:**
```
min-h-screen bg-zinc-50
max-w-7xl mx-auto px-6 py-8
```

**Tab Navigation (project view):**
```
border-b border-zinc-200 flex gap-1 mb-6
```

Tab item:
```
px-4 py-2.5 text-sm font-medium rounded-t-md
inactive: text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100
active: text-indigo-600 border-b-2 border-indigo-600 bg-transparent
```

---

### AI Analysis Panel

The AI panel has a distinct visual treatment to signal it's AI-generated content:

```
bg-indigo-50 border border-indigo-100 rounded-lg p-6
```

Header:
```
flex items-center gap-2 mb-4
Sparkles icon: text-indigo-500, h-4 w-4
Label: text-sm font-semibold text-indigo-900
```

Summary text:
```
text-sm text-indigo-900 leading-relaxed
```

Per-bid section divider:
```
border-t border-indigo-100 pt-4 mt-4
```

Red flags: `text-amber-700` with a `⚠` icon
Questions: `text-indigo-700` with a `?` icon
Highlights: `text-emerald-700` with a `✓` icon

---

### Comments & Messages

**Comment bubble (others):**
```
bg-zinc-100 rounded-lg rounded-tl-sm px-3 py-2
text-sm text-zinc-900
```

**Comment bubble (current user):**
```
bg-indigo-600 rounded-lg rounded-tr-sm px-3 py-2
text-sm text-white
```

**Message thread (project level) — chat style:**
- Current user messages right-aligned with indigo bubble
- Other users left-aligned with zinc bubble
- Avatar + name above first message in a sequence
- Timestamp in `text-xs text-zinc-400` below bubble

---

### Contractor Card

```
bg-white border border-zinc-200 rounded-lg p-4
```

Google rating display:
```
text-amber-500 filled star icons (h-3.5 w-3.5)
text-sm font-semibold text-zinc-900 (the number)
text-xs text-zinc-500 (review count)
```

License status indicators:
- Active: `text-emerald-600` + check icon
- Expired/Suspended: `text-red-500` + x icon
- Unknown: `text-zinc-400` + dash icon

---

## Iconography

Use **Lucide React** exclusively (`lucide-react` — already in the shadcn/ui stack).

**Icon sizing:**
| Context | Size |
|---|---|
| Inline with text | `h-4 w-4` |
| Button icons | `h-4 w-4` |
| Section icons | `h-5 w-5` |
| Empty state icons | `h-10 w-10 text-zinc-300` |
| Nav icons | `h-5 w-5` |

**Icon color:** Always inherit from text color or use explicit `text-zinc-*` / `text-indigo-*`. Never hardcode hex in icon props.

**Key icons used:**
| Element | Icon |
|---|---|
| Projects | `FolderOpen` |
| Bids | `FileText` |
| Add bid | `Plus` |
| Contractor | `Building2` |
| AI analysis | `Sparkles` |
| Comments | `MessageSquare` |
| Messages | `MessageCircle` |
| Collaborators | `Users` |
| Notifications | `Bell` |
| Settings | `Settings` |
| Archive | `Archive` |
| Accepted | `CheckCircle2` |
| Rejected | `XCircle` |
| Pending | `Clock` |
| Warning/flag | `AlertTriangle` |
| Document | `Paperclip` |
| Star/rating | `Star` |
| License | `ShieldCheck` |

---

## Motion & Transitions

Subtle and functional — never decorative for its own sake.

**Standard transition:**
```css
transition-colors duration-150 ease-in-out
```

**Interactive element hover (cards, rows):**
```css
transition-all duration-150 ease-in-out
```

**Modal/dialog enter:**
```css
animate-in fade-in-0 zoom-in-95 duration-200
```

**Slide-over panel enter:**
```css
animate-in slide-in-from-right duration-300
```

**No bounce, spring, or elastic animations** — this is a professional tool, not a consumer app.

---

## Empty States

Every list or data view needs an empty state. Standard pattern:

```
flex flex-col items-center justify-center py-16 text-center
[Large icon: h-10 w-10 text-zinc-300]
[Heading: text-sm font-medium text-zinc-900 mt-4]
[Subtext: text-sm text-zinc-500 mt-1 max-w-xs]
[CTA button: mt-6 — Primary or Secondary depending on context]
```

Example — no bids yet:
- Icon: `FileText`
- Heading: "No bids yet"
- Subtext: "Add your first bid to start comparing contractors"
- CTA: "Add Bid" (Primary button)

---

## Loading States

**Skeleton loading** for all data-fetched content. Use `animate-pulse` with:
```
bg-zinc-200 rounded
```

Match skeleton shape and size to the actual content it replaces. Never use a spinner for full-page loads — only for inline button actions.

**Inline button loading:**
```
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## Data Tables (Comparison View)

```
w-full text-sm border-collapse
```

**Header row:**
```
bg-zinc-50 border-b border-zinc-200
th: px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide
```

**Body rows:**
```
border-b border-zinc-100
td: px-4 py-3 text-sm text-zinc-900
hover:bg-zinc-50
```

**Color coding (comparison table):**
- Lowest value in row: `bg-emerald-50 text-emerald-800 font-medium`
- Highest value in row: `bg-red-50 text-red-700`
- Missing value: `text-zinc-300` em-dash

---

## Responsive Breakpoints

Desktop-first. Supported breakpoints:

| Breakpoint | Width | Notes |
|---|---|---|
| `sm` | 640px | Mobile adjustments |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop (primary target) |
| `xl` | 1280px | Wide desktop |

**Two-column layouts** (bid detail) collapse to single column below `lg`.
**Comparison table** becomes horizontally scrollable below `md`.
**Card grids** collapse from 3 → 2 → 1 column as screen narrows.

---

## Accessibility

- All interactive elements must have visible focus rings: `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`
- Color is never the sole indicator of meaning — always pair with text or icon
- All icons that convey meaning must have `aria-label` or accompanying visible text
- Form inputs always have associated `<label>` elements — no placeholder-only labels
- Minimum touch target size: `h-9` (36px) for all interactive elements
- Contrast ratio minimum 4.5:1 for all body text

---

## What NOT to Do

- No purple gradients, hero gradients, or decorative gradients anywhere
- No heavy drop shadows — keep them subtle and consistent
- No mixed border radiuses on related components
- No `font-bold` on body copy — use `font-medium` for emphasis
- No colored page backgrounds — `zinc-50` only
- No full-width buttons except on mobile
- No animations exceeding 300ms
- No more than 3 font sizes in any single component
- No decorative dividers — use whitespace instead
- Do not use `text-black` — always use `text-zinc-900`
