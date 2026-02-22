import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getCurrentWeek,
  getWeekTarget,
  getWeekDates,
  getRunTargets,
  getTotalWeeks,
} from '../data/trainingPlan'
import { getRunTypeStyle } from '../utils/runTypeStyles'
import { useWindowWidth } from '../hooks/useWindowWidth'
import Footer from './Footer'
import { DAY_NAMES, formatShortDate, toDateKey } from '../utils/dateHelpers'
import { RUNS_KEY } from '../utils/storage'
import { MOBILE_BREAKPOINT } from '../utils/breakpoints'
import type { RunEntry } from '../types'

function readRuns(): RunEntry[] {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]')
  } catch { return [] }
}

interface HistoryProps {
  onEdit: (run: RunEntry) => void
}

export default function History({ onEdit }: HistoryProps) {
  const [runs, setRuns] = useState<RunEntry[]>(readRuns)
  const currentWeek = getCurrentWeek()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  useEffect(() => {
    const refresh = () => setRuns(readRuns())
    window.addEventListener('storage', refresh)
    window.addEventListener('runs-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('runs-updated', refresh)
    }
  }, [])

  const totalWeeks = getTotalWeeks()
  const weeksWithRuns = new Set(runs.map(r => r.week))

  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .filter(w => w <= Math.max(currentWeek, 1) || weeksWithRuns.has(w))
    .reverse()
  const dotSize = isMobile ? 10 : 8

  const totalKm = Math.round(runs.reduce((sum, r) => sum + r.distance, 0) * 10) / 10
  const totalRuns = runs.length
  const weeksCompleted = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .filter(w => {
      const target = getWeekTarget(w)
      if (target <= 0) return false
      const dateKeys = new Set(getWeekDates(w).map(d => toDateKey(d)))
      const logged = runs.filter(r => dateKeys.has(r.date)).reduce((sum, r) => sum + r.distance, 0)
      return logged >= target
    }).length

  const historyStats = [
    { value: totalKm, label: 'Total Km' },
    { value: totalRuns, label: 'Runs' },
    { value: weeksCompleted, label: 'Weeks Done' },
  ]

  const chartData = Array.from({ length: totalWeeks }, (_, i) => i + 1)
    .filter(w => w <= Math.max(currentWeek, 1) || weeksWithRuns.has(w))
    .map(w => {
      const dateKeys = new Set(getWeekDates(w).map(d => toDateKey(d)))
      const logged = runs
        .filter(r => dateKeys.has(r.date))
        .reduce((sum, r) => sum + r.distance, 0)
      return {
        name: `W${w}`,
        logged: Math.round(logged * 10) / 10,
        target: getWeekTarget(w),
      }
    })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: isMobile ? '0 24px' : '0' }}>
    <div className="pb-8">
      {/* Stats Row */}
      <div className="flex max-w-[360px] w-full mx-auto mb-6">
        {historyStats.map(({ value, label }, i) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center"
            style={{
              minWidth: 0,
              overflow: 'hidden',
              ...(i < historyStats.length - 1 ? { borderRight: '1px solid rgba(0,0,0,0.06)' } : {}),
            }}
          >
            <span
              className="font-inter font-bold text-text leading-none"
              style={{ fontSize: 24 }}
            >
              {value}
            </span>
            <span
              className="font-mono text-muted uppercase tracking-[0.1em] mt-1"
              style={{ fontSize: 10 }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (() => {
        const chartHeight = isMobile ? 120 : 160
        const padTop = 16
        const padBottom = 24
        const padLeft = 4
        const padRight = 4
        const plotH = chartHeight - padTop - padBottom
        const maxVal = Math.max(...chartData.map(d => Math.max(d.target, d.logged)), 1)
        const minVal = Math.min(...chartData.map(d => Math.min(d.logged, d.target)))
        const floor = Math.max(0, minVal * 0.7)
        const ceiling = maxVal * 1.1
        const range = ceiling - floor
        const n = chartData.length
        const stepX = (pt: number, w: number) => padLeft + (n > 1 ? pt / (n - 1) : 0.5) * (w - padLeft - padRight)
        const yPos = (v: number) => padTop + plotH * (1 - (v - floor) / range)

        return (
          <div className="mb-8" style={{ position: 'relative' }}>
            <p className="font-mono text-[11px] text-[#aaa] uppercase tracking-[0.1em] mb-4">
              Km Per Week
            </p>
            <svg width="100%" height={chartHeight + 28} style={{ display: 'block', overflow: 'visible' }} viewBox={`0 0 100 ${chartHeight + 28}`} preserveAspectRatio="none">
              {/* Target line (dashed gray) */}
              <polyline
                fill="none"
                stroke="#ccc"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
                points={chartData.map((d, i) => `${stepX(i, 100)},${yPos(d.target)}`).join(' ')}
              />
              {/* Logged line (solid green) */}
              <polyline
                fill="none"
                stroke="#00c86e"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                points={chartData.map((d, i) => `${stepX(i, 100)},${yPos(d.logged)}`).join(' ')}
              />
              {/* Dots on logged line */}
              {chartData.map((d, i) => (
                <circle
                  key={i}
                  cx={stepX(i, 100)}
                  cy={yPos(d.logged)}
                  r={1.5}
                  fill="#00c86e"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onTouchStart={() => setHoveredPoint(i)}
                  onTouchEnd={() => setHoveredPoint(null)}
                />
              ))}
              {/* X-axis labels */}
              {chartData.map((d, i) => (
                <text
                  key={i}
                  x={stepX(i, 100)}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  fill="#aaa"
                >
                  {d.name}
                </text>
              ))}
            </svg>
            {/* Tooltip */}
            {hoveredPoint !== null && (() => {
              const d = chartData[hoveredPoint]
              const pct = n > 1 ? hoveredPoint / (n - 1) * 100 : 50
              return (
                <div
                  className="font-inter text-[12px]"
                  style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    top: 24,
                    transform: 'translateX(-50%)',
                    background: '#fff',
                    padding: '8px 12px',
                    borderRadius: 8,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <span style={{ color: '#0d0d0d' }}>{d.name}: </span>
                  <span style={{ color: '#00c86e', fontWeight: 600 }}>{d.logged}km</span>
                  <span style={{ color: '#aaa' }}> / {d.target}km</span>
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* Week List */}
      {weeks.map((w) => {
        const weekDates = getWeekDates(w)
        const weekTarget = getWeekTarget(w)
        const weekDateKeys = new Set(weekDates.map(d => toDateKey(d)))
        const weekRuns = runs.filter(r => weekDateKeys.has(r.date))
        const totalLogged = weekRuns.reduce((sum, r) => sum + r.distance, 0)
        const completed = totalLogged >= weekTarget
        const isExpanded = expanded === w
        const isLast = w === 1

        const runDates = new Set(weekRuns.map((r) => r.date))

        return (
          <div key={w}>
            <div
              className="flex items-center justify-between cursor-pointer"
              style={{
                padding: '12px 0',
                borderBottom: !isLast ? '1px solid rgba(0,0,0,0.05)' : undefined,
              }}
              onClick={() => setExpanded(isExpanded ? null : w)}
            >
              <div>
                <p className="font-inter font-semibold text-[15px] text-[#0d0d0d]">
                  Week {w}
                </p>
                <p className="font-inter text-[12px] text-[#aaa]">
                  {formatShortDate(weekDates[0])} – {formatShortDate(weekDates[weekDates.length - 1])}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  {weekDates.map((date) => {
                    const dateKey = toDateKey(date)
                    const logged = runDates.has(dateKey)
                    return (
                      <span
                        key={dateKey}
                        className="rounded-full"
                        style={{
                          width: dotSize,
                          height: dotSize,
                          backgroundColor: logged ? '#00c86e' : 'transparent',
                          border: logged ? 'none' : '1.5px solid rgba(0,0,0,0.15)',
                        }}
                      />
                    )
                  })}
                </div>
                <span
                  className="font-mono font-bold text-[14px]"
                  style={{ color: completed ? '#00c86e' : '#aaa', fontVariantNumeric: 'tabular-nums' }}
                >
                  {Math.round(totalLogged * 10) / 10} / {weekTarget}km
                </span>
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
                    {(() => {
                      const todayMidnight = new Date()
                      todayMidnight.setHours(0, 0, 0, 0)
                      const runTargets = getRunTargets(w)
                      const runsByDate = new Map<string, RunEntry>()
                      for (const r of weekRuns) runsByDate.set(r.date, r)

                      return weekDates.map((date, idx) => {
                        const dateKey = toDateKey(date)
                        const loggedRun = runsByDate.get(dateKey)
                        const target = runTargets[idx]
                        const isPast = date < todayMidnight
                        const style = target ? getRunTypeStyle(target.type) : null

                        return (
                          <div
                            key={dateKey}
                            className={`flex items-center gap-2 rounded-lg${loggedRun ? ' cursor-pointer hover:bg-black/[0.03]' : ''}`}
                            style={{ padding: '6px 8px', margin: '0 -8px' }}
                            onClick={loggedRun ? () => onEdit(loggedRun) : undefined}
                          >
                            <span className="font-inter text-[12px] text-[#aaa]" style={{ minWidth: 28 }}>
                              {DAY_NAMES[date.getDay()]}
                            </span>
                            {loggedRun ? (
                              <>
                                <span className="font-inter text-[13px] text-[#00c86e] font-medium">
                                  ✓ {loggedRun.distance}km
                                </span>
                                {loggedRun.feel && (
                                  <span className="text-[13px]">{loggedRun.feel}</span>
                                )}
                              </>
                            ) : isPast ? (
                              <span className="font-inter text-[13px] text-[#aaa]">
                                missed
                              </span>
                            ) : (
                              <span className="font-inter text-[13px] text-[#aaa]">
                                {target?.distance ?? 0}km
                              </span>
                            )}
                            {style && (
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
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {runs.length === 0 && (
        <p className="font-inter text-[14px] text-[#aaa] text-center py-8">
          No runs logged yet — start training to see your history
        </p>
      )}
      <Footer />
    </div>
    </div>
  )
}
