import { useState, useEffect } from 'react'
import Badges from './Badges'
import {
  getCurrentWeek,
  getDaysRemaining,
  getWeekDates,
  getRunTargets,
  getRunTypeInfo,
  getTotalWeeks,
} from '../data/trainingPlan'
import { getRunTypeStyle } from '../utils/runTypeStyles'
import { DAY_NAMES, formatShortDate, isToday, toDateKey } from '../utils/dateHelpers'
import { RUN_TOOLTIP_KEY } from '../utils/storage'
import { burstConfetti } from '../utils/confetti'
import { haptic } from '../utils/haptics'
import type { RunEntry } from '../types'

interface DashboardProps {
  runs: RunEntry[]
  viewingWeek: number
  onOpenLog: (date: Date, dayIndex: number, week: number) => void
  onChangeWeek: (week: number) => void
}

export default function Dashboard({ runs, viewingWeek, onOpenLog, onChangeWeek }: DashboardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  useEffect(() => {
    if (localStorage.getItem(RUN_TOOLTIP_KEY)) return
    const timer = setTimeout(() => setShowTooltip(true), 800)
    return () => clearTimeout(timer)
  }, [])
  function dismissTooltip() {
    setShowTooltip(false)
    localStorage.setItem(RUN_TOOLTIP_KEY, 'true')
  }

  const daysRemaining = getDaysRemaining()
  const weekDates = getWeekDates(viewingWeek)
  const runTargets = getRunTargets(viewingWeek)
  const weekTarget = runTargets.reduce((sum, r) => sum + r.distance, 0)


  const kmLogged = runs
    .filter((r) => r.week === viewingWeek)
    .reduce((sum, r) => sum + r.distance, 0)

  // Confetti on week completion
  useEffect(() => {
    if (weekTarget <= 0 || kmLogged < weekTarget) return
    const key = `confetti-w${viewingWeek}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, 'true')
    haptic('success')
    burstConfetti()
  }, [kmLogged, weekTarget, viewingWeek])

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
      {/* Week Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: -8 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button
            className="font-inter"
            onClick={() => { haptic('light'); onChangeWeek(viewingWeek - 1) }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 300,
              color: '#0d0d0d',
              cursor: 'pointer',
              visibility: viewingWeek <= 1 ? 'hidden' : 'visible',
            }}
          >
            ‹
          </button>
          <p
            className="font-inter text-center"
            style={{ fontSize: 14, fontWeight: 600, color: '#888', margin: 0, minWidth: 120, textAlign: 'center' }}
          >
            Week {viewingWeek} of {getTotalWeeks()}
          </p>
          <button
            className="font-inter"
            onClick={() => { haptic('light'); onChangeWeek(viewingWeek + 1) }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 300,
              color: '#0d0d0d',
              cursor: 'pointer',
              visibility: viewingWeek >= getTotalWeeks() ? 'hidden' : 'visible',
            }}
          >
            ›
          </button>
        </div>
        <div
          className="font-inter"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#aaa',
            cursor: 'pointer',
            marginTop: 4,
            opacity: viewingWeek !== getCurrentWeek() ? 1 : 0,
            transition: 'opacity 0.2s',
            pointerEvents: viewingWeek !== getCurrentWeek() ? 'auto' : 'none',
          }}
          onClick={() => onChangeWeek(getCurrentWeek())}
        >
          Today →
        </div>
      </div>

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
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#00c86e"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            filter="url(#glow)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
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
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: showTooltip ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-6px)',
              marginBottom: 8,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: 'none',
              opacity: showTooltip ? 1 : 0,
              transition: 'opacity 0.3s, transform 0.3s',
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
          </div>
          <div style={{ display: 'flex', gap: 5, width: '100%' }}>
            {(() => {
              const todayMidnight = new Date()
              todayMidnight.setHours(0, 0, 0, 0)
              const entries = weekDates.map((date, index) => ({ date, index }))
                .sort((a, b) => a.date.getTime() - b.date.getTime())
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
                <div
                  key={date.toISOString()}
                  className="flex flex-col items-center cursor-pointer run-card"
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
                    transition: 'transform 0.1s',
                  }}
                  onClick={() => { haptic('medium'); onOpenLog(date, index, viewingWeek) }}
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
                </div>
              )
            })}
          </div>
        </div>

      <Badges runs={runs} />
    </div>
  )
}
