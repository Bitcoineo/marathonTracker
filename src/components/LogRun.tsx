import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getRunTargets, getRunTypeInfo } from '../data/trainingPlan'
import { useWindowWidth } from '../hooks/useWindowWidth'
import { MOBILE_BREAKPOINT } from '../utils/breakpoints'
import { DAY_NAMES } from '../utils/dateHelpers'
import type { RunEntry } from '../types'
const FEELS = ['😫', '😓', '😐', '😊', '🔥']
const STEP = 0.5
const MIN = 0.5
const MAX = 50

interface LogRunProps {
  date: Date
  dayIndex: number
  week: number
  existingRun?: RunEntry
  onSave: (entry: RunEntry) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function LogRun({ date, dayIndex, week, existingRun, onSave, onDelete, onClose }: LogRunProps) {
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  const targets = getRunTargets(week)
  const runTarget = targets[dayIndex] ?? { distance: 0, type: 'easy' as const }
  const target = runTarget.distance
  const typeInfo = getRunTypeInfo(runTarget.type)
  const [distance, setDistance] = useState(existingRun?.distance ?? target)
  const [feel, setFeel] = useState(existingRun?.feel ?? '')


  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null)

  const formattedDate = `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${date.toLocaleString('en', { month: 'short' }).toLowerCase()}`

  const adjust = useCallback((delta: number) => {
    setDistance((prev) => {
      const next = Math.round((prev + delta) * 10) / 10
      return Math.max(MIN, Math.min(MAX, next))
    })
  }, [])

  function startHold(delta: number) {
    adjust(delta)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => adjust(delta), 100)
    }, 400)
  }

  function stopHold() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  function handleSave() {
    if (distance <= 0) return
    onSave({
      id: existingRun?.id ?? crypto.randomUUID(),
      date: date.toISOString().split('T')[0],
      distance,
      feel,
      week,
    })
  }

  const btnSize = isMobile ? 36 : 44

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/20 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white z-50"
        style={{
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.08)',
          padding: isMobile ? '20px 16px' : 32,
          maxHeight: isMobile ? '85vh' : undefined,
          overflowY: isMobile ? 'auto' : undefined,
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Title */}
        <p className="font-inter font-semibold text-[18px] text-[#0d0d0d]">
          {formattedDate}
        </p>
        <p className="font-inter text-[13px] text-[#aaa]" style={{ marginBottom: 4 }}>
          target: {target}km
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: typeInfo.color,
              backgroundColor: `${typeInfo.color}1a`,
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            {typeInfo.label}
          </span>
          <span className="font-inter text-[12px] text-[#aaa]">
            {typeInfo.desc}
          </span>
        </div>
        <p className="font-mono mb-4" style={{ fontSize: 13, color: typeInfo.color, marginTop: 4 }}>
          ♥ {typeInfo.hr.min}–{typeInfo.hr.max} bpm
        </p>

        {/* Distance Stepper */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-6">
            <button
              className="flex items-center justify-center rounded-full bg-transparent cursor-pointer select-none"
              style={{ width: btnSize, height: btnSize, border: '1px solid rgba(0,0,0,0.1)' }}
              onPointerDown={() => startHold(-STEP)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
            >
              <span className="font-inter font-light text-[32px] text-[#aaa] leading-none">
                −
              </span>
            </button>
            <span
              className="font-mono text-[#0d0d0d] min-w-[80px] text-center leading-none"
              style={{ fontSize: isMobile ? 44 : 64 }}
            >
              {distance % 1 === 0 ? distance : distance.toFixed(1)}
            </span>
            <button
              className="flex items-center justify-center rounded-full bg-transparent cursor-pointer select-none"
              style={{ width: btnSize, height: btnSize, border: '1px solid rgba(0,0,0,0.1)' }}
              onPointerDown={() => startHold(STEP)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
            >
              <span className="font-inter font-light text-[32px] text-[#aaa] leading-none">
                +
              </span>
            </button>
          </div>
          <span className="font-inter text-[16px] text-[#aaa] mt-1">km</span>
        </div>

        {/* Feel */}
        <div className="flex justify-center gap-4 mb-6">
          {FEELS.map((emoji) => {
            const selected = feel === emoji
            return (
              <div key={emoji} className="flex flex-col items-center">
                <button
                  onClick={() => setFeel(selected ? '' : emoji)}
                  className="cursor-pointer bg-transparent border-none p-1"
                  style={{
                    fontSize: isMobile ? 24 : 28,
                    opacity: selected ? 1 : 0.35,
                    filter: selected ? 'grayscale(0%)' : 'grayscale(100%)',
                    transform: selected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {emoji}
                </button>
                {selected && (
                  <span
                    className="rounded-full mt-1"
                    style={{ width: 4, height: 4, backgroundColor: '#00c86e' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Delete (edit mode only) */}
        {existingRun && onDelete && (
          <button
            onClick={() => onDelete(existingRun.id)}
            className="w-full font-inter text-[13px] font-medium text-[#999] bg-transparent border-none cursor-pointer mb-3"
            style={{ padding: '12px 0', textAlign: 'center' }}
          >
            Delete run
          </button>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          className={`w-full bg-[#0d0d0d] text-white font-inter font-semibold text-[15px] rounded-xl cursor-pointer border-none ${existingRun ? '' : 'mt-6'}`}
          style={{ padding: isMobile ? '14px 0' : '16px 0' }}
        >
          {existingRun ? 'Update run' : 'Save run'}
        </button>
      </motion.div>
    </>
  )
}
