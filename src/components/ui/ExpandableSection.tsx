import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

interface ExpandableSectionProps {
  isExpanded: boolean
  ariaId?: string
  children: React.ReactNode
}

export default function ExpandableSection({ isExpanded, ariaId, children }: ExpandableSectionProps) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          id={ariaId}
          role="region"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
