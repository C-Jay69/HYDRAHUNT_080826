## HydraHunt Build Log

### Task 5 — Landing Page Component
- **File**: `src/components/landing/landing-page.tsx`
- Created the full landing page as a single `'use client'` component.
- **Nav Bar**: Sticky header with gradient HydraHunt logo, Features/Pricing scroll links, Login/Signup buttons (mobile hamburger menu included).
- **Hero Section**: Animated gradient headline (`gradient-text` class), subtext, two CTAs (`Enter the Hunt` → signup, `See Plans` → pricing), and a terminal-style hero graphic with scanlines, progress bars, status indicators, and animated fill bars.
- **Features Section**: 6 cards (Resume Forge, AI Payload Forge, Interview Drills, Kill List Tracker, Strike Analysis, Career Map) in responsive 3×2 grid using `card-hover` class for glow effects. Each card has icon, title, description.
- **Social Proof**: 3 stat counters (10,000+ Hunters, 50,000+ Payloads Generated, 92% Interview Success Rate) with IntersectionObserver-based count-up animation.
- **Pricing Teaser**: Brief section with `Choose Your Weapon` heading and CTA button.
- **Footer**: Sticky to bottom with `mt-auto`, logo, Features/Pricing/Contact links, copyright.
- Uses Framer Motion for scroll-triggered animations, Tailwind hydra theme colors, lucide-react icons, and `useAppStore` for navigation.
- Lint passed with zero errors.

### Task 6 — App Shell, Sidebar, Header, Dashboard
- **Files**:
  - `src/components/app/app-shell.tsx`
  - `src/components/app/sidebar.tsx`
  - `src/components/app/header.tsx`
  - `src/components/app/dashboard.tsx`

#### `sidebar.tsx`
- Collapsible left navigation sidebar (`'use client'`).
- 11 nav items (Dashboard, Kill List, Resume Forge, Payload Forge, Interview Drills, Strike Analysis, Version Vault, Mission Log, Career Map, Settings, Billing) each with lucide icon, calls `setView()`, active state highlighted with `bg-hydra-purple/10 text-hydra-purple`.
- Bottom section: user avatar circle (first letter of name/email), email, LogOut button calling `logout()`.
- Background `bg-sidebar (#080511)`, border-r `border-hydra-border`. Toggle button (ChevronLeft) rotates 180° when collapsed.
- Width: `w-64` expanded, `w-16` collapsed (icons only). Mobile: closes after navigation.

#### `header.tsx`
- Sticky top header bar (`'use client'`, h-14, `bg-hydra-surface/80 backdrop-blur-sm`, `border-b border-hydra-border`).
- Maps current view string to readable title (e.g. `'dashboard'` → `'Command Center'`).
- Search input (hidden on mobile, 64w on desktop), notification bell with pulsing purple dot.

#### `app-shell.tsx`
- Main logged-in layout wrapper (`'use client'`).
- Flex row: Sidebar (left, fixed width, full height) + main content area (flex-1, overflow-auto, `bg-grid`).
- On mobile (<md): sidebar is fixed/overlay with backdrop, toggled via hamburger Menu button. On desktop (md+): sidebar always visible with built-in collapse toggle.
- Main area: Header at top, children rendered below in padded scrollable container.

#### `dashboard.tsx`
- Command center dashboard (`'use client'`).
- Fetches `/api/job-targets` and `/api/resumes` (graceful fallback to demo data).
- 4 metric cards in responsive grid (2-col mobile, 4-col desktop): Total Targets (12), Active Payloads (8), Resume Score (87%), Interview Prep (3) — each with colored icon, value, label.
- Recent Activity card: 5 mock timestamped entries (e.g. 'Created resume — Senior PM', 'Generated payload for Acme Corp').
- Quick Actions card: 4 outline buttons (New Resume, Generate Payload, Start Interview, Add Target) each calling `setView` to the appropriate view.
- All cards use `card-hover` class. Staggered framer-motion entrance animations (`container`/`item` variants).
- Lint passed with zero errors.

### Task 7 — Kill List (Kanban Job Tracker)
- **Files**:
  - `src/components/features/kill-list.tsx`
  - `src/app/api/job-targets/route.ts`
  - `src/app/api/job-targets/[id]/route.ts`

