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
  const circleSize = 48
  const [selected, setSelected] = useState<string | null>(null)

  const selectedBadge = BADGES.find((b) => b.id === selected)
  const selectedUnlocked = selectedBadge ? isUnlocked(selectedBadge.id, runs) : false

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: isMobile ? 16 : 20,
          marginTop: isMobile ? 8 : 16,
        }}
      >
        {BADGES.map((badge) => {
          const unlocked = isUnlocked(badge.id, runs)
          return (
            <div
              key={badge.id}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => { haptic('light'); setSelected(selected === badge.id ? null : badge.id) }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: circleSize,
                  height: circleSize,
                  backgroundColor: unlocked ? '#ffffff' : '#e8e5e0',
                }}
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
              </div>
              <span
                className="font-inter font-medium text-center leading-tight"
                style={{ fontSize: 11, color: unlocked ? '#0d0d0d' : '#aaa', marginTop: 4 }}
              >
                {badge.name}
              </span>
            </div>
          )
        })}
      </div>

      {/* Inline badge detail card */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            key={selectedBadge.id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ marginTop: 12 }}
          >
            <div
              className="cursor-pointer"
              onClick={() => { haptic('light'); setSelected(null) }}
              style={{
                background: '#ffffff',
                borderRadius: 10,
                border: selectedUnlocked ? '1.5px solid rgba(0,200,110,0.35)' : '1.5px dashed rgba(0,0,0,0.15)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {/* Badge emoji */}
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: selectedUnlocked ? '#f0ede8' : '#e8e5e0',
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    filter: selectedUnlocked ? 'none' : 'grayscale(100%)',
                    opacity: selectedUnlocked ? 1 : 0.35,
                  }}
                >
                  {selectedBadge.emoji}
                </span>
              </div>

              {/* Text content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <p
                    className="font-inter"
                    style={{ fontWeight: 600, fontSize: 14, color: '#0d0d0d' }}
                  >
                    {selectedBadge.name}
                  </p>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: selectedUnlocked ? '#00c86e' : '#aaa',
                      backgroundColor: selectedUnlocked ? 'rgba(0,200,110,0.1)' : 'rgba(0,0,0,0.04)',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {getProgress(selectedBadge.id, runs)}
                  </span>
                </div>
                <p
                  className="font-inter"
                  style={{
                    fontSize: 12,
                    color: '#888',
                    lineHeight: 1.4,
                    marginTop: 4,
                  }}
                >
                  {HOW_TO[selectedBadge.id]}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
