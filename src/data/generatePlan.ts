import type { RunType, RunTarget, Experience, Phase, WeekPlan, PlanResult } from '../types'
export type { Experience, Phase, WeekPlan, PlanResult }
export type { Sex, PrepWeeksOption } from '../types'
export { computeMaxHR } from './trainingPlan'

// ── Peak weekly km by experience × frequency ─────────────────────────

const PEAK_KM: Record<Experience, Record<number, number>> = {
  beginner:     { 3: 42,  4: 52,  5: 60 },
  intermediate: { 3: 55,  4: 65,  5: 75 },
  advanced:     { 3: 65,  4: 78,  5: 90 },
}

// ── Run type matrix: experience × phase × frequency ─────────────────

const RUN_TYPE_MATRIX: Record<Experience, Record<Phase, Record<number, RunType[]>>> = {
  beginner: {
    base:  { 3: ['easy','easy','easy'],           4: ['easy','easy','easy','easy'],           5: ['easy','easy','easy','easy','easy'] },
    build: { 3: ['easy','easy','long'],           4: ['easy','easy','easy','long'],           5: ['easy','easy','easy','easy','long'] },
    peak:  { 3: ['easy','easy','long'],           4: ['easy','interval','easy','long'],       5: ['easy','interval','easy','easy','long'] },
    taper: { 3: ['easy','easy','easy'],           4: ['easy','easy','easy','easy'],           5: ['easy','easy','easy','easy','easy'] },
  },
  intermediate: {
    base:  { 3: ['easy','easy','long'],           4: ['easy','easy','easy','long'],           5: ['easy','easy','easy','easy','long'] },
    build: { 3: ['easy','interval','long'],       4: ['easy','interval','easy','long'],       5: ['easy','interval','easy','easy','long'] },
    peak:  { 3: ['easy','interval','long'],       4: ['easy','interval','easy','long'],       5: ['easy','interval','easy','tempo','long'] },
    taper: { 3: ['easy','interval','long'],       4: ['easy','interval','easy','long'],       5: ['easy','interval','easy','tempo','long'] },
  },
  advanced: {
    base:  { 3: ['easy','interval','long'],       4: ['easy','interval','easy','long'],       5: ['easy','interval','easy','easy','long'] },
    build: { 3: ['easy','interval','long'],       4: ['easy','interval','tempo','long'],      5: ['easy','interval','easy','tempo','long'] },
    peak:  { 3: ['easy','interval','long'],       4: ['easy','interval','tempo','long'],      5: ['easy','interval','easy','tempo','long'] },
    taper: { 3: ['easy','interval','long'],       4: ['easy','interval','tempo','long'],      5: ['easy','interval','easy','tempo','long'] },
  },
}

// ── Long run config ─────────────────────────────────────────────────

const LONG_FRAC_BY_PHASE: Record<Phase, { min: number; max: number }> = {
  base:  { min: 0.25, max: 0.25 },
  build: { min: 0.28, max: 0.35 },
  peak:  { min: 0.35, max: 0.38 },
  taper: { min: 0.20, max: 0.25 },
}

const LONG_CAP: Record<Experience, number> = {
  beginner: 32, intermediate: 35, advanced: 38,
}

const LONG_MIN = 10

const TYPE_WEIGHT: Record<RunType, number> = {
  easy: 1.0, interval: 1.1, tempo: 1.15, long: 1.0,
}

const DAY_OFFSETS: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
}

// ── Helpers ─────────────────────────────────────────────────────────

function roundHalf(km: number): number {
  return Math.round(km * 2) / 2
}

function computePhases(prepWeeks: number): { base: number; build: number; peak: number; taper: number } {
  const taper = Math.max(2, Math.round(prepWeeks * 0.10))
  const peak  = Math.max(2, Math.round(prepWeeks * 0.20))
  const build = Math.max(3, Math.round(prepWeeks * 0.40))
  const base  = Math.max(1, prepWeeks - taper - peak - build)
  return { base, build, peak, taper }
}

function computeMultiplier(
  phase: Phase,
  phaseIndex: number,
  phaseLength: number,
): number {
  const t = phaseLength > 1 ? phaseIndex / (phaseLength - 1) : 1
  switch (phase) {
    case 'base':
      return 0.45 + (0.65 - 0.45) * t
    case 'build':
      return 0.65 + (0.90 - 0.65) * t
    case 'peak':
      return 0.90 + (1.0 - 0.90) * t
    case 'taper':
      if (phaseIndex === 0) return 0.60
      if (phaseIndex === 1) return 0.40
      return 0.30
  }
}

