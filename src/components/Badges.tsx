import { getWeekDates, getRunTargets, getTotalWeeks, getDayIndex } from '../data/trainingPlan'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../utils/breakpoints'
import { toDateKey } from '../utils/dateHelpers'
import type { RunEntry } from '../types'

const BADGES = [
  { id: 'first-run', emoji: '🏃', name: 'First Run', desc: 'log your first run' },
  { id: '3-week-streak', emoji: '📅', name: '3 Week Streak', desc: '3 consecutive weeks with all runs logged' },
  { id: 'long-20km', emoji: '🔟', name: 'Long Run 20km', desc: 'log a single run of 20km+' },
  { id: 'interval-warrior', emoji: '⚡', name: 'Interval Warrior', desc: 'complete 5 interval sessions' },
  { id: 'peak-week', emoji: '🏔️', name: 'Peak Week', desc: 'complete all 3 runs in week 14' },
  { id: 'marathon-ready', emoji: '🏁', name: 'Marathon Ready', desc: 'log your final Saturday run' },
]

function isUnlocked(id: string, runs: RunEntry[]): boolean {
  switch (id) {
    case 'first-run':
      return runs.length > 0
    case '3-week-streak':
      for (let w = 1; w <= getTotalWeeks() - 2; w++) {
        if (
          runs.filter((r) => r.week === w).length >= 3 &&
          runs.filter((r) => r.week === w + 1).length >= 3 &&
          runs.filter((r) => r.week === w + 2).length >= 3
        ) return true
      }
      return false
    case 'long-20km':
      return runs.some((r) => r.distance >= 20)
    case 'interval-warrior':
      return runs.filter((r) => {
        const dow = new Date(r.date + 'T00:00:00').getDay()
        return getRunTargets(r.week)[getDayIndex(dow)]?.type === 'interval'
      }).length >= 5
    case 'peak-week':
      return runs.filter((r) => r.week === 14).length >= 3
    case 'marathon-ready': {
      const satDate = getWeekDates(getTotalWeeks())[2]
      const satKey = toDateKey(satDate)
      return runs.some((r) => r.date === satKey)
    }
    default:
      return false
  }
}

interface BadgesProps {
  runs: RunEntry[]
}

export default function Badges({ runs }: BadgesProps) {
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT
  const circleSize = 48

  return (
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
          <div key={badge.id} className="flex flex-col items-center">
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
  )
}
