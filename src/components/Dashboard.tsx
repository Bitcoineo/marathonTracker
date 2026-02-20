import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Badges from './Badges'
import {
  getDaysRemaining,
  getWeekDates,
  getRunTargets,
  getRunTypeInfo,
  getTotalWeeks,
} from '../data/trainingPlan'
import { getRunTypeStyle } from '../utils/runTypeStyles'
import { DAY_NAMES, formatShortDate, isToday, toDateKey } from '../utils/dateHelpers'
import type { RunEntry } from '../types'

interface DashboardProps {
  runs: RunEntry[]
  viewingWeek: number
  onOpenLog: (date: Date, dayIndex: number, week: number) => void
}

export default function Dashboard({ runs, viewingWeek, onOpenLog }: DashboardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  useEffect(() => {
    if (localStorage.getItem('hasSeenRunTooltip')) return
    const timer = setTimeout(() => setShowTooltip(true), 800)
    return () => clearTimeout(timer)
  }, [])
  function dismissTooltip() {
    setShowTooltip(false)
    localStorage.setItem('hasSeenRunTooltip', 'true')
  }

  const daysRemaining = getDaysRemaining()
  const weekDates = getWeekDates(viewingWeek)
  const runTargets = getRunTargets(viewingWeek)
  const weekTarget = runTargets.reduce((sum, r) => sum + r.distance, 0)


  const kmLogged = runs
    .filter((r) => r.week === viewingWeek)
    .reduce((sum, r) => sum + r.distance, 0)

  // Progress ring
  const radius = 75
  const strokeWidth = 10
  const size = radius * 2 + strokeWidth * 2 + 40
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const progress = weekTarget > 0 ? Math.min(kmLogged / weekTarget, 1) : 0
  const strokeDashoffset = circumference * (1 - progress)

  const foWidth = 160
  const foHeight = 70

  const stats = [
    { value: daysRemaining, label: 'Days to Go' },
    { value: weekTarget, label: 'Km Target' },
    { value: Math.round(kmLogged * 10) / 10, label: 'Km Logged' },
  ]

  // Map runs by date for quick lookup
  const runsByDate = new Map<string, RunEntry>()
  for (const run of runs) {
    runsByDate.set(run.date, run)
  }

  const numSlots = weekDates.length
  const fonts = numSlots === 5
    ? { day: 12, date: 10, km: 14, tag: 9, bpm: 9 }
    : numSlots === 4
    ? { day: 13, date: 10, km: 14, tag: 9, bpm: 8 }
    : { day: 15, date: 11, km: 16, tag: 10, bpm: 10 }
  const cardPadding = numSlots === 5 ? '10px 6px' : numSlots === 4 ? '8px 4px' : '10px 4px'

  return (
    <div
      className="flex-1 flex flex-col items-center"
      style={{
        height: '100%',
        justifyContent: 'space-between',
        gap: 16,
        paddingTop: 16,
        paddingBottom: 24,
        paddingLeft: 20,
        paddingRight: 20,
        overflow: 'hidden',
      }}
    >
      {/* Week Label */}
        <p
          className="font-inter text-center"
          style={{ fontSize: 14, fontWeight: 600, color: '#888', margin: 0, marginBottom: -8 }}
        >
          Week {viewingWeek} of {getTotalWeeks()}
        </p>

      {/* Progress Ring */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <filter id="glow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00c86e" />
            </filter>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#00c86e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            transform={`rotate(-90 ${center} ${center})`}
            filter="url(#glow)"
          />
          <foreignObject
            x={center - foWidth / 2}
            y={center - foHeight / 2}
            width={foWidth}
            height={foHeight}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ fontSize: 52, fontWeight: 700, color: '#0d0d0d', lineHeight: 1 }}>
                {Math.round(kmLogged * 10) / 10}
              </span>
              <span style={{ fontSize: 14, fontWeight: 400, color: '#aaa', marginTop: 2 }}>
                / {weekTarget}km
              </span>
            </div>
          </foreignObject>
        </svg>

        {/* Stats Row */}
        <div className="flex max-w-[360px] w-full">
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center"
              style={{
                minWidth: 0,
                overflow: 'hidden',
                ...(i < stats.length - 1 ? { borderRight: '1px solid rgba(0,0,0,0.06)' } : {}),
              }}
            >
              <span
                className="font-inter font-bold text-text leading-none"
                style={{
                  fontSize: 28,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
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

        {/* This Week */}
        <div style={{ position: 'relative' }} onClickCapture={showTooltip ? dismissTooltip : undefined}>
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: 8,
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <span
                  className="font-inter"
                  style={{
                    background: 'white',
                    color: '#aaa',
                    fontSize: 12,
                    fontWeight: 400,
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tap a card to log your run
                </span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderTop: 'none',
                    borderLeft: 'none',
                    transform: 'rotate(45deg)',
                    marginTop: -6,
                    boxShadow: '2px 2px 4px rgba(0,0,0,0.04)',
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div style={{ display: 'flex', gap: 5, width: '100%' }}>
            {(() => {
              const todayMidnight = new Date()
              todayMidnight.setHours(0, 0, 0, 0)
              const entries = weekDates.map((date, index) => ({ date, index }))
              if (viewingWeek === 1 && entries.some(e => e.date >= todayMidnight)) {
                return entries.filter(e => e.date >= todayMidnight)
              }
              return entries
            })().map(({ date, index }) => {
              const today = isToday(date)
              const dateKey = toDateKey(date)
              const existingRun = runsByDate.get(dateKey)
              const completed = !!existingRun
              const target = runTargets[index] ?? { distance: 0, type: 'easy' as const }

              return (
                <motion.div
                  key={date.toISOString()}
                  className="flex flex-col items-center cursor-pointer"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 100,
                    padding: cardPadding,
                    border: completed
                      ? '1.5px solid rgba(0,200,110,0.35)'
                      : today
                        ? '1.5px dashed rgba(0,200,110,0.4)'
                        : '1.5px dashed rgba(0,0,0,0.15)',
                    borderRadius: 10,
                    background: 'white',
                  }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onOpenLog(date, index, viewingWeek)}
                >
                  {completed ? (
                    <span style={{ fontSize: 11, color: '#00c86e', marginBottom: 4 }}>
                      ✓
                    </span>
                  ) : (
                    <span style={{ height: 11, marginBottom: 4 }} />
                  )}
                  <p
                    className="font-inter"
                    style={{ fontSize: fonts.day, fontWeight: 700, color: completed ? '#00c86e' : '#0d0d0d' }}
                  >
                    {DAY_NAMES[date.getDay()]}
                  </p>
                  <p className="font-inter text-muted" style={{ fontSize: fonts.date }}>
                    {formatShortDate(date)}
                  </p>
                  <p
                    className="font-inter font-bold mt-1"
                    style={{ fontSize: fonts.km, color: completed ? '#00c86e' : '#0d0d0d' }}
                  >
                    {completed ? `${existingRun.distance}km` : `${target.distance}km`}
                  </p>
                  {(() => {
                    const info = getRunTypeInfo(target.type)
                    const style = getRunTypeStyle(target.type)
                    const hr = target.hrZone ?? info.hr
                    return (
                      <>
                        <span
                          className="font-mono mt-1"
                          style={{
                            fontSize: fonts.tag,
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
                        {fonts.bpm > 0 && (
                          <span
                            className="font-mono"
                            style={{ fontSize: fonts.bpm, color: '#aaa', marginTop: 2, textAlign: 'center' }}
                          >
                            {hr.min}–{hr.max} bpm
                          </span>
                        )}
                      </>
                    )
                  })()}
                </motion.div>
              )
            })}
          </div>
        </div>

      <Badges runs={runs} />
    </div>
  )
}
