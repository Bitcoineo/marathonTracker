export type RunType = 'easy' | 'interval' | 'long' | 'tempo'
export type Sex = 'male' | 'female' | 'unspecified'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type PrepWeeksOption = 8 | 12 | 16 | 20
export type Phase = 'base' | 'build' | 'peak' | 'taper'

export interface RunTarget {
  distance: number
  type: RunType
  description?: string
  hrZone?: { min: number; max: number }
  isShakeout?: boolean
  dayOffset?: number
}

export interface WeekPlan {
  totalKm: number
  runs: RunTarget[]
  phase: Phase
  isStepBack: boolean
  weekNumber: number
}

export interface PlanResult {
  plan: WeekPlan[]
  warning?: string
}

export interface RunEntry {
  id: string
  date: string       // "2026-02-16" ISO date string
  distance: number   // km
  feel: string       // emoji
  week: number       // 1–16
}
