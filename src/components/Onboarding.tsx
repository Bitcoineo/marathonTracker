import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateTrainingPlan, computeMaxHR } from '../data/generatePlan'
import type { Experience, Sex, PrepWeeksOption } from '../types'
import { clearPlanCache, getHRZones } from '../data/trainingPlan'

interface OnboardingProps {
  onComplete: () => void
}

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: "'Inter', sans-serif",
  fontSize: 16,
  color: '#0d0d0d',
  background: '#ffffff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: '14px 16px',
  outline: 'none',
  boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(0,0,0,0.08)',
  padding: 20,
  borderRadius: 12,
  cursor: 'pointer',
}

const continueStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d0d0d',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  borderRadius: 12,
  padding: '14px 0',
  border: 'none',
  cursor: 'pointer',
  marginTop: 24,
}

const backStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#aaa',
  fontSize: 14,
  cursor: 'pointer',
  marginTop: 12,
  padding: '8px 0',
}

const stepStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minHeight: '100dvh',
  paddingTop: 60,
  paddingBottom: 40,
}

const EXPERIENCE_OPTIONS = [
  { key: 'beginner' as Experience, emoji: '🐣', title: 'Beginner', desc: 'new to running or coming back after a long break' },
  { key: 'intermediate' as Experience, emoji: '🏃', title: 'Intermediate', desc: 'run regularly, completed 5k or 10k races' },
  { key: 'advanced' as Experience, emoji: '🔥', title: 'Advanced', desc: 'half marathon or marathon experience' },
]


const SEX_OPTIONS: { key: Sex; title: string }[] = [
  { key: 'male', title: 'Male' },
  { key: 'female', title: 'Female' },
]

