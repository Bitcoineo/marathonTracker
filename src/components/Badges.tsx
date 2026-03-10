import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWeekDates, getRunTargets, getTotalWeeks, getDayIndex, getWeekPhase } from '../data/trainingPlan'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../utils/breakpoints'
import { toDateKey } from '../utils/dateHelpers'
import { haptic } from '../utils/haptics'
import type { RunEntry } from '../types'

const BADGES = [
  { id: 'first-run', emoji: '🏃', name: 'First Run', desc: 'log your first run' },
  { id: '3-week-streak', emoji: '📅', name: '3 Week Streak', desc: '3 consecutive weeks with all runs logged' },
  { id: 'long-20km', emoji: '🔟', name: 'Long Run 20km', desc: 'log a single run of 20km+' },
  { id: 'interval-warrior', emoji: '⚡', name: 'Interval Warrior', desc: 'complete 5 interval sessions' },
  { id: 'peak-week', emoji: '🏔️', name: 'Peak Week', desc: 'complete all runs in a peak week' },
  { id: 'marathon-ready', emoji: '🏁', name: 'Marathon Ready', desc: 'log your final training run' },
]

function isUnlocked(id: string, runs: RunEntry[]): boolean {
  switch (id) {
    case 'first-run':
      return runs.length > 0
    case '3-week-streak': {
      for (let w = 1; w <= getTotalWeeks() - 2; w++) {
        const t0 = getRunTargets(w).length
        const t1 = getRunTargets(w + 1).length
        const t2 = getRunTargets(w + 2).length
        if (
          runs.filter((r) => r.week === w).length >= t0 &&
          runs.filter((r) => r.week === w + 1).length >= t1 &&
          runs.filter((r) => r.week === w + 2).length >= t2
        ) return true
      }
      return false
    }
    case 'long-20km':
      return runs.some((r) => r.distance >= 20)
    case 'interval-warrior':
      return runs.filter((r) => {
        const dow = new Date(r.date + 'T00:00:00').getDay()
        return getRunTargets(r.week)[getDayIndex(dow)]?.type === 'interval'
      }).length >= 5
    case 'peak-week': {
      const totalWeeks = getTotalWeeks()
      for (let w = 1; w <= totalWeeks; w++) {
        if (getWeekPhase(w) === 'peak') {
          const targetCount = getRunTargets(w).length
          if (runs.filter((r) => r.week === w).length >= targetCount) return true
        }
      }
      return false
    }
    case 'marathon-ready': {
      const lastWeek = getTotalWeeks()
      const lastWeekDates = getWeekDates(lastWeek)
      const lastRunDate = lastWeekDates[lastWeekDates.length - 1]
      const lastRunKey = toDateKey(lastRunDate)
      return runs.some((r) => r.date === lastRunKey)
    }
    default:
      return false
  }
}

function getProgress(id: string, runs: RunEntry[]): string {
  switch (id) {
    case 'first-run':
      return runs.length > 0 ? 'Completed' : '0 / 1 run'
    case '3-week-streak': {
      let best = 0
      let streak = 0
      for (let w = 1; w <= getTotalWeeks(); w++) {
        const needed = getRunTargets(w).length
        if (runs.filter((r) => r.week === w).length >= needed) {
          streak++
          best = Math.max(best, streak)
        } else {
          streak = 0
        }
      }
      return best >= 3 ? 'Completed' : `${Math.min(best, 2)} / 3 weeks`
    }
    case 'long-20km': {
      const longest = runs.reduce((max, r) => Math.max(max, r.distance), 0)
      return longest >= 20 ? 'Completed' : `Longest: ${longest}km / 20km`
    }
    case 'interval-warrior': {
      const count = runs.filter((r) => {
        const dow = new Date(r.date + 'T00:00:00').getDay()
        return getRunTargets(r.week)[getDayIndex(dow)]?.type === 'interval'
      }).length
      return count >= 5 ? 'Completed' : `${count} / 5 intervals`
    }
    case 'peak-week':
      return isUnlocked('peak-week', runs) ? 'Completed' : 'Reach peak phase'
    case 'marathon-ready':
      return isUnlocked('marathon-ready', runs) ? 'Completed' : 'Not yet'
    default:
      return ''
  }
}

const HOW_TO: Record<string, string> = {
  'first-run': 'Tap any run card on your dashboard and save your distance to earn this badge.',
  '3-week-streak': 'Log every scheduled run for 3 weeks in a row. Missing even one run resets the streak.',
  'long-20km': 'Complete a single long run of at least 20 kilometers. These are typically scheduled on your last training day of the week.',
  'interval-warrior': 'Finish 5 interval training sessions. Intervals are high-intensity repeats that build your speed and VO2max.',
  'peak-week': 'Complete all scheduled runs during a peak phase week — the highest-volume block of your plan.',
  'marathon-ready': 'Log your very last training run before race day. This is the final step before the marathon.',
}

interface BadgesProps {
  runs: RunEntry[]
}

export default function Badges({ runs }: BadgesProps) {
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: isMobile ? 8 : 16 }}>
      {/* Row 1 */}
      {[BADGES.slice(0, 3), BADGES.slice(3, 6)].map((row, rowIdx) => (
        <div key={rowIdx}>
          <div style={{ display: 'flex', gap: 5, width: '100%' }}>
            {row.map((badge) => {
              const unlocked = isUnlocked(badge.id, runs)
              const isSelected = selected === badge.id
              return (
                <div
                  key={badge.id}
                  className="flex flex-col items-center cursor-pointer"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: isMobile ? '10px 6px' : '12px 8px',
                    border: unlocked
                      ? '1.5px solid rgba(0,200,110,0.35)'
                      : '1.5px dashed rgba(0,0,0,0.15)',
                    borderRadius: 10,
                    background: 'white',
                  }}
                  onClick={() => { haptic('light'); setSelected(isSelected ? null : badge.id) }}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 20 : 24,
                      filter: unlocked ? 'none' : 'grayscale(100%)',
                      opacity: unlocked ? 1 : 0.3,
                    }}
                  >
                    {badge.emoji}
                  </span>
                  <span
                    className="font-inter font-semibold text-center leading-tight"
                    style={{ fontSize: isMobile ? 11 : 12, color: unlocked ? '#0d0d0d' : '#aaa', marginTop: 6 }}
                  >
                    {badge.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: unlocked ? '#00c86e' : '#aaa',
                      marginTop: 4,
                    }}
                  >
                    {unlocked ? '✓' : getProgress(badge.id, runs)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Expandable detail for selected badge in this row */}
          <AnimatePresence>
            {row.some((b) => b.id === selected) && (() => {
              const badge = row.find((b) => b.id === selected)!
              const unlocked = isUnlocked(badge.id, runs)
              return (
                <motion.div
                  key={badge.id}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => { haptic('light'); setSelected(null) }}
                    style={{ padding: '10px 4px 4px' }}
                  >
                    <p
                      className="font-inter"
                      style={{
                        fontSize: 12,
                        color: '#888',
                        lineHeight: 1.45,
                        textAlign: 'center',
                      }}
                    >
                      {HOW_TO[badge.id]}
                    </p>
                    {!unlocked && (
                      <p
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#aaa',
                          textAlign: 'center',
                          marginTop: 4,
                        }}
                      >
                        {getProgress(badge.id, runs)}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })()}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
