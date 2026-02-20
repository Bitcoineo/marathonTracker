# Marathon Tracker

A mobile-first PWA for personalized marathon training.
Live: https://marathon-tracker-gilt.vercel.app

## Features
- Personalized onboarding (experience, frequency, days, profile)
- Phase-based training plans (Base / Build / Peak / Taper)
- 3 experience levels x 3 frequencies = 9 plan variants
- Dynamic HR zones computed from age and biological sex
- Run logging with feel tracking and notes
- Weekly progress ring and stats
- Training history with Recharts visualization
- Full program view with phase headers
- 6 achievement badges
- PWA installable on iOS and Android

## Tech Stack
React 18, TypeScript, Vite, Framer Motion, Recharts
Deployed on Vercel

## Project Structure
```
src/
  components/   — Dashboard, History, Program, LogRun, Badges, Onboarding
  utils/        — runTypeStyles, dateHelpers
  data/         — trainingPlan (localStorage layer), generatePlan
  hooks/        — useWindowWidth
  types.ts      — all shared types
```

## Local Development
```
npm install
npm run dev
```

## Build
```
npm run build
vercel --prod
```

## Training Plan Logic
Plans are generated dynamically based on:
- Experience: Beginner (Hal Higdon inspired) / Intermediate (FIRST method) / Advanced (Hansons inspired)
- Frequency: 3 / 4 / 5 days per week
- Duration: 8-20 weeks
- Phases: Base → Build (with step-back weeks) → Peak → Taper
- Run types per phase and experience level defined in RUN_TYPE_MATRIX