function getLongFraction(phase: Phase, phaseIndex: number, phaseLength: number): number {
  const { min, max } = LONG_FRAC_BY_PHASE[phase]
  if (phaseLength <= 1) return max
  const t = phaseIndex / (phaseLength - 1)
  return min + (max - min) * t
}

function hrZoneFor(type: RunType, maxHR: number): { min: number; max: number } {
  switch (type) {
    case 'easy':     return { min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70) }
    case 'interval': return { min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90) }
    case 'tempo':    return { min: Math.round(maxHR * 0.75), max: Math.round(maxHR * 0.85) }
    case 'long':     return { min: Math.round(maxHR * 0.65), max: Math.round(maxHR * 0.75) }
  }
}

function getDescription(
  type: RunType,
  distance: number,
  isStepBack: boolean,
  phase: Phase,
): string {
  if (isStepBack && type === 'easy') return 'recovery week — take it very easy'
  if (type === 'easy') return 'conversational pace, stay relaxed'
  if (type === 'interval') {
    if (phase === 'peak') return 'warm up 10min → 4×800m at tempo → cool down'
    return 'warm up 10min → 6×400m hard/200m jog → cool down'
  }
  if (type === 'tempo') return 'sustained effort — comfortably hard for 20-30min'
  // long
  if (distance > 25) return 'race simulation — practice race-day fueling'
  if (distance >= 15) return 'fueling practice — take a gel at 10km'
  return "easy long run, don't check pace"
}

// ── Hard-day spacing ────────────────────────────────────────────────

function applyHardDaySpacing(
  types: RunType[],
  runDays: string[],
): { types: RunType[]; swappedIndex: number | null } {
  if (types.length !== runDays.length) return { types, swappedIndex: null }

  const offsets = runDays.map(d => DAY_OFFSETS[d] ?? 0)
  const hardIndices: number[] = []
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'interval' || types[i] === 'tempo') hardIndices.push(i)
  }
  if (hardIndices.length < 2) return { types, swappedIndex: null }

  for (let h = 0; h < hardIndices.length - 1; h++) {
    const a = hardIndices[h]
    const b = hardIndices[h + 1]
    if (Math.abs(offsets[b] - offsets[a]) === 1) {
      const efIdx = types.findIndex(t => t === 'easy')
      if (efIdx !== -1 && efIdx !== a) {
        const result = [...types]
        result[efIdx] = types[a]
        result[a] = types[efIdx]
        return { types: result, swappedIndex: efIdx }
      }
    }
  }

  return { types, swappedIndex: null }
}

// ── Per-week run distribution ───────────────────────────────────────

function splitWeekIntoRuns(
  totalKm: number,
  types: RunType[],
  phase: Phase,
  phaseIndex: number,
  phaseLength: number,
  isStepBack: boolean,
  maxHR: number,
  experience: Experience,
): RunTarget[] {
  const hasLong = types.includes('long')

  if (!hasLong) {
    // All-EF weeks: distribute evenly
    const perRun = roundHalf(totalKm / types.length)
    return types.map(type => ({
      distance: Math.max(3, perRun),
      type,
      description: getDescription(type, perRun, isStepBack, phase),
      hrZone: hrZoneFor(type, maxHR),
    }))
  }

  // Long run km
  const longFrac = getLongFraction(phase, phaseIndex, phaseLength)
  let longKm = roundHalf(totalKm * longFrac)
  longKm = Math.max(LONG_MIN, longKm)
  longKm = Math.min(LONG_CAP[experience], longKm)

  // Non-long distribution by type weight
  const remaining = Math.max(0, totalKm - longKm)
  const nonLongTypes = types.filter(t => t !== 'long')
  const weights = nonLongTypes.map(t => TYPE_WEIGHT[t])
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const baseKmPerWeight = weightSum > 0 ? remaining / weightSum : 0

  let weightIdx = 0
  return types.map(type => {
    if (type === 'long') {
      return {
        distance: roundHalf(longKm),
        type,
        description: getDescription(type, longKm, isStepBack, phase),
        hrZone: hrZoneFor(type, maxHR),
      }
    }
    const dist = roundHalf(Math.max(3, baseKmPerWeight * weights[weightIdx++]))
    return {
      distance: dist,
      type,
      description: getDescription(type, dist, isStepBack, phase),
      hrZone: hrZoneFor(type, maxHR),
    }
  })
}

