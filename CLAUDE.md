# Marathon Tracker — Developer Context

## What This Is
A mobile-first PWA for personalized marathon training. Users complete
an onboarding flow, get a dynamically generated training plan, and log
runs week by week. Designed to be sold as a standalone product.

Live: https://marathon-tracker-gilt.vercel.app

---

## Tech Stack
- React 18 + TypeScript + Vite
- Framer Motion (animations)
- Recharts (history graph)
- Deployed on Vercel
- PWA with manifest.json and custom icons

---

## File Structure
src/
  components/
    Onboarding.tsx   — 8-step onboarding flow (welcome → confirmation)
    Dashboard.tsx    — main Now tab (ring, stats, run cards, badges)
    History.tsx      — logged runs graph + expandable week list
    Program.tsx      — full plan by week with phase headers + marathon card
    LogRun.tsx       — bottom sheet for logging/editing/deleting runs
    Badges.tsx       — 6 achievement badges
  utils/
    generatePlan.ts  — core plan generation logic (see Plan Logic below)
    runTypeStyles.ts — color/label lookup per run type
  data/
    trainingPlan.ts  — all localStorage read/write, plan caching
  hooks/
    useWindowWidth.ts — returns window.innerWidth, used for mobile breakpoint
  types.ts           — ALL shared TypeScript interfaces live here
  App.tsx            — tab routing, global state, localStorage init
  index.css          — global styles, input[type=range] custom styles

---

## Design System

### Philosophy
Apple-inspired minimalism. Every element earns its place.
When in doubt: remove, don't add.

### Colors
- Background: #f0ede8 (warm off-white)
- Primary text: #0d0d0d
- Secondary text: #aaa
- Active/completion: #00c86e (green) — ONLY for completion states
- Never use green for data display (e.g. HR values)

### Run Type Colors (from runTypeStyles.ts)
- EF: light green bg, #16a34a text
- INT: light indigo bg, #4f46e5 text
- TEMPO: light pink bg, #db2777 text
- LONG: light orange bg, #ea580c text

### Typography
- Logo: Barlow Condensed 800 italic uppercase
- Body: Inter 400/500/600/700
- Numbers/data: DM Mono
- Secondary labels: Inter 400 #aaa

### Spacing
- Mobile padding: 20px sides, 16px top, 24px bottom
- Card gap: 6px
- Section gap: 16px

### Cards
- Unlogged: white bg, dashed border rgba(0,0,0,0.15)
- Logged: white bg, solid border rgba(0,200,110,0.35), green checkmark
- Today unlogged: dashed green border rgba(0,200,110,0.4)
- Border radius: 10px
- whileTap scale(0.97) on all interactive cards

### Buttons
- Primary CTA: black bg #0d0d0d, white text, borderRadius 14px,
  height 56px, Inter 600 16px
- Back: Inter 400 14px #aaa, no background
- Pills (selection): white bg, border rgba(0,0,0,0.12),
  selected: border #0d0d0d 2px

### Run Cards (Dashboard)
- Always single row regardless of day count (3, 4, or 5)
- flex: 1 on each card, minWidth: 0
- Font sizes scale by card count:
  3 days: day 15px, date 11px, km 16px, tag 10px, bpm 10px
  4 days: day 13px, date 10px, km 14px, tag 9px, bpm 8px
  5 days: day 11px, date 9px, km 13px, tag 8px, bpm hidden

---

## localStorage Schema
- athleteProfile: AthleteProfile object (see types.ts)
- onboardingComplete: boolean string "true"
- marathonRuns: RunEntry[] (all logged runs)
- trainingPlan: StoredWeekPlan[] (generated plan, cached)

### AthleteProfile shape
{
  startDate: string (ISO),
  raceDate: string (ISO) | null,
  hasRaceDate: boolean,
  prepWeeks: number,
  experience: 'beginner' | 'intermediate' | 'advanced',
  runFrequency: 3 | 4 | 5,
  runDays: string[],  // e.g. ['Mon', 'Wed', 'Fri', 'Sun']
  age: number,
  weight: number,
  height: number,
  sex: 'male' | 'female'
}

