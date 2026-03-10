import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
const History = lazy(() => import('./components/History'))
const Program = lazy(() => import('./components/Program'))
import LogRun from './components/LogRun'
const Onboarding = lazy(() => import('./components/Onboarding'))
import { getCurrentWeek, getDayIndex } from './data/trainingPlan'
import { useWindowWidth } from './hooks/useWindowWidth'
import { toDateKey } from './utils/dateHelpers'
import { RUNS_KEY, ONBOARDING_KEY, SWIPE_HINT_KEY } from './utils/storage'
import { haptic } from './utils/haptics'
import { MOBILE_BREAKPOINT } from './utils/breakpoints'
import type { RunEntry } from './types'

const TABS = ['Now', 'History', 'Program'] as const
type Tab = (typeof TABS)[number]

function loadRuns(): RunEntry[] {
  try {
    const stored = localStorage.getItem(RUNS_KEY)
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
    () => localStorage.getItem(ONBOARDING_KEY) === 'true'
  )
  const [runs, setRuns] = useState<RunEntry[]>(loadRuns)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Now')

  const currentWeek = getCurrentWeek()
  const [viewingWeek, setViewingWeek] = useState(currentWeek)
  const isMobile = useWindowWidth() < MOBILE_BREAKPOINT

  // Slide direction for tab transitions
  const slideDirection = useRef<'left' | 'right'>('right')

  function switchTab(newTab: Tab) {
    const oldIndex = TABS.indexOf(activeTab)
    const newIndex = TABS.indexOf(newTab)
    if (newIndex === oldIndex) return
    slideDirection.current = newIndex > oldIndex ? 'right' : 'left'
    haptic('light')
    setActiveTab(newTab)
  }

  // Swipe gesture
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const [swipeHintVisible, setSwipeHintVisible] = useState(
    () => localStorage.getItem(SWIPE_HINT_KEY) !== 'true'
  )

  useEffect(() => {
    if (!swipeHintVisible) return
    const timer = setTimeout(() => {
      setSwipeHintVisible(false)
      localStorage.setItem(SWIPE_HINT_KEY, 'true')
    }, 3000)
    return () => clearTimeout(timer)
  }, [swipeHintVisible])

  useEffect(() => {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs))
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
    return <Suspense fallback={null}><Onboarding onComplete={() => setOnboarded(true)} /></Suspense>
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
      <div className="w-full flex items-center" style={{ justifyContent: 'center' }}>
        <p
          onClick={() => { switchTab('Now'); setViewingWeek(currentWeek) }}
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: isMobile ? 22 : 24,
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
          if (nextIndex !== currentIndex) {
            haptic('medium')
            switchTab(TABS[nextIndex])
          }
        }}
      >
        <div
          key={activeTab}
          className={slideDirection.current === 'right' ? 'slide-from-right' : 'slide-from-left'}
          style={{ height: '100%' }}
        >
          <Suspense fallback={null}>
            {activeTab === 'Now' && (
              <Dashboard runs={runs} viewingWeek={viewingWeek} onOpenLog={handleOpenLog} onChangeWeek={setViewingWeek} />
            )}
            {activeTab === 'History' && <History onEdit={handleEdit} />}
            {activeTab === 'Program' && <Program runs={runs} viewingWeek={viewingWeek} />}
          </Suspense>
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