// ── Main generator ──────────────────────────────────────────────────

export function generateTrainingPlan(
  experience: Experience,
  prepWeeks: number,
  maxHR: number,
  runDaysPerWeek: number = 3,
  runDays: string[] = ['Mon', 'Thu', 'Sat'],
): PlanResult {
  const clamped = Math.max(8, Math.min(24, prepWeeks))
  let warning: string | undefined
  if (clamped < 12) {
    warning = 'aggressive timeline — recovery is critical'
  }

  const corePrepWeeks = Math.min(clamped, 20)
  const extraBaseWeeks = clamped - corePrepWeeks
  const { base: baseWeeks, build: buildWeeks, peak: peakWeeks, taper: taperWeeks } = computePhases(corePrepWeeks)
  const peakKm = PEAK_KM[experience][runDaysPerWeek] ?? PEAK_KM[experience][3]
  const freq = runDaysPerWeek

  const weeks: WeekPlan[] = []
  let weekNumber = 1

  function buildWeek(
    phase: Phase,
    phaseIndex: number,
    phaseLength: number,
    totalKm: number,
    isStepBack: boolean,
  ): void {
    const types = [...RUN_TYPE_MATRIX[experience][phase][freq]]
    const { types: spacedTypes, swappedIndex } = applyHardDaySpacing(types, runDays)
    const runs = splitWeekIntoRuns(totalKm, spacedTypes, phase, phaseIndex, phaseLength, isStepBack, maxHR, experience)
    if (swappedIndex !== null && runs[swappedIndex]) {
      runs[swappedIndex].description += ' — moved for recovery spacing'
    }
    weeks.push({ totalKm, runs, phase, isStepBack, weekNumber: weekNumber++ })
  }

  // Extra base weeks (>20 week plans)
  for (let i = 0; i < extraBaseWeeks; i++) {
    const t = extraBaseWeeks > 1 ? i / extraBaseWeeks : 0
    const multiplier = 0.45 + (0.65 - 0.45) * t * 0.5
    buildWeek('base', i, extraBaseWeeks, roundHalf(peakKm * multiplier), false)
  }

  // Base phase
  for (let i = 0; i < baseWeeks; i++) {
    const multiplier = computeMultiplier('base', i, baseWeeks)
    buildWeek('base', i, baseWeeks, roundHalf(peakKm * multiplier), false)
  }

  // Build phase — step-back every 4th week
  let nonStepBackCount = 0
  for (let i = 0; i < buildWeeks; i++) {
    if (!(i > 0 && (i + 1) % 4 === 0)) nonStepBackCount++
  }

  let buildStep = 0
  let lastNonStepBackKm = 0
  for (let i = 0; i < buildWeeks; i++) {
    const isStepBack = i > 0 && (i + 1) % 4 === 0
    let totalKm: number
    if (isStepBack) {
      totalKm = roundHalf(lastNonStepBackKm * 0.75)
    } else {
      const multiplier = computeMultiplier('build', buildStep, nonStepBackCount)
      totalKm = roundHalf(peakKm * multiplier)
      lastNonStepBackKm = totalKm
      buildStep++
    }
    buildWeek('build', i, buildWeeks, totalKm, isStepBack)
  }

  // Peak phase — step-back at midpoint if >= 4 weeks
  for (let i = 0; i < peakWeeks; i++) {
    const isStepBack = peakWeeks >= 4 && i === Math.floor(peakWeeks / 2)
    const multiplier = isStepBack ? 0.80 : computeMultiplier('peak', i, peakWeeks)
    buildWeek('peak', i, peakWeeks, roundHalf(peakKm * multiplier), isStepBack)
  }

  // Taper phase
  for (let i = 0; i < taperWeeks; i++) {
    const multiplier = computeMultiplier('taper', i, taperWeeks)
    buildWeek('taper', i, taperWeeks, roundHalf(peakKm * multiplier), false)
  }

  return { plan: weeks, warning }
}