#### `kill-list.tsx`
- `'use client'` Kanban-style job tracker with full drag-and-drop using `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities`.
- **6 Columns**: Intel Gathered (cyan), Target Acquired (purple), Payload Sent (green), Interview (yellow), Offer (emerald), Eliminated (red) — each with colored top border via `border-t-*` classes.
- **Metric Summary Cards** at top: Total Targets, In Pipeline, Interviews, Offers — computed from local state.
- **Search/Filter Bar**: Text search (company, role, location) with clear button + priority dropdown filter (all/low/medium/high/critical).
- **Add Target Dialog**: Opens via purple "Add Target" button. Form fields: company, role, salary range, location, priority (select), job URL, notes. Submits POST `/api/job-targets`.
- **Draggable Cards**: Each card shows company name (bold), role with Briefcase icon, salary (green dot), location with MapPin icon, job URL link, priority badge (low=gray, medium=yellow, high=orange, critical=red), and grip handle. Uses `useSortable` from `@dnd-kit/sortable`.
- **Cross-Column Drag**: `DndContext` with `closestCorners` collision detection. `onDragOver` moves cards between columns in local state. `onDragEnd` persists status change via PUT `/api/job-targets/[id]`.
- **Drag Overlay**: Custom `DragOverlay` renders a floating card preview with ring glow while dragging.
- **Framer Motion**: `container`/`item` staggered entrance animations for sections. `AnimatePresence` with `popLayout` mode for card enter/exit transitions in columns. `layout` prop for smooth reordering.
- **API Routes**:
  - `GET /api/job-targets` — Returns all job targets from Prisma, ordered by `createdAt` desc.
  - `POST /api/job-targets` — Creates new job target with demo user, defaults to `intel` status.
  - `PUT /api/job-targets/[id]` — Updates target fields (status, company, role, salary, location, priority, jobUrl, notes).
  - `DELETE /api/job-targets/[id]` — Deletes target.
- **Responsive**: Horizontal scroll on mobile for columns, `max-w-md` on search, 2-col metric grid on mobile → 4-col on desktop. Touch-friendly 44px targets.
- **Theming**: Columns use `bg-hydra-surface`, cards use `bg-hydra-surface-2` with `card-hover` class. Custom scrollbar via `custom-scrollbar`. Empty column states shown.
- **Exports**: Default export. Imports `useAppStore` (available but used minimally).
- Lint passed with zero errors.

### Task 8 — Resume Forge (Resume List + Editor + Live Preview)
- **Files**:
  - `src/components/features/resume-forge.tsx`
  - `src/app/api/resumes/route.ts`
  - `src/app/api/resumes/[id]/route.ts`

#### `resume-forge.tsx`
- `'use client'` component with TWO views: **List View** and **Editor View**, switching based on `selectedResumeId` from `useAppStore`.

**List View** (`selectedResumeId` is null):
- Fetches resumes via `useQuery` on `GET /api/resumes`.
- Grid of resume cards (responsive 1/2/3 columns). Each card shows: title (with FileText icon), last updated date (Clock icon), ATS score badge (color-coded: green ≥70, purple ≥40, red <40), 'Default' badge (Star icon, cyan border) if `isDefault`.
- Hover effects via `card-hover` class, "Open →" text fades in.
- "New Resume" button (purple) opens a `Dialog` with title input. POST `/api/resumes` on submit, then auto-navigates to editor.
- Empty state with FileText icon and prompt text.
- Framer Motion staggered entrance animations.

**Editor View** (`selectedResumeId` is set):
- Split into `EditorView` (fetch wrapper) and `EditorContent` (editable state). `EditorView` uses `useQuery` to fetch `GET /api/resumes/[id]`, renders `EditorContent` with `key={resume.updatedAt}` so it remounts with fresh props after saves — avoids the `setState-in-effect` lint rule.
- **Top Bar**: Back button (ArrowLeft, calls `setSelectedResume(null)`), editable title `Input`, ATS score meter (`Progress` component with color-coded percentage label), Save button (manual save).
- **Split Pane** (`react-resizable-panels`): Left = Editor (55%, min 35%), Right = Live Preview (45%, min 25%). Custom resize handle with purple hover.