const DAY_NAMES_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const FREQ_OPTIONS = [3, 4, 5] as const
const PREP_OPTIONS: PrepWeeksOption[] = [8, 12, 16, 20]

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)

  const todayISO = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(todayISO)
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [hasRaceDate, setHasRaceDate] = useState<boolean | null>(null)
  const [raceDate, setRaceDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 16 * 7)
    return d.toISOString().split('T')[0]
  })

  const [experience, setExperience] = useState<Experience | null>(null)
  const [runDaysPerWeek, setRunDaysPerWeek] = useState<number>(3)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [prepWeeks, setPrepWeeks] = useState<number | null>(null)

  const [age, setAge] = useState(30)
  const [weight, setWeight] = useState(70)
  const [height, setHeight] = useState(175)
  const [sex, setSex] = useState<Sex | null>(null)

  const maxHR = computeMaxHR(age, sex ?? 'unspecified')
  const zones = getHRZones(maxHR)

  function handleComplete(chosenSex?: Sex) {
    const safeSex = chosenSex ?? sex ?? 'unspecified'
    const safeExperience = experience ?? 'beginner'
    const safeRunDays = runDaysPerWeek ?? 3
    const safeAge = age || 26
    const safeWeight = weight || 70
    const safeHeight = height || 175
    const safePrepWeeks = prepWeeks ?? 16
    const computedMaxHR = computeMaxHR(safeAge, safeSex)

    let computedPrepWeeks: number
    let computedRaceDate: string

    if (hasRaceDate && raceDate) {
      const start = new Date(startDate)
      const race = new Date(raceDate)
      computedPrepWeeks = Math.ceil((race.getTime() - start.getTime()) / (7 * 86_400_000))
      computedRaceDate = raceDate
    } else {
      computedPrepWeeks = safePrepWeeks
      const start = new Date(startDate)
      const race = new Date(start.getTime() + safePrepWeeks * 7 * 86_400_000)
      computedRaceDate = race.toISOString().split('T')[0]
    }

    const { plan, warning } = generateTrainingPlan(safeExperience, computedPrepWeeks, computedMaxHR, safeRunDays, selectedDays)
    localStorage.setItem('trainingPlan', JSON.stringify(plan))
    clearPlanCache()
    localStorage.setItem('onboardingComplete', 'true')
    localStorage.setItem('athleteProfile', JSON.stringify({
      age: safeAge,
      weight: safeWeight,
      height: safeHeight,
      sex: safeSex,
      maxHR: computedMaxHR,
      startDate,
      raceDate: computedRaceDate,
      experience: safeExperience,
      prepWeeks: computedPrepWeeks,
      hasRaceDate: !!hasRaceDate,
      runDaysPerWeek: safeRunDays,
      runDays: selectedDays,
      ...(warning ? { planWarning: warning } : {}),
    }))
    onComplete()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f0ede8',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        padding: '0 16px',
      }}
    >
      {/* Step dots — hidden on welcome screen */}
      {step > 0 && (() => {
        const totalDots = hasRaceDate === true ? 7 : 8
        const activeDot = hasRaceDate === true && step >= 6 ? step - 2 : step - 1
        return (
          <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
            {Array.from({ length: totalDots }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i === activeDot ? '#0d0d0d' : '#ccc',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        )
      })()}

      {/* Step content */}
      <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <motion.div
              key="step-0"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ ...stepStyle, alignItems: 'center' }}
            >
              <p
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontStyle: 'italic',
                  textTransform: 'uppercase',
                  fontSize: 28,
                  color: '#0d0d0d',
                  margin: 0,
                }}
              >
                Marathon Tracker
              </p>
              <p
                className="font-inter"
                style={{ fontWeight: 400, fontStyle: 'italic', fontSize: 15, color: '#aaa', marginTop: 4, marginBottom: 48 }}
              >
                Train smart. Run far.
              </p>
              <button
                onClick={() => setStep(1)}
                className="font-inter"
                style={{
                  background: '#0d0d0d',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 15,
                  border: 'none',
                  borderRadius: 50,
                  padding: '14px 48px',
                  cursor: 'pointer',
                }}
              >
                Get started
              </button>
            </motion.div>
          )}

          {/* Step 1 — Start date */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 24, marginTop: 0 }}
              >
                When did you start training?
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={cardStyle}
                  onClick={() => {
                    setStartDate(todayISO)
                    setShowDatePicker(false)
                    setStep(2)
                  }}
                >
                  <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                    I'm starting today
                  </p>
                  <p className="font-inter" style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
                    Let's build your plan from today
                  </p>
                </div>

                <div
                  style={{
                    ...cardStyle,
                    cursor: showDatePicker ? 'default' : 'pointer',
                  }}
                  onClick={() => {
                    if (!showDatePicker) setShowDatePicker(true)
                  }}
                >
                  <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                    I already started
                  </p>
                  <p className="font-inter" style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
                    Pick your training start date
                  </p>

                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <input
                        type="date"
                        value={startDate}
                        max={todayISO}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ ...inputStyle, marginTop: 12 }}
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {showDatePicker && (
                <button
                  onClick={() => setStep(2)}
                  className="font-inter"
                  style={continueStyle}
                >
                  Continue
                </button>
              )}
            </motion.div>
          )}

          {/* Step 2 — Race date */}
          {step === 2 && (
            <motion.div
              key="step-2"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 24, marginTop: 0 }}
              >
                Do you have a race planned?
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    ...cardStyle,
                    border: hasRaceDate === true
                      ? '2px solid #0d0d0d'
                      : '1px solid rgba(0,0,0,0.08)',
                  }}
                  onClick={() => setHasRaceDate(true)}
                >
                  <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                    📅 Yes, I have a race date
                  </p>
                  <p className="font-inter" style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
                    We'll build your plan around it
                  </p>

                </div>

                <div
                  style={{
                    ...cardStyle,
                    border: hasRaceDate === false
                      ? '2px solid #0d0d0d'
                      : '1px solid rgba(0,0,0,0.08)',
                  }}
                  onClick={() => {
                    setHasRaceDate(false)
                    setRaceDate('')
                    setStep(3)
                  }}
                >
                  <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                    🏃 No fixed race
                  </p>
                  <p className="font-inter" style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
                    I just want a structured plan
                  </p>
                </div>

                {hasRaceDate === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        background: 'white',
                        borderRadius: 12,
                        padding: '14px 16px',
                        marginTop: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="font-inter" style={{ fontWeight: 500, fontSize: 14, color: '#0d0d0d' }}>
                        Race date
                      </span>
                      <input
                        type="date"
                        value={raceDate}
                        min={startDate}
                        onChange={(e) => setRaceDate(e.target.value)}
                        style={{
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: 14,
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 500,
                          color: '#0d0d0d',
                          colorScheme: 'light',
                        }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {hasRaceDate === true && raceDate && (
                <button
                  onClick={() => setStep(3)}
                  className="font-inter"
                  style={continueStyle}
                >
                  Continue
                </button>
              )}

              <button
                onClick={() => setStep(1)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 3 — Experience */}
          {step === 3 && (
            <motion.div
              key="step-3"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 24, marginTop: 0 }}
              >
                What's your running background?
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    style={{
                      ...cardStyle,
                      border: experience === opt.key
                        ? '2px solid #0d0d0d'
                        : '1px solid rgba(0,0,0,0.08)',
                    }}
                    onClick={() => {
                      setExperience(opt.key)
                      setStep(4)
                    }}
                  >
                    <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                      {opt.emoji} {opt.title}
                    </p>
                    <p className="font-inter" style={{ fontSize: 13, color: '#aaa', margin: '4px 0 0' }}>
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 4 — Running days */}
          {step === 4 && (
            <motion.div
              key="step-4"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 8, marginTop: 0 }}
              >
                How many days a week do you want to run?
              </h2>
              <p className="font-inter" style={{ fontSize: 14, color: '#aaa', marginTop: 0, marginBottom: 24 }}>
                3 days is enough for most runners. more days = faster progress but higher injury risk
              </p>

              {/* Frequency pills */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 20 }}>
                {FREQ_OPTIONS.map((f) => (
                  <div key={f} style={{ position: 'relative' }}>
                    {f === 3 && (
                      <span
                        className="font-inter"
                        style={{
                          position: 'absolute',
                          top: -22,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 13,
                          color: '#00c86e',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Recommended
                      </span>
                    )}
                    <div
                      style={{
                        ...cardStyle,
                        padding: '12px 16px',
                        textAlign: 'center',
                        border: runDaysPerWeek === f
                          ? '2px solid #0d0d0d'
                          : '1px solid rgba(0,0,0,0.08)',
                        minWidth: 56,
                      }}
                      onClick={() => {
                        setRunDaysPerWeek(f)
                        setSelectedDays([])
                      }}
                    >
                      <p className="font-inter" style={{ fontWeight: 600, fontSize: 16, color: '#0d0d0d', margin: 0 }}>
                        {f}
                      </p>
                      <p className="font-inter" style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>
                        days
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Day selector */}
              {runDaysPerWeek !== null && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 }}>
                  {DAY_NAMES_FULL.map((day) => {
                    const isSelected = selectedDays.includes(day)
                    return (
                      <div
                        key={day}
                        style={{
                          ...cardStyle,
                          padding: '10px 0',
                          width: 46,
                          textAlign: 'center',
                          background: isSelected ? '#0d0d0d' : '#ffffff',
                          border: isSelected ? '2px solid #0d0d0d' : '1px solid rgba(0,0,0,0.08)',
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDays(prev => prev.filter(d => d !== day))
                          } else if (selectedDays.length < runDaysPerWeek) {
                            setSelectedDays(prev => [...prev, day])
                          }
                        }}
                      >
                        <p
                          className="font-inter"
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            color: isSelected ? '#ffffff' : '#0d0d0d',
                            margin: 0,
                          }}
                        >
                          {day}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {runDaysPerWeek !== null && selectedDays.length !== runDaysPerWeek && (
                <p className="font-inter" style={{ fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 12 }}>
                  select {runDaysPerWeek} days
                </p>
              )}

              {runDaysPerWeek !== null && selectedDays.length === runDaysPerWeek && (
                <button
                  onClick={() => setStep(hasRaceDate ? 6 : 5)}
                  className="font-inter"
                  style={continueStyle}
                >
                  Continue
                </button>
              )}

              <button
                onClick={() => setStep(3)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 5 — Prep length (only if no race date) */}
          {step === 5 && !hasRaceDate && (
            <motion.div
              key="step-5"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 8, marginTop: 0 }}
              >
                How long do you want to prepare?
              </h2>
              <p className="font-inter" style={{ fontSize: 14, color: '#aaa', marginTop: 0, marginBottom: 24 }}>
                We'll build your plan around this duration
              </p>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 20 }}>
                {PREP_OPTIONS.map((w) => (
                  <div key={w} style={{ position: 'relative' }}>
                    {w === 16 && (
                      <span
                        className="font-inter"
                        style={{
                          position: 'absolute',
                          top: -22,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 13,
                          color: '#00c86e',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Recommended
                      </span>
                    )}
                    <div
                      style={{
                        ...cardStyle,
                        padding: '12px 16px',
                        textAlign: 'center',
                        border: prepWeeks === w
                          ? '2px solid #0d0d0d'
                          : '1px solid rgba(0,0,0,0.08)',
                        minWidth: 56,
                      }}
                      onClick={() => setPrepWeeks(w)}
                    >
                      <p className="font-inter" style={{ fontWeight: 600, fontSize: 16, color: '#0d0d0d', margin: 0 }}>
                        {w}
                      </p>
                      <p className="font-inter" style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>
                        weeks
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {prepWeeks !== null && (
                <button
                  onClick={() => setStep(6)}
                  className="font-inter"
                  style={continueStyle}
                >
                  Continue
                </button>
              )}

              <button
                onClick={() => setStep(4)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 6 — Profile */}
          {step === 6 && (
            <motion.div
              key="step-6"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 24, marginTop: 0 }}
              >
                Tell us about yourself
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {([
                  { label: 'Age', value: age, set: setAge, min: 16, max: 80, unit: '' },
                  { label: 'Weight', value: weight, set: setWeight, min: 40, max: 150, unit: 'kg' },
                  { label: 'Height', value: height, set: setHeight, min: 140, max: 220, unit: 'cm' },
                ] as const).map(({ label, value, set, min, max, unit }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="font-inter" style={{ fontSize: 14, color: '#aaa', width: 80 }}>
                      {label}{unit ? ` (${unit})` : ''}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button
                        style={{
                          width: 36, height: 36,
                          borderRadius: '50%',
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: '#fff',
                          fontSize: 18,
                          color: '#0d0d0d',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                        onClick={() => set(Math.max(min, value - 1))}
                      >
                        −
                      </button>
                      <span className="font-mono" style={{ fontSize: 20, color: '#0d0d0d', width: 48, textAlign: 'center' }}>
                        {value}
                      </span>
                      <button
                        style={{
                          width: 36, height: 36,
                          borderRadius: '50%',
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: '#fff',
                          fontSize: 18,
                          color: '#0d0d0d',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                        onClick={() => set(Math.min(max, value + 1))}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* HR zone display */}
              <div style={{ ...cardStyle, cursor: 'default', marginTop: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="font-inter" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Max HR</span>
                    <span style={{ color: '#0d0d0d', fontWeight: 600 }}>{maxHR} bpm</span>
                  </div>
                  <div className="font-inter" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Easy zone</span>
                    <span style={{ color: '#0d0d0d', fontWeight: 600 }}>{zones.easy.min}–{zones.easy.max} bpm</span>
                  </div>
                  <div className="font-inter" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Interval zone</span>
                    <span style={{ color: '#0d0d0d', fontWeight: 600 }}>{zones.interval.min}–{zones.interval.max} bpm</span>
                  </div>
                  <div className="font-inter" style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa' }}>Long run zone</span>
                    <span style={{ color: '#0d0d0d', fontWeight: 600 }}>{zones.long.min}–{zones.long.max} bpm</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(7)}
                className="font-inter"
                style={continueStyle}
              >
                Continue
              </button>

              <button
                onClick={() => setStep(hasRaceDate ? 4 : 5)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 7 — Biological sex */}
          {step === 7 && (
            <motion.div
              key="step-7"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 24, marginTop: 0 }}
              >
                Biological sex
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {SEX_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    style={{
                      ...cardStyle,
                      border: sex === opt.key
                        ? '2px solid #0d0d0d'
                        : '1px solid rgba(0,0,0,0.08)',
                    }}
                    onClick={() => {
                      setSex(opt.key)
                      setStep(8)
                    }}
                  >
                    <p className="font-inter" style={{ fontWeight: 600, fontSize: 15, color: '#0d0d0d', margin: 0 }}>
                      {opt.title}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep(6)}
                className="font-inter"
                style={backStyle}
              >
                Back
              </button>
            </motion.div>
          )}

          {/* Step 8 — Confirmation */}
          {step === 8 && (
            <motion.div
              key="step-8"
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={stepStyle}
            >
              <h2
                className="font-inter"
                style={{ fontWeight: 600, fontSize: 24, color: '#0d0d0d', marginBottom: 4, marginTop: 0 }}
              >
                You're all set.
              </h2>
              <p className="font-inter" style={{ fontSize: 14, color: '#aaa', marginTop: 0, marginBottom: 24 }}>
                Here's your training plan
              </p>

              <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  {
                    label: 'Start date',
                    value: new Date(startDate + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }),
                  },
                  {
                    label: 'Duration',
                    value: `${hasRaceDate && raceDate
                      ? Math.ceil((new Date(raceDate).getTime() - new Date(startDate).getTime()) / (7 * 86_400_000))
                      : (prepWeeks ?? 16)} weeks`,
                  },
                  {
                    label: 'Experience',
                    value: experience ? experience.charAt(0).toUpperCase() + experience.slice(1) : 'Beginner',
                  },
                  {
                    label: 'Days per week',
                    value: `${runDaysPerWeek} · ${selectedDays.join(', ')}`,
                  },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="font-inter" style={{ fontSize: 12, color: '#aaa' }}>{row.label}</span>
                    <span className="font-inter" style={{ fontSize: 12, color: '#0d0d0d' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleComplete()}
                className="font-inter"
                style={continueStyle}
              >
                Start training →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