---

## Training Plan Logic (generatePlan.ts)

### Phases (computed from prepWeeks)
- Base:  30% of weeks — aerobic foundation only
- Build: 40% of weeks — introduce quality, step-back every 4th week
- Peak:  20% of weeks — highest volume, race-pace work
- Taper: 10% of weeks (min 2) — volume -40-60%, intensity kept short

### Run Type Matrix
Assigned by experience × phase × frequency. Key rules:
- LONG always on last day of week
- EF always on first day
- INT and TEMPO never on consecutive days
- Beginners: no quality in base phase, INT introduced in peak only
- Intermediate: INT from build, TEMPO in peak (5-day only)
- Advanced: quality from week 1

### Peak Weekly Km Targets
             3d    4d    5d
Beginner:    42    52    60
Intermediate:55    65    75
Advanced:    65    78    90

### Long Run Cap
- Beginner: max 32km
- Intermediate: max 35km
- Advanced: max 38km

### Step-back Weeks
Every 4th week in build phase: multiply weekly total by 0.75.
Marked as isStepBack: true in the output.

---

## Onboarding Flow (5 steps + welcome)
0. Welcome — logo + "Get started" (no dots)
1a. Already started? — "No, I'm starting fresh" (auto-advance) or
    "Yes, I already started" → date picker + Continue
1b. Race date? — "Yes, I have a race date" → date picker + Continue
    or "Not yet" → 8/12/16/20 week pills (16 = recommended, auto-advance on tap)
2. Experience — Beginner / Intermediate / Advanced (auto-advance on tap)
3. Set up your schedule — frequency pills (3/4/5, recommended=4) +
   day picker + age stepper + sex pills (Male/Female)
4. Confirmation — summary card + "Start training →" (no Back)

Progress dots: 5 dots for steps 1a–4, hidden on welcome.

---

## HR Zone Calculation
Male:   maxHR = 220 - age
Female: maxHR = 206 - (0.88 × age)

Zones:
- EF:    60-70% maxHR
- LONG:  65-75% maxHR
- TEMPO: 75-85% maxHR
- INT:   80-90% maxHR

---

## Key UX Rules
- Green (#00c86e) is ONLY for completion/success states. Never for data.
- Single row cards always — never wrap to multiple rows
- No shadows on cards — borders only
- No emoji in UI except onboarding experience pills and badges
- Dashed border = unlogged/fillable. Solid border = logged/complete.
- bpm hidden on 5-day layout (too cramped)
- Delete run: tap logged card → edit modal → "Delete run" text button
- Duplicate runs prevented: tapping a logged card opens edit, not new entry
- Minimum 3 run days enforced throughout

---

## Tabs
- Now: week dashboard
- History: graph + run log (has "Made by Bitcoineo" footer with x.com link)
- Program: full plan + marathon finale card (has "Made by Bitcoineo" footer)

## Marathon Finale Card (Program.tsx)
Dark card at bottom of Program view.
bg: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)
Shows: 🏁 RACE DAY / Marathon / race date / 42.195km / motivational quote

---

## Badges (6 total)
1. First Run — log first run
2. 3 Week Streak — 3 consecutive full weeks
3. Long Run 20km — complete 20km+ long run
4. Interval Warrior — complete 5 interval sessions
5. Peak Week — complete peak phase week
6. Marathon Ready — log final long run

Locked: grayscale 30% opacity. Unlocked: full color, pop animation.

---

## Deployment
Vercel project: marathon-tracker
Alias: marathon-tracker-gilt.vercel.app
Deploy: npm run build && vercel --prod

## Development
npm install
npm run dev
npx tsc --noEmit   ← run this before every deploy