**Editor Panel** (left):
- Sections rendered in `DndContext` with `@dnd-kit/sortable` for drag reordering. Each section is a `SortableSectionCard` with grip handle at bottom.
- Each section is collapsible via `Collapsible`/`CollapsibleTrigger` (ChevronDown/ChevronRight icons). Section icon mapped by type (User, Briefcase, GraduationCap, Wrench, FolderKanban).
- **5 Section Types**:
  - **Summary**: Textarea, free-form text.
  - **Experience**: List of entries (company, role, startDate, endDate, bullets textarea — one per line). Add/Remove per entry.
  - **Education**: List of entries (school, degree, field, year). Add/Remove per entry.
  - **Skills**: Comma-separated tags with input + `+` button. Displayed as clickable `Badge` chips (click to remove).
  - **Projects**: List of entries (name, description, techStack, link). Add/Remove per entry.
- `AnimatePresence` with `layout` prop for smooth section reordering.

**Live Preview** (right):
- Styled dark resume card (`bg-[#0d0a16]` with border and shadow) that mirrors editor content in real-time.
- Sections rendered with purple accent lines, proper typography hierarchy (h1 title, h2 section headers with uppercase tracking, body text).
- Experience bullets rendered with `▹` prefix. Skills shown as chip badges. Projects show name, description, and tech stack.
- Empty state text when no content.

**Autosave**: Debounced 2 seconds after any change. Uses `useEffect` with `firstLoad` ref guard to skip the initial mount. Manual Save button also available.

**ATS Score**: Computed client-side heuristic (summary length, experience count, education count, skills count, project count, bullet count). Max 100.

#### API Routes
- `GET /api/resumes` — Returns all resumes with sections ordered by `sortOrder`, ordered by `updatedAt` desc.
- `POST /api/resumes` — Creates resume with title, auto-creates 5 default sections (summary, experience, education, skills, projects) with empty content and sequential `sortOrder`. Returns resume with sections.
- `GET /api/resumes/[id]` — Returns single resume with sections ordered by `sortOrder`.
- `PUT /api/resumes/[id]` — Updates title, summary, atsScore. If `sections` array provided, deletes existing sections and recreates them (upsert pattern for demo). Returns updated resume with sections.
- `DELETE /api/resumes/[id]` — Deletes resume.

#### Bug Fix
- Moved `@import url(...)` for Google Fonts to top of `globals.css` (before `@import "tailwindcss"`) to fix CSS parse error where `@import` must precede all rules.

- **Theming**: Full cyberpunk Hydra theme (`bg-hydra-surface-2`, `border-hydra-border`, `text-hydra-purple`, `text-hydra-cyan`, `text-hydra-muted`). Custom scrollbar via `custom-scrollbar`.
- **Responsive**: Grid cards adapt (1→2→3 columns), editor split pane is horizontal, touch-friendly 44px targets.
- **Imports**: shadcn Card, Input, Textarea, Button, Badge, Dialog, Progress, Collapsible, ResizablePanel*. lucide-react icons. framer-motion. @dnd-kit/core + sortable + utilities. @tanstack/react-query. `useAppStore` from `@/store/app-store`.
- Lint passed with zero errors.

### Task 9a — AI Payload Forge (Application Material Generator)
- **Files**:
  - `src/components/features/payload-forge.tsx`
  - `src/app/api/ai/generate-payload/route.ts`

#### `payload-forge.tsx`
- `'use client'` component — the AI Payload Forge for generating tailored application materials.
- **Layout**: Two-column on desktop (`lg:grid-cols-2`), stacked on mobile. Left = input form, Right = output panel.
- **Left Side (Input)**: Card with `Target Configuration` header (Target icon in cyan).
  - **Job Description**: Large `Textarea` (min-h-180px, max-h-320px, `custom-scrollbar`), required field with red asterisk.
  - **Company Name**: `Input` with cyberpunk placeholder ('CyberDyne Systems').
  - **Target Resume**: `Select` dropdown populated by fetching `GET /api/resumes`. Auto-selects default resume. Shows FileText icon, title, 'Default' badge (cyan) if applicable, and ATS score per item.
  - **Tone Select**: Dropdown with 4 options (Confident, Professional, Casual, Aggressive).
  - **Generate Payload Button**: Full-width, `bg-hydra-purple`, Zap icon. Disabled when job description empty, no resume selected, or generating.
  - **Loading State**: Animated `Loader2` spinner + 'Deploying payload...' text with `pulse-glow` class.
