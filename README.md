# Marathon Tracker

A mobile-first PWA for personalized marathon training. Built for my own race preparation. Generates a structured training plan based on your experience, weekly frequency, and race date, then tracks every run through to race day.

**Stack:** `React 18 · TypeScript · Vite · Framer Motion · localStorage · Vercel`

**Live:** https://marathon-tracker-bitcoineo.vercel.app

> Designed for mobile. For the best experience, add it to your home screen on iOS or Android.

---

## Why I built this

I started marathon training and found existing apps either too generic or too expensive. I wanted a plan that adapted to my actual fitness level and schedule, with HR zones computed from my own biometrics, not arbitrary defaults. I built this in a day as a PWA so it would work like a native app on my phone.

## Features

- **Personalized onboarding** Experience level, weekly frequency, training days, age, and biological sex
- **9 plan vts** 3 experience levels (Beginner, Intermediate, Advanced) x 3 frequencies (3, 4, 5 days/week)
- **Phase-based structure** Base, Build (with step-back weeks), Peak, and Taper phases
- **Dynamic HR zones** Computed from age and biological sex, used to set effort targets per run type
- **Run logging** Log each session with feel tracking and notes
- **Weekly progress ring** Confetti on week completion
- **SVG training history** Pure SVG chart, no charting library
- **Achievement badges** 6 badges with dynamic unlock conditions
- **PWA** Installable on iOS and Android, works offline

## Training Plan Logic

Plans are generated dynamically based on:

- Experience: Beginner (Hal Higdon inspired), Intermediate (FIRST method), Advanced (Hansons inspired)
- Frequency: 3, 4, or 5 days per week
- Duration: 8 to 20 weeks depending on race date
- Run type matrix per phase and experience level (easy, interval, tempo, long)
- Peak weekly mileage scales by experience and frequency (42km to 90km)
- Long run capped at 32km (beginner), 35km (intermediate), 38km (advanced)

## Run Locally

    npm install
    npm run dev

Open http://localhost:5173

## GitHub Topics

`react` `typescript` `vite` `pwa` `marathon` `training` `framer-motion` `localstorage` `svg` `mobile-first`
