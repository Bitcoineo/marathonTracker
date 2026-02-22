import { useState, useEffect, useRef } from 'react'
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

interface ChartPoint { name: string; logged: number; target: number }

function WeekChart({ data, isMobile }: { data: ChartPoint[]; isMobile: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(300)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    obs.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => obs.disconnect()
  }, [])

  const H = isMobile ? 120 : 160
  const padT = 12, padB = 28, padL = 8, padR = 8
  const plotW = width - padL - padR
  const plotH = H - padT - padB
  const n = data.length

  const allVals = data.flatMap(d => [d.logged, d.target]).filter(v => v > 0)
  const maxVal = allVals.length ? Math.max(...allVals) : 1
  const minVal = allVals.length ? Math.min(...allVals) : 0
  const floor = Math.max(0, minVal * 0.7)
  const ceiling = maxVal * 1.12
  const range = ceiling - floor || 1

  const toX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2)
  const toY = (v: number) => padT + plotH - ((v - floor) / range) * plotH

  const targetPts = data.map((d, i) => `${toX(i)},${toY(d.target)}`).join(' ')
  const loggedPts = data.map((d, i) => `${toX(i)},${toY(d.logged)}`).join(' ')

  return (
    <div ref={containerRef} className="mb-8" style={{ position: 'relative' }}>
      <p className="font-mono text-[11px] text-[#aaa] uppercase tracking-[0.1em] mb-4">
        Km Per Week
      </p>
      <svg width={width} height={H} style={{ display: 'block', overflow: 'visible' }}>
        <polyline fill="none" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" points={targetPts} />
        <polyline fill="none" stroke="#00c86e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={loggedPts} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.logged)} r={3.5} fill="#00c86e" />
            <circle cx={toX(i)} cy={toY(d.logged)} r={14} fill="transparent"
              onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint(i)} onTouchEnd={() => setHoveredPoint(null)}
            />
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
            fontSize="11" fontFamily="Inter, system-ui, sans-serif" fill="#aaa">
            {d.name}
          </text>
        ))}
      </svg>
      {hoveredPoint !== null && (
        <div style={{
          position: 'absolute',
          left: toX(hoveredPoint),
          top: toY(data[hoveredPoint].logged) - 40,
          transform: 'translateX(-50%)',
          background: '#fff',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <span style={{ color: '#00c86e', fontWeight: 600 }}>{data[hoveredPoint].logged}km</span>
          <span style={{ color: '#aaa' }}> / {data[hoveredPoint].target}km</span>
        </div>
      )}
    </div>
  )
}

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
      {chartData.length > 0 && <WeekChart data={chartData} isMobile={isMobile} />}

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