- **Right Side (Output)**: Card with 'Generated Payload' header and per-tab copy button (top-right corner).
  - **Empty State**: Centered Target icon (purple/50, circular purple bg), 'Generate a payload to see results' + helper text.
  - **Tabs**: 5 tabs — Summary (Sparkles icon), Cover Letter (FileText), Outreach Email (Mail), LinkedIn (Linkedin icon), Talking Points (MessageSquare). Tab icons hidden on mobile (text only), shown on sm+.
  - Each tab shows: streaming content via `ReactMarkdown` (styled with prose overrides for purple/cyan headers, purple bold), or 'Waiting in queue...' with spinner (when generating but not yet streaming to this tab), or 'No content generated' (after completion if empty).
  - **Streaming Cursor**: Animated purple bar (`animate-pulse`) appended after content while streaming.
  - **Tab Indicators**: Pulsing purple dot on the currently-streaming tab; green ✓ badge on completed tabs.
- **Streaming**: POSTs to `/api/ai/generate-payload` with `{ resumeId, jobDescription, company, tone }`. Reads response as `ReadableStream` via `getReader()`. Parses line-by-line for `---TAB:<name>` delimiters to route content to the correct tab. Auto-switches active tab to follow the stream. Supports abort via `AbortController`.
- **CopyButton**: Ghost button that copies current tab's text to clipboard, shows green Check icon for 2s on success.
- **Framer Motion**: `container`/`item` staggered entrance animations.
- **Imports**: useAppStore, motion (framer-motion), lucide-react icons (Zap, Target, Copy, Check, FileText, Mail, Linkedin, MessageSquare, Sparkles, Loader2), shadcn Card/Input/Textarea/Button/Badge/Tabs*/Select*/Label, ReactMarkdown.
- Default export.

#### `route.ts` (API)
- `POST /api/ai/generate-payload` — Accepts `{ resumeId, jobDescription, company, tone }`.
- Fetches resume with sections from Prisma. Formats resume sections (summary as text, experience/education/projects as key-value lines, skills as list).
- Builds a detailed system prompt instructing the AI to generate 5 sections separated by `---TAB:<key>` delimiters (summary, coverLetter, outreachEmail, linkedin, talkingPoints).
- Uses `z-ai-web-dev-sdk` (`ZAI.create()` → `zai.chat.completions.create()` with `stream: true`).
- Converts the AI async iterable stream to a `ReadableStream` and pipes back to the client as `text/plain` with no-cache headers.
- Error handling: 400 for missing fields, 404 for resume not found, 500 for generation failures.
- Lint passed with zero errors.

### Task 9b — Interview Drills (AI Interview Practice)
- **File**: `src/components/features/interview-drills.tsx`

#### `interview-drills.tsx`
- `'use client'` component with TWO views: **Session List** and **Active Session**, toggled via local `activeSessionId` state.
- **Framer Motion**: `AnimatePresence` with `mode="wait"` for crossfade transitions between list and session views. Staggered `container`/`item` entrance animations for list items.

**Session List View** (`activeSessionId` is null):
- Header with Swords icon (purple-tinted container) and "Interview Drills" title.
- **Session Type Filter**: Row of pill buttons — All, Behavioral, Technical, Role-Specific. Active pill gets `bg-hydra-purple/20` styling.
- **New Session**: Inline expandable card (no dialog) with animated `height` transition via `AnimatePresence`. Fields: type selector pills, role Input, company Input, Cancel/Start Session buttons. Submits `POST /api/interviews` with `{ type, role, company }`, then navigates to active session.
- **Sessions List**: Fetches `GET /api/interviews` on mount. Cards show: type badge (color-coded per type — cyan/purple/emerald borders), status badge (yellow for active, green for completed), role with Briefcase icon, company with Building2 icon, score with Trophy icon (if completed), date with Clock icon. Click opens session. Empty state with centered Swords icon.
- **Responsive**: Stack on mobile, side-by-side on sm+.

**Active Session View** (`activeSessionId` is set):
- **Top Bar**: Back button (ArrowLeft), session role + company, type badge, live timer (`formatDuration` helper: `MM:SS`), End Session button (red-themed, disabled when no messages or ending).
- **Chat Panel** (flex-1, fills available space):
  - `ScrollArea` with `custom-scrollbar` class.
  - Empty state: MessageSquare icon with "Session Ready" prompt.
  - Messages alternate: **User** (right-aligned, `bg-hydra-purple/20`, cyan avatar with "U"), **AI** (left-aligned, `bg-hydra-surface-2`, Swords icon in purple avatar).
  - AI messages rendered with `ReactMarkdown` and styled prose (purple headings, cyan code, dark pre blocks).
  - User messages use `whitespace-pre-wrap` for plain text.
  - Each message has a motion entrance animation.
  - Typing indicator: three bouncing purple dots when AI is generating.
  - Auto-scrolls to bottom on new messages via `messagesEndRef`.
