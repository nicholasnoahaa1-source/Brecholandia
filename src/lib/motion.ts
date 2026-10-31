import type { Transition, Variants } from 'motion/react'

// Tempos e curvas únicos para o site todo.
export const ease = [0.22, 1, 0.36, 1] as const
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 1 }
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 26 }

export const page: Variants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease } },
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

export const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}
