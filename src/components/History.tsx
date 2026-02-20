import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  getCurrentWeek,
  getWeekTarget,
  getWeekDates,
  getRunTargets,
  getDayIndex,
  getHRZones,
} from '../data/trainingPlan'
import { getRunTypeStyle } from '../utils/runTypeStyles'
import { useWindowWidth } from '../hooks/useWindowWidth'
import Footer from './Footer'
import { formatShortDate, toDateKey } from '../utils/dateHelpers'
import type { RunEntry } from '../types'

interface ChartPayloadItem {
  dataKey: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: ChartPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const logged = payload.find((p) => p.dataKey === 'logged')?.value ?? 0
  const target = payload.find((p) => p.dataKey === 'target')?.value ?? 0
  return (
    <div
      className="font-inter text-[12px]"
      style={{
        background: '#fff',
        padding: '8px 12px',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <span style={{ color: '#0d0d0d' }}>{label}: </span>
      <span style={{ color: '#00c86e', fontWeight: 600 }}>{logged}km</span>
      <span style={{ color: '#aaa' }}> / {target}km</span>
    </div>
  )
}

interface HistoryProps {
  runs: RunEntry[]
  onEdit: (run: RunEntry) => void
}

export default function History({ runs, onEdit }: HistoryProps) {
  const currentWeek = getCurrentWeek()
  const [expanded, setExpanded] = useState<number | null>(null)
  const isMobile = useWindowWidth() < 768

  const weeks = Array.from({ length: currentWeek }, (_, i) => currentWeek - i)
  const dotSize = isMobile ? 10 : 8

  const chartData = Array.from({ length: currentWeek }, (_, i) => {
    const w = i + 1
    const weekRuns = runs.filter((r) => r.week === w)
    const logged = weekRuns.reduce((sum, r) => sum + r.distance, 0)
    return {
      name: `W${w}`,
      logged: Math.round(logged * 10) / 10,
      target: getWeekTarget(w),
    }
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: isMobile ? '0 24px' : '0' }}>
    <div className="pb-8">
      {/* Chart */}
      {currentWeek > 0 && (
        <div className="mb-8">
          <p className="font-mono text-[11px] text-[#aaa] uppercase tracking-[0.1em] mb-4">
            Km Per Week
          </p>
          <ResponsiveContainer width="100%" height={isMobile ? 120 : 160}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#aaa' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                dataKey="target"
                stroke="#ccc"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                dataKey="logged"
                stroke="#00c86e"
                strokeWidth={2}
                dot={{ fill: '#00c86e', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Week List */}
      {weeks.map((w) => {
        const weekDates = getWeekDates(w)
        const weekTarget = getWeekTarget(w)
        const weekRuns = runs.filter((r) => r.week === w)
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
                  className="font-inter font-bold text-[14px]"
                  style={{ color: completed ? '#00c86e' : '#aaa' }}
                >
                  {Math.round(totalLogged * 10) / 10} / {weekTarget}km
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && weekRuns.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-4 pb-3">
                    {weekRuns.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center gap-2 cursor-pointer rounded-lg hover:bg-black/[0.03]"
                        style={{ padding: '6px 8px', margin: '0 -8px' }}
                        onClick={() => onEdit(run)}
                      >
                        {run.feel && (
                          <span className="text-[13px]">{run.feel}</span>
                        )}
                        <span className="font-inter text-[13px] text-[#0d0d0d]">
                          {run.distance}km
                        </span>
                        {(() => {
                          const dow = new Date(run.date + 'T00:00:00').getDay()
                          const dayIndex = getDayIndex(dow)
                          const target = getRunTargets(run.week)[dayIndex]
                          const style = getRunTypeStyle(target.type)
                          const hr = target.hrZone ?? getHRZones()[target.type]
                          return (
                            <>
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
                              <span className="font-mono text-[11px] text-[#e11d48]">
                                ♥ {hr.min}–{hr.max}
                              </span>
                            </>
                          )
                        })()}
                        {run.notes && (
                          <span
                            className="font-inter text-[12px] text-[#aaa] truncate"
                            style={{ maxWidth: isMobile ? 160 : 200 }}
                          >
                            {run.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {currentWeek === 0 && (
        <p className="font-inter text-[14px] text-[#aaa] text-center py-8">
          No history yet — training starts soon
        </p>
      )}
      <Footer />
    </div>
    </div>
  )
}
