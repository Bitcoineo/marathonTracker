import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getCurrentWeek,
  getWeekTarget,
  getWeekDates,
  getRunTargets,
  getRunTypeInfo,
  getTotalWeeks,
  getWeekPhase,
  getWeekIsStepBack,
  getRaceDate,
} from '../data/trainingPlan'
import { getRunTypeStyle } from '../utils/runTypeStyles'
import { useWindowWidth } from '../hooks/useWindowWidth'
import type { RunEntry } from '../types'
import Footer from './Footer'
import { DAY_NAMES, formatShortDate, toDateKey } from '../utils/dateHelpers'

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  base:  { bg: 'rgba(34, 197, 94, 0.1)',  text: '#16a34a' },
  build: { bg: 'rgba(99, 102, 241, 0.1)', text: '#4f46e5' },
  peak:  { bg: 'rgba(249, 115, 22, 0.1)', text: '#ea580c' },
  taper: { bg: 'rgba(236, 72, 153, 0.1)', text: '#db2777' },
}

const PHASE_LABELS: Record<string, string> = {
  base: 'BASE', build: 'BUILD', peak: 'PEAK', taper: 'TAPER',
}

interface ProgramProps {
  runs: RunEntry[]
  viewingWeek: number
}

export default function Program({ runs, viewingWeek }: ProgramProps) {
  const currentWeek = getCurrentWeek()
  const isMobile = useWindowWidth() < 768
  const [expanded, setExpanded] = useState<number | null>(null)

  const runsByDate = new Map<string, RunEntry>()
  for (const run of runs) {
    runsByDate.set(run.date, run)
  }

  // Pre-compute phase boundaries for header rows
  const totalWeeks = getTotalWeeks()
  const phaseStarts = new Map<number, { phase: string; endWeek: number }>()
  let prevPhase: string | null = null
  for (let w = 1; w <= totalWeeks; w++) {
    const phase = getWeekPhase(w)
    if (phase && phase !== prevPhase) {
      let end = w
      for (let j = w + 1; j <= totalWeeks; j++) {
        if (getWeekPhase(j) === phase) end = j
        else break
      }
      phaseStarts.set(w, { phase, endWeek: end })
    }
    prevPhase = phase
  }

  return (
    <div className="program-container" style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: isMobile ? '0 24px' : '0', overflowX: 'hidden' }}>
    <div className="pb-8">
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
        const weekDates = getWeekDates(w)
        const weekTarget = getWeekTarget(w)
        const runTargets = getRunTargets(w)
        const isPast = w < currentWeek
        const isViewed = w === viewingWeek
        const isLast = w === totalWeeks
        const isExpanded = expanded === w
        const phase = getWeekPhase(w)
        const isStepBack = getWeekIsStepBack(w)
        const phaseInfo = phaseStarts.get(w)

        return (
          <div key={w}>
            {/* Phase header */}
            {phaseInfo && (
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <span
                  className="font-inter"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#aaa',
                    letterSpacing: '0.1em',
                  }}
                >
                  — {PHASE_LABELS[phaseInfo.phase] ?? phaseInfo.phase.toUpperCase()} PHASE —
                </span>
                <br />
                <span
                  className="font-inter"
                  style={{ fontSize: 10, color: '#ccc' }}
                >
                  Weeks {w}–{phaseInfo.endWeek}
                </span>
              </div>
            )}

            {/* Week row */}
            <div
              className="cursor-pointer"
              style={{
                opacity: isPast && !isExpanded ? 0.4 : 1,
                borderBottom: !isLast ? '1px solid rgba(0,0,0,0.05)' : undefined,
                borderLeft: isViewed ? '3px solid #00c86e' : '3px solid transparent',
                paddingLeft: 12,
                paddingTop: 12,
                paddingBottom: 12,
              }}
              onClick={() => setExpanded(isExpanded ? null : w)}
            >
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                <p className="font-inter" style={{ fontWeight: 700, fontSize: 16, color: '#0d0d0d', margin: 0, marginRight: 4 }}>
                  Week {w}
                </p>
                {phase && PHASE_COLORS[phase] && (
                  <span
                    className="font-inter"
                    style={{
                      fontSize: 8,
                      fontWeight: 500,
                      color: PHASE_COLORS[phase].text,
                      backgroundColor: PHASE_COLORS[phase].bg,
                      padding: '3px 8px',
                      borderRadius: 20,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {PHASE_LABELS[phase] ?? phase.toUpperCase()}
                  </span>
                )}
                {isStepBack && (
                  <span
                    className="font-inter"
                    style={{
                      fontSize: 8,
                      fontWeight: 500,
                      color: '#aaa',
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      padding: '3px 8px',
                      borderRadius: 20,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    RECOVERY
                  </span>
                )}
                <p className="font-inter" style={{ fontWeight: 700, fontSize: 16, color: '#0d0d0d', margin: 0, marginLeft: 'auto' }}>
                  {weekTarget}km
                </p>
              </div>
              <div className="flex justify-between">
                <p className="font-inter text-[12px] text-[#aaa]">
                  {formatShortDate(weekDates[0])} – {formatShortDate(weekDates[weekDates.length - 1])}
                </p>
                <p className="font-inter text-[#aaa]" style={{ fontSize: 11 }}>
                  {weekDates
                    .map((d, i) => ({ day: DAY_NAMES[d.getDay()], dist: runTargets[i]?.distance ?? 0 }))
                    .filter(e => e.dist > 0)
                    .map(e => `${e.day} ${e.dist}`)
                    .join(' · ')}
                </p>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pb-3">
                    {weekDates.map((date, index) => {
                      const dateKey = toDateKey(date)
                      const loggedRun = runsByDate.get(dateKey)
                      const target = runTargets[index]
                      if (!target) return null
                      const typeInfo = getRunTypeInfo(target.type)

                      return (
                        <div
                          key={dateKey}
                          className="flex items-center gap-2 py-1.5"
                          style={{ flexWrap: 'wrap' }}
                        >
                          <span className="font-inter text-[13px] text-[#0d0d0d]">
                            {DAY_NAMES[date.getDay()]} {formatShortDate(date)}
                          </span>
                          <span className="font-inter text-[13px] text-[#0d0d0d]">
                            {target.distance}km{target.isShakeout ? ' easy' : ''}
                          </span>
                          {target.isShakeout ? (
                            <span
                              className="font-mono"
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                fontStyle: 'italic',
                                color: '#16a34a',
                                backgroundColor: 'rgba(34,197,94,0.1)',
                                border: '1px solid rgba(34,197,94,0.2)',
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              Shakeout
                            </span>
                          ) : (() => {
                            const style = getRunTypeStyle(target.type)
                            return (
                              <span
                                className="font-mono"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: style.color,
                                  backgroundColor: style.background,
                                  border: style.border,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}
                              >
                                {style.label}
                              </span>
                            )
                          })()}
                          {!target.isShakeout && (
                            <span className="font-mono text-[11px] text-[#e11d48]">
                              ♥ {(target.hrZone ?? typeInfo.hr).min}–{(target.hrZone ?? typeInfo.hr).max}
                            </span>
                          )}
                          {target.description && (
                            <span className="font-inter text-[11px] text-[#aaa] basis-full">
                              {target.description}
                            </span>
                          )}
                          {target.isShakeout && (
                            <span className="font-inter text-[11px] text-[#aaa] basis-full" style={{ fontStyle: 'italic' }}>
                              The hay is in the barn.
                            </span>
                          )}
                          {loggedRun && (
                            <span className="font-inter text-[12px] text-[#00c86e] font-medium">
                              ✓ {loggedRun.distance}km {loggedRun.feel}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Marathon Finale */}
      {(() => {
        let raceDate = getRaceDate()
        try {
          const profile = JSON.parse(localStorage.getItem('athleteProfile') || '{}')
          if (!profile.hasRaceDate && profile.startDate && profile.prepWeeks) {
            const start = new Date(profile.startDate)
            raceDate = new Date(start.getTime() + profile.prepWeeks * 7 * 86_400_000)
          }
        } catch { /* fallback */ }
        const formatted = raceDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        return (
          <>
            <div
              style={{
                marginTop: 24,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 100%)',
                padding: '24px 20px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 28, marginBottom: 8 }}>🏁</span>
              <span
                className="font-mono"
                style={{ fontSize: 11, color: '#666', letterSpacing: '0.15em', marginBottom: 4 }}
              >
                RACE DAY
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontStyle: 'italic',
                  textTransform: 'uppercase' as const,
                  fontSize: 32,
                  color: 'white',
                }}
              >
                Marathon
              </span>
              <span className="font-inter" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {formatted}
              </span>
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
              <span className="font-mono" style={{ fontSize: 14, color: 'white' }}>
                42.195 km
              </span>
              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
              <span
                className="font-inter"
                style={{ fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}
              >
                All the early mornings. All the long runs. This is what they were for.
              </span>
            </div>
            <p className="font-inter" style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
              You've got this. Trust your training.
            </p>
          </>
        )
      })()}
    </div>
    <Footer />
    </div>
  )
}