- **Input Area**: `Textarea` (auto-resizing via `onInput` height adjustment, max 128px) + Send button. Enter sends, Shift+Enter inserts newline. Disabled while sending.
- **Chat API**: Sends `POST /api/interviews/[sessionId]/chat` with `{ message, history }`. Updates `liveScore` from response `score` or `accumulatedScore` fields.
- **Score Panel** (right sidebar, `hidden lg:flex`, 256-288px):
  - **Session Score**: Large numeric display with `glow-text-purple` class, "/40" label.
  - **Timer**: Monospace cyan display.
  - **Score Breakdown** (appears when session ends): 4 categories — Communication, Technical Depth, Structure, Relevance — each with animated progress bar (green ≥70%, yellow ≥40%, red <40%), score label (`X/10`), and optional feedback text. Progress bars animate from 0% via Framer Motion.
  - **Session Info**: Type, message count, status badge.
- **Mobile Score Bar** (`lg:hidden`): Compact bottom bar showing Score, Time, and End button.
- **End Session**: Calls `PUT /api/interviews/[sessionId]` with `{ status: 'completed' }`. Populates score breakdown from response `scores` array. Stops timer.

**Imports**: shadcn Card, Button, Badge, Textarea, ScrollArea, Avatar, AvatarFallback, Input. lucide-react (Swords, Plus, ArrowLeft, Send, Clock, Loader2, Trophy, MessageSquare, Briefcase, Building2). framer-motion (motion, AnimatePresence). ReactMarkdown.
- Default export.
- Lint passed with zero errors.

### Task 9c — Strike Analysis (AI Resume Analysis)
- **Files**:
  - `src/components/features/strike-analysis.tsx`
  - `src/app/api/analyses/route.ts`
  - `src/app/api/analyses/[id]/route.ts`
  - `src/app/api/ai/analyze-resume/route.ts`

#### `strike-analysis.tsx`
- `'use client'` component with TWO views: **List View** and **Detail View**, switching based on `selectedAnalysisId` from `useAppStore`.
- **Framer Motion**: `AnimatePresence` for crossfade between views. Staggered `container`/`item` entrance animations for list cards. `detailContainer`/`detailItem` variants with stagger for analysis sections.

**List View** (`selectedAnalysisId` is null):
- **Header**: Target icon in purple-tinted container, "Strike Analysis" title with subtitle, purple "New Analysis" button (Plus icon).
- **New Analysis Dialog**: Opens via `Dialog`/`DialogTrigger`. Two fields: Resume Select (populated from `GET /api/resumes`, shows FileText icon, title, Default badge) and Target Role Input (placeholder "e.g. Senior Product Manager"). Submit button calls `POST /api/ai/analyze-resume` with `{ resumeId, targetRole }`. Loading state shows Loader2 spinner.
- **Analysis Cards**: Responsive 1/2/3 column grid. Each card shows: resume title (FileText icon), status badge (purple spinner for processing, green for completed, red for failed), target role (Crosshair icon), ATS score Badge (color-coded: green ≥80, yellow 60-79, red <60), date (Clock icon), chevron arrow for completed. Uses `card-hover` class. Clicking completed analysis calls `setSelectedAnalysis(id)`.
- **Polling**: When any analysis has `status: 'processing'`, polls `GET /api/analyses` every 4 seconds.
- **Loading State**: 3 skeleton pulse cards.
- **Empty State**: Centered Target icon (purple/50), "No Analyses Yet" text.

