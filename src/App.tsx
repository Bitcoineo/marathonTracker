import { useState, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import History from './components/History'
import Program from './components/Program'
import LogRun from './components/LogRun'
import Onboarding from './components/Onboarding'
import { getCurrentWeek, getTotalWeeks, getDayIndex } from './data/trainingPlan'
import { useWindowWidth } from './hooks/useWindowWidth'
import { toDateKey } from './utils/dateHelpers'
import type { RunEntry } from './types'

const STORAGE_KEY = 'marathon-runs'
const TABS = ['Now', 'History', 'Program'] as const
type Tab = (typeof TABS)[number]

function loadRuns(): RunEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

interface ModalState {
  date: Date
  dayIndex: number
  week: number
  existingRun?: RunEntry
}

function App() {
  const [onboarded, setOnboarded] = useState(
    () => localStorage.getItem('onboardingComplete') === 'true'
  )
  const [runs, setRuns] = useState<RunEntry[]>(loadRuns)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Now')

  const currentWeek = getCurrentWeek()
  const [viewingWeek, setViewingWeek] = useState(currentWeek)
  const isMobile = useWindowWidth() < 768

  // Slide direction for tab transitions
  const slideDirection = useRef<'left' | 'right'>('right')

  function switchTab(newTab: Tab) {
    const oldIndex = TABS.indexOf(activeTab)
    const newIndex = TABS.indexOf(newTab)
    if (newIndex === oldIndex) return
    slideDirection.current = newIndex > oldIndex ? 'right' : 'left'
    setActiveTab(newTab)
  }

  // Swipe gesture
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [swipeHintVisible, setSwipeHintVisible] = useState(
    () => localStorage.getItem('swipeHintSeen') !== 'true'
  )

  useEffect(() => {
    if (!swipeHintVisible) return
    const timer = setTimeout(() => {
      setSwipeHintVisible(false)
      localStorage.setItem('swipeHintSeen', 'true')
    }, 3000)
    return () => clearTimeout(timer)
  }, [swipeHintVisible])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs))
    window.dispatchEvent(new Event('runs-updated'))
  }, [runs])

  function handleOpenLog(date: Date, dayIndex: number, week: number) {
    const dateKey = toDateKey(date)
    const existing = runs.find((r) => r.date === dateKey)
    setModal({ date, dayIndex, week, existingRun: existing })
  }

  function handleSave(entry: RunEntry) {
    setRuns((prev) => {
      const idx = prev.findIndex((r) => r.id === entry.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next
      }
      // Guard: overwrite if same date already logged
      const dateIdx = prev.findIndex((r) => r.date === entry.date)
      if (dateIdx >= 0) {
        const next = [...prev]
        next[dateIdx] = entry
        return next
      }
      return [...prev, entry]
    })
    setModal(null)
  }

  function handleDelete(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id))
    setModal(null)
  }

  function handleEdit(run: RunEntry) {
    const date = new Date(run.date + 'T00:00:00')
    const dow = date.getDay()
    const dayIndex = getDayIndex(dow)
    setModal({ date, dayIndex, week: run.week, existingRun: run })
  }

  if (!onboarded) {
    return <Onboarding onComplete={() => setOnboarded(true)} />
  }

  return (
    <div
      className="bg-bg"
      style={{
        height: '100dvh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: isMobile ? 12 : 32,
        paddingLeft: isMobile ? 16 : 48,
        paddingRight: isMobile ? 16 : 48,
      }}
    >
      {/* Top Bar */}
      <div className="w-full flex items-center" style={{ justifyContent: isMobile ? 'center' : 'space-between' }}>
        <p
          onClick={() => { switchTab('Now'); setViewingWeek(currentWeek) }}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: isMobile ? 18 : 20,
            letterSpacing: '-0.02em',
            color: '#0d0d0d',
            textTransform: 'uppercase' as const,
            cursor: 'pointer',
            textAlign: 'center',
            width: '100%',
            display: 'block',
          }}
        >
          marathon tracker
        </p>
        <div className="flex items-center gap-1" style={{ display: isMobile ? 'none' : undefined }}>
          <button
            onClick={() => setViewingWeek((w) => w - 1)}
            disabled={viewingWeek === 1}
            className="font-inter bg-transparent border-none cursor-pointer p-2"
            style={{
              fontSize: 16,
              color: '#aaa',
              opacity: viewingWeek === 1 ? 0.3 : 1,
              cursor: viewingWeek === 1 ? 'default' : 'pointer',
            }}
          >
            ‹
          </button>
          <span
            className="font-inter text-[#aaa]"
            style={{ fontSize: isMobile ? 13 : 15 }}
          >
            Week {viewingWeek} of {getTotalWeeks()}
          </span>
          <button
            onClick={() => setViewingWeek((w) => w + 1)}
            disabled={viewingWeek === currentWeek}
            className="font-inter bg-transparent border-none cursor-pointer p-2"
            style={{
              fontSize: 16,
              color: '#aaa',
              opacity: viewingWeek === currentWeek ? 0.3 : 1,
              cursor: viewingWeek === currentWeek ? 'default' : 'pointer',
            }}
          >
            ›
          </button>
          {viewingWeek !== currentWeek && (
            <button
              onClick={() => setViewingWeek(currentWeek)}
              className="font-inter border-none cursor-pointer"
              style={{
                fontSize: 11,
                color: '#00c86e',
                backgroundColor: '#00c86e1a',
                padding: '4px 8px',
                borderRadius: 999,
              }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex py-4"
        style={{
          justifyContent: 'center',
          gap: 32,
          width: '100%',
          minHeight: isMobile ? 44 : undefined,
          alignItems: 'center',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className="font-inter bg-transparent border-none cursor-pointer outline-none"
            style={{
              fontSize: 13,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? '#0d0d0d' : '#aaa',
              minHeight: isMobile ? 44 : undefined,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tab}
            {activeTab === tab && (
              <span style={{
                display: 'block',
                width: 24,
                height: 2,
                background: '#0d0d0d',
                borderRadius: 1,
                marginTop: 4,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Swipe hint */}
      <div
        className="font-inter"
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#bbb',
          opacity: swipeHintVisible ? 1 : 0,
          transition: 'opacity 0.5s',
          height: 16,
          pointerEvents: 'none',
        }}
      >
        ← swipe to navigate →
      </div>

      {/* Content */}
      <div
        className="flex-1"
        style={{
          overflowY: activeTab === 'Now' ? 'hidden' : 'auto',
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
          touchStartY.current = e.touches[0].clientY
        }}
        onTouchEnd={(e) => {
          const deltaX = e.changedTouches[0].clientX - touchStartX.current
          const deltaY = e.changedTouches[0].clientY - touchStartY.current
          if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) return
          const currentIndex = TABS.indexOf(activeTab)
          const nextIndex = deltaX < 0
            ? Math.min(currentIndex + 1, TABS.length - 1)
            : Math.max(currentIndex - 1, 0)
          if (nextIndex !== currentIndex) switchTab(TABS[nextIndex])
        }}
      >
        <div
          key={activeTab}
          className={slideDirection.current === 'right' ? 'slide-from-right' : 'slide-from-left'}
          style={{ height: '100%' }}
        >
          {activeTab === 'Now' && (
            <Dashboard runs={runs} viewingWeek={viewingWeek} onOpenLog={handleOpenLog} onChangeWeek={setViewingWeek} />
          )}
          {activeTab === 'History' && <History onEdit={handleEdit} />}
          {activeTab === 'Program' && <Program runs={runs} viewingWeek={viewingWeek} />}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <LogRun
            date={modal.date}
            dayIndex={modal.dayIndex}
            week={modal.week}
            existingRun={modal.existingRun}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
