import type { RunType, Sex, RunTarget } from '../types'
export type { RunType, Sex, RunTarget }

export function computeMaxHR(age: number, sex: Sex): number {
  if (sex === 'female') return Math.round(206 - (0.88 * age))
  return 220 - age
}

const DAY_NAME_TO_OFFSET: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
}

const DEFAULT_RUN_DAYS = [1, 4, 6] // Mon, Thu, Sat

function getRunDayOffsets(): number[] {
  try {
    const profile = localStorage.getItem('athleteProfile')
    if (profile) {
      const parsed = JSON.parse(profile)
      if (Array.isArray(parsed.runDays)) {
        return parsed.runDays
          .map((d: string) => DAY_NAME_TO_OFFSET[d])
          .filter(Boolean)
          .sort((a: number, b: number) => a - b)
      }
    }
  } catch { /* fallback */ }
  return DEFAULT_RUN_DAYS
}

export function getDayIndex(jsDay: number): number {
  const offset = jsDay === 0 ? 7 : jsDay
  const offsets = getRunDayOffsets()
  const idx = offsets.indexOf(offset)
  return idx >= 0 ? idx : 0
}

function getProfileMaxHR(): number {
  try {
    const profile = localStorage.getItem('athleteProfile')
    if (profile) {
      const parsed = JSON.parse(profile)
      if (parsed.maxHR) return parsed.maxHR
    }
  } catch { /* fallback */ }
  return 190
}

export function getHRZones(maxHR?: number): Record<RunType, { min: number; max: number; label: string }> {
  const hr = maxHR ?? getProfileMaxHR()
  return {
    easy:     { min: Math.round(hr * 0.60), max: Math.round(hr * 0.70), label: 'conversational pace' },
    interval: { min: Math.round(hr * 0.80), max: Math.round(hr * 0.90), label: '80-90% max HR' },
    tempo:    { min: Math.round(hr * 0.75), max: Math.round(hr * 0.85), label: '75-85% max HR' },
    long:     { min: Math.round(hr * 0.65), max: Math.round(hr * 0.75), label: 'comfortable & sustained' },
  }
}

const MS_PER_DAY = 86_400_000

interface StoredWeekPlan {
  totalKm: number
  runs: RunTarget[]
  phase?: string
  isStepBack?: boolean
  weekNumber?: number
}

let _cachedPlan: StoredWeekPlan[] | null | undefined = undefined

export function clearPlanCache(): void {
  _cachedPlan = undefined
}

function getStoredPlan(): StoredWeekPlan[] | null {
  if (_cachedPlan !== undefined) return _cachedPlan
  try {
    const stored = localStorage.getItem('trainingPlan')
    _cachedPlan = stored ? JSON.parse(stored) : null
  } catch { _cachedPlan = null }
  return _cachedPlan ?? null
}

export function getTotalWeeks(): number {
  const plan = getStoredPlan()
  if (plan) return plan.length
  const start = getStartDate()
  const race = getRaceDay()
  return Math.max(1, Math.ceil((race.getTime() - start.getTime()) / (7 * MS_PER_DAY)))
}

function getStartDate(): Date {
  try {
    const profile = localStorage.getItem('athleteProfile')
    if (profile) {
      const parsed = JSON.parse(profile)
      if (parsed.startDate) return new Date(parsed.startDate)
    }
  } catch { /* fallback */ }
  return new Date()
}

export function getRaceDate(): Date {
  return getRaceDay()
}

function getRaceDay(): Date {
  try {
    const profile = localStorage.getItem('athleteProfile')
    if (profile) {
      const parsed = JSON.parse(profile)
      if (parsed.raceDate) return new Date(parsed.raceDate)
    }
  } catch { /* fallback */ }
  return new Date(Date.now() + 16 * 7 * MS_PER_DAY)
}

export function getCurrentWeek(): number {
  const startDate = getStartDate()
  const startDay = startDate.getDay()
  const daysToMonday = (1 - startDay + 7) % 7
  const firstMonday = startDate.getTime() + daysToMonday * MS_PER_DAY
  const elapsed = Date.now() - firstMonday
  const week = Math.floor(elapsed / (7 * MS_PER_DAY)) + 1
  return Math.max(1, Math.min(getTotalWeeks(), week))
}

export function getWeekTarget(week: number): number {
  const plan = getStoredPlan()
  if (plan && plan[week - 1]) return plan[week - 1].totalKm
  return 0
}

export function getRunTargets(week: number): RunTarget[] {
  const plan = getStoredPlan()
  if (plan && plan[week - 1]) return plan[week - 1].runs
  return []
}

export function getWeekPhase(week: number): string | null {
  const plan = getStoredPlan()
  if (plan && plan[week - 1] && plan[week - 1].phase) return plan[week - 1].phase!
  return null
}

export function getWeekIsStepBack(week: number): boolean {
  const plan = getStoredPlan()
  if (plan && plan[week - 1]) return plan[week - 1].isStepBack ?? false
  return false
}

export function getRunTypeInfo(type: RunType): { label: string; color: string; desc: string; hr: { min: number; max: number } } {
  const hr = getHRZones()[type]
  switch (type) {
    case 'easy': return { label: 'EF', color: '#16a34a', desc: 'conversational pace. you should be able to talk.', hr }
    case 'interval': return { label: 'INT', color: '#4f46e5', desc: 'warm up 10min → 6x400m hard → cool down 10min', hr }
    case 'tempo': return { label: 'TEMPO', color: '#db2777', desc: 'sustained effort, comfortably hard', hr }
    case 'long': return { label: 'LONG', color: '#ea580c', desc: "slow and steady. don't check your pace.", hr }
  }
}

export function getDaysRemaining(): number {
  return Math.ceil((getRaceDay().getTime() - Date.now()) / MS_PER_DAY)
}

export function getWeekDates(week: number): Date[] {
  const startDate = getStartDate()
  const startDay = startDate.getDay()
  const daysToMonday = (1 - startDay + 7) % 7
  const firstMonday = new Date(startDate.getTime() + daysToMonday * MS_PER_DAY)
  const weekMonday = new Date(firstMonday.getTime() + (week - 1) * 7 * MS_PER_DAY)
  return getRunDayOffsets().map(dayOffset => {
    const date = new Date(weekMonday)
    date.setDate(weekMonday.getDate() + (dayOffset - 1))
    return date
  })
}