**Detail View** (`selectedAnalysisId` is set):
- **Back Button**: ArrowLeft, returns to list via `setSelectedAnalysis(null)`.
- **Header**: Resume title + target role + date.
- **ATS Score Circular Gauge**: SVG-based circular progress indicator (radius 70, strokeWidth 8) with animated `strokeDashoffset` via Framer Motion. Background track in `rgba(177,84,248,0.1)`. Progress arc colored by score (green/yellow/red). Centered large score number (text-5xl) with "out of 100" label. Wrapped in a card with matching border color and box-shadow glow. Label text: "Excellent Match" / "Good Potential" / "Needs Improvement".
- **Processing State** (`status === 'processing'`): Full processing animation — rotating Loader2 in circular SVG, 4 sequential progress steps (Extracting text → Analyzing content → Running ATS simulation → Generating recommendations) with step icons (FileText, Brain, Search, Sparkles), active/done/pending styling, per-step spinners, and a gradient progress bar (purple→cyan) with percentage.
- **Failed State**: Red X icon, "Analysis Failed" message, back button.
- **6 Analysis Sections** in a 2-column grid (md), all animated in with staggered `detailItem` variants:
  1. **STRENGTHS** (green-tinted card, green border): Check icon header, list with green Check icons per item, individual item fade-in animations.
  2. **WEAKNESSES** (red-tinted card, red border): X icon header, list with red X icons per item.
  3. **MISSING KEYWORDS** (yellow-tinted card, yellow border): AlertTriangle icon header, flex-wrap Badge chips with yellow outline styling, scale-in animations.
  4. **REWRITTEN BULLETS** (purple-tinted card, purple border): Sparkles icon header, scrollable list (max-h-72, `custom-scrollbar`) of before/after blocks — original in red-tinted box with line-through, rewritten in green-tinted box with Check icon. Numbered per bullet.
  5. **ROLE FIT ASSESSMENT** (cyan-tinted card, cyan border, full-width `md:col-span-2`): Crosshair icon header, `whitespace-pre-wrap` paragraph text.
  6. **ACTION CHECKLIST** (surface-2 card, full-width `md:col-span-2`): ListChecks icon in purple, items with custom checkbox styling (square border with inner dot, purple theme).

**Imports**: shadcn Card/CardContent/CardHeader/CardTitle, Button, Badge, Dialog/DialogContent/DialogHeader/DialogTitle/DialogTrigger, Select/SelectContent/SelectItem/SelectTrigger/SelectValue, Input, Label. lucide-react (Target, Plus, ArrowLeft, Check, X, AlertTriangle, Shield, FileText, Crosshair, ListChecks, Loader2, Clock, Sparkles, ChevronRight, Brain, Search, Zap). framer-motion (motion, AnimatePresence). `useAppStore` from `@/store/app-store`.
- Default export.
- Lint passed with zero errors.

#### API Routes
- `GET /api/analyses` — Returns all analyses ordered by `createdAt` desc, including resume title via relation. JSON-string fields (strengths, weaknesses, missingKeywords, rewrittenBullets, actionChecklist) are parsed to arrays.
- `POST /api/analyses` — Creates a new analysis in `processing` status with `demo-user`. Validates resumeId exists (404 if not). Returns created analysis (201).
- `GET /api/analyses/[id]` — Returns single analysis with parsed JSON fields and resume title. 404 if not found.
- `POST /api/ai/analyze-resume` — Accepts `{ resumeId, targetRole }`. Creates analysis record (processing), fetches resume with sections from Prisma, formats resume content, builds detailed JSON-response system prompt for ATS analysis. Uses `z-ai-web-dev-sdk` (`ZAI.create()` → `zai.chat.completions.create()`, non-streaming, `deepseek-chat`, temperature 0.4). Parses AI JSON response (with regex extraction for code fences). Validates and sanitizes all fields. Updates analysis to `completed` with parsed results, or `failed` if parsing errors occur. Returns formatted analysis with all parsed fields.
- Lint passed with zero errors.

### Task 10 — Version Vault, Mission Log, Career Map, Pricing, Settings, Billing
- **Files**:
  - `src/components/features/version-vault.tsx`
  - `src/components/features/mission-log.tsx`
  - `src/components/features/career-map.tsx`
  - `src/components/features/pricing-page.tsx`
  - `src/components/features/settings-page.tsx`
  - `src/components/features/billing-page.tsx`

