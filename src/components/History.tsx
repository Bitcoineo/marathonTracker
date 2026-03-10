import { useState, useEffect, useRef } from 'react'
import {
  getCurrentWeek,
  getWeekTarget,
  getWeekDates,
  getRunTargets,
  getTotalWeeks,
} from '../data/trainingPlan'
import { haptic } from '../utils/haptics'
import { useWindowWidth } from '../hooks/useWindowWidth'
import Footer from './Footer'
import StatsRow from './ui/StatsRow'
import RunTypeBadge from './ui/RunTypeBadge'
import ExpandableSection from './ui/ExpandableSection'
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
      <p className="font-mono text-[11px] text-muted uppercase tracking-[0.1em] mb-4">
        Km Per Week
      </p>
      <svg width={width} height={H} style={{ display: 'block', overflow: 'visible' }} role="img" aria-label="Weekly kilometers chart">
        <polyline fill="none" stroke="#ccc" strokeWidth={1.5} strokeDasharray="4 4" points={targetPts} />
        <polyline fill="none" stroke="var(--color-green)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={loggedPts} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.logged)} r={3.5} fill="var(--color-green)" />
            <circle cx={toX(i)} cy={toY(d.logged)} r={14} fill="transparent"
              onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => { haptic('light'); setHoveredPoint(i) }} onTouchEnd={() => setHoveredPoint(null)}
            />
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
            fontSize="11" fontFamily="Inter, system-ui, sans-serif" fill="var(--color-muted)">
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
          <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>{data[hoveredPoint].logged}km</span>
          <span style={{ color: 'var(--color-muted)' }}> / {data[hoveredPoint].target}km</span>
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
      <div className="mb-6">
        <StatsRow stats={historyStats} valueFontSize={24} />
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
                borderBottom: !isLast ? '1px solid var(--color-divider)' : undefined,
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={`history-week-${w}`}
              onClick={() => { haptic('light'); setExpanded(isExpanded ? null : w) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('light'); setExpanded(isExpanded ? null : w) } }}
            >
              <div>
                <p className="font-inter font-semibold text-[15px] text-text">
                  Week {w}
                </p>
                <p className="font-inter text-[12px] text-muted">
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
                          backgroundColor: logged ? 'var(--color-green)' : 'transparent',
                          border: logged ? 'none' : '1.5px solid var(--color-border-strong)',
                        }}
                      />
                    )
                  })}
                </div>
                <span
                  className="font-mono font-bold text-[14px]"
                  style={{ color: completed ? 'var(--color-green)' : 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}
                >
                  {Math.round(totalLogged * 10) / 10} / {weekTarget}km
                </span>
              </div>
            </div>

            <ExpandableSection isExpanded={isExpanded} ariaId={`history-week-${w}`}>
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
                        return (
                          <div
                            key={dateKey}
                            className={`flex items-center gap-2 rounded-lg${loggedRun ? ' cursor-pointer hover:bg-black/[0.03]' : ''}`}
                            style={{ padding: '6px 8px', margin: '0 -8px' }}
                            role={loggedRun ? 'button' : undefined}
                            tabIndex={loggedRun ? 0 : undefined}
                            onClick={loggedRun ? () => { haptic('medium'); onEdit(loggedRun) } : undefined}
                            onKeyDown={loggedRun ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic('medium'); onEdit(loggedRun) } } : undefined}
                          >
                            <span className="font-inter text-[12px] text-muted" style={{ minWidth: 28 }}>
                              {DAY_NAMES[date.getDay()]}
                            </span>
                            {loggedRun ? (
                              <>
                                <span className="font-inter text-[13px] text-green font-medium">
                                  ✓ {loggedRun.distance}km
                                </span>
                                {loggedRun.feel && (
                                  <span className="text-[13px]">{loggedRun.feel}</span>
                                )}
                              </>
                            ) : isPast ? (
                              <span className="font-inter text-[13px] text-muted">
                                missed
                              </span>
                            ) : (
                              <span className="font-inter text-[13px] text-muted">
                                {target?.distance ?? 0}km
                              </span>
                            )}
                            {target && <RunTypeBadge type={target.type} />}
                          </div>
                        )
                      })
                    })()}
                  </div>
            </ExpandableSection>
          </div>
        )
      })}

      {runs.length === 0 && (
        <p className="font-inter text-[14px] text-muted text-center py-8" role="status">
          No runs logged yet — start training to see your history
        </p>
      )}
      <Footer />
    </div>
    </div>
  )
}