#### `version-vault.tsx`
- `'use client'` component — Version history timeline for resumes.
- Fetches `GET /api/versions` with graceful fallback to 5 demo versions spanning 7 days.
- **Timeline Layout**: Vertical timeline with a left-side connecting line and circular dots per version. Latest version gets a glowing purple dot, older versions get dim border dots.
- **Version Cards**: Each card shows label, notes, date/time (relative format), and diff indicators — green `+New` badges, yellow `↑Changed` badges, red `-Deleted` badges.
- **Restore Button**: Ghost button per card that calls `PUT /api/versions/[id]/restore` with spinner animation.
- **Save Version Dialog**: Input fields for label and notes. POSTs to `/api/versions`, refreshes list.
- **Empty State**: Centered Shield icon with prompt text.
- **Imports**: Shield, Clock, Plus, ArrowUpRight, Minus, RotateCcw, FileText from lucide-react. Card, Button, Badge, Input, Label, Dialog* from shadcn. motion from framer-motion.
- Default export. Lint passed with zero errors.

#### `mission-log.tsx`
- `'use client'` component — Global activity feed with vertical timeline.
- Fetches `GET /api/activity-log` with graceful fallback to 10 demo entries across all categories.
- **Category Icons**: resume=FileText (purple), payload=Zap (yellow), application=Crosshair (cyan), interview=Swords (orange), analysis=Target (green), billing=CreditCard (red).
- **Filter Tabs**: Row of pill buttons — All, Resume, Payload, Application, Interview, Analysis.
- **Timeline Layout**: Vertical ScrollArea with left-side colored dots and connecting line. Each entry is a card with icon, action text, relative timestamp, category badge, and expandable details (AnimatePresence height animation).
- **Empty State**: Centered ScrollText icon with prompt text.
- Default export. Lint passed with zero errors.

#### `career-map.tsx`
- `'use client'` component — Career roadmap visualization as a vertical node-based skill tree (no external graph library).
- Built with plain divs and CSS borders for connecting lines. Fetches `GET /api/career-map` with fallback to 9 demo nodes.
- **Node Types**: current_role (purple glow), target_role (cyan glow), skill (yellow), certification (purple), milestone (green).
- **Status Cycling**: Click status badge to cycle pending→in_progress→completed. In-progress has animated ping pulse.
- **Tree Structure**: Parent-child grouping with expandable nodes and connecting lines via depth-based padding.
- **Add Node Dialog**: Type selector, label, description, parent select. POSTs to `/api/career-map`.
- **Legend**: Color-coded legend for node types and statuses.
- Default export. Lint passed with zero errors.

#### `pricing-page.tsx`
- `'use client'` component — 3 plan cards (Free/Hunter/Beastmaster) in responsive grid + Mission Pack card.
- BEASTMASTER highlighted with purple glow and "RECOMMENDED" badge. Each card has features with Check/X icons and "Get Started" button.
- **MISSION PACK '$12 one-time'**: Separate card with yellow accent, 10 AI gens + 1 analysis, 30-day expiry.
- Default export. Lint passed with zero errors.

#### `settings-page.tsx`
- `'use client'` component — User settings with 3 sections: Profile (name, email read-only, headline, bio, location, website, linkedin, github, phone), Target (role, salary, location, experience level select), Preferences (notifications toggle, dark mode always-on toggle).
- Fetches `GET /api/auth/me` with demo fallback. Save button PUTs to `/api/auth/me`.
- Default export. Lint passed with zero errors.

#### `billing-page.tsx`
- `'use client'` component — Current plan card with badge, 4 usage stats with Progress bars (AI gens, analyses, interviews, storage), payment history table with 6 mock records and status badges.
- All use cyberpunk theme colors and staggered framer-motion animations.

### Task 11 — Login Page, Signup Page, Contact Page

#### `src/components/landing/login-page.tsx`
- `'use client'` component — Cyberpunk-themed login page.
- Centered card with `glow-purple` effect on `bg-grid` background.
- HydraHunt gradient-text logo at top with "Authenticate to access the command center" subtext.
- Email input (with Mail icon), Password input (with Lock icon + Eye/EyeOff show/hide toggle).
- 'Sign In' button (`bg-hydra-purple`) with Loader2 spinner while loading.
- 'Sign in with Google' div styled as outline button with inline Google SVG icon (shows "Coming Soon" toast on click).
- "Don't have an account? Sign up" link calls `setView('signup')`.
- "← Back to Home" link calls `setView('landing')`.
- On submit: POSTs `/api/auth/login` with `{ email, password }`. On success calls `setAuthenticated(true, { id, email, name, plan })`. On failure shows destructive toast via `useToast`.
- Framer Motion `fadeUp` staggered animations. All default exports. Lint: zero errors.

#### `src/components/landing/signup-page.tsx`
- `'use client'` component — Cyberpunk-themed signup page.
- Centered card with `glow-purple` effect. Same layout pattern as login.
- 4 inputs: Name (User icon), Email (Mail icon), Password (Lock icon + toggle), Confirm Password (Lock icon + toggle).
- Client-side validation: password match check and minimum 6 characters, showing destructive toast on mismatch.
- 'Create Account' button (`bg-hydra-purple`). "Already have an account? Sign in" link calls `setView('login')`.
- On submit: POSTs `/api/auth/signup` with `{ name, email, password }`. On success auto-calls `setAuthenticated` with returned user data. On failure shows destructive toast.
- Framer Motion animations. Default export. Lint: zero errors.

#### `src/components/features/contact-page.tsx`
- `'use client'` component — Cyberpunk-themed contact page.
- Centered layout, max-w-4xl. 'Contact Command' header with Radio icons flanking gradient-text heading.
- Form in 2/3-width Card: Name + Email (side-by-side on sm+), Subject Select (General/Bug Report/Feature Request/Billing), Message Textarea, Send button with Send icon.
- Uses `AnimatePresence` to swap between form and success state on submit.
- Success state: CheckCircle2 icon with scaleIn animation, "Signal Transmitted" message, "Send Another Signal" reset button.
- Contact info sidebar (1/3 width): Email (support@hydrahunt.ai), Response Time (24–48 Hours), Systems Online status with pulse-glow indicator.
- "← Back to Home" link. POSTs to `/api/contact`.
- Imports: Card, Input, Textarea, Button, Label, Select/SelectContent/SelectItem/SelectTrigger/SelectValue, motion/AnimatePresence from framer-motion.
- Default export. Lint: zero errors.
### Task 11b — API Routes (Auth, Activity Log, Versions, Career Map, Interviews, Contact)
- **Files** (11 new route files, none existed before):
  - `src/app/api/auth/signup/route.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/activity-log/route.ts`
  - `src/app/api/versions/route.ts`
  - `src/app/api/versions/[id]/route.ts`
  - `src/app/api/career-map/route.ts`
  - `src/app/api/interviews/route.ts`
  - `src/app/api/interviews/[sessionId]/route.ts`
  - `src/app/api/interviews/[sessionId]/chat/route.ts`
  - `src/app/api/contact/route.ts`

#### Auth Routes
- **signup** (POST): Creates User + Profile + free Subscription in a transaction. Checks for duplicate email (409). Returns `{ success, user: { id, email, name, plan } }`.
- **login** (POST): Finds user by email. If not found, auto-registers (creates User + Profile + Subscription). Returns same user shape.
- **me** (GET): Returns first user in DB, or creates `demo@hydrahunt.io` with profile and free sub. (PUT): Updates profile fields (headline, bio, location, website, linkedin, github, phone, targetRole, targetSalary, targetLocation, experience, onboardingComplete) and user name.

#### Activity Log
- (GET): Returns logs for first user, newest first, capped at 100.
- (POST): Creates log entry with `{ action, category, details }` for first user.

#### Resume Versions
- (GET): Returns all ResumeVersion records for first user with resume title.
- (POST): Takes `{ resumeId, label, notes }`, fetches resume + sections, serializes full snapshot JSON, creates ResumeVersion.
- `[id]` (GET): Returns single version with resume title.
- `[id]` (PUT ?action=restore): Parses snapshot JSON, updates resume title/summary, deletes old sections, recreates sections from snapshot.

#### Career Map
- (GET): Returns first CareerMap for user with ordered nodes. Creates default map if none exists.
- (POST): Creates CareerNode on user's map (auto-creates map if needed). Accepts `{ type, label, description, status }`, auto-increments orderIndex.

#### Interviews
- (GET): Returns all InterviewSessions for first user with messages and scores.
- (POST): Creates new session with `{ type, role, company }`.
- `[sessionId]` (PUT): Updates session status and/or score.
- `[sessionId]/chat` (POST): AI-powered interview chat using `z-ai-web-dev-sdk`. Fetches session type/role/company from DB, builds dynamic system prompt, sends history + message to AI with `thinking: { type: 'disabled' }`. Saves both user and AI messages to DB. Returns `{ success, response }`.

#### Contact
- (POST): Validates name/email/message required, returns success (no DB storage).

- All routes use try/catch with proper error responses. All DB routes use `import { db } from '@/lib/db'`.
- Lint: zero errors.
