import type { Transition, Variants } from 'motion/react'

// Tempos e curvas únicos para o site todo.
export const ease = [0.22, 1, 0.36, 1] as const
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 1 }
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 26 }
// Etiqueta de papel presa por barbante: pouca resistência, balança antes de parar.
export const swing: Transition = { type: 'spring', stiffness: 170, damping: 7, mass: 0.6 }

export const page: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit: { opacity: 0, transition: { duration: 0.15, ease } },
}

/** Inclinação estável por peça (entre -max e +max graus), para a etiqueta não ficar igual em todas. */
export function tilt(id: string, max = 3) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return ((Math.abs(h) % 1000) / 1000) * max * 2 - max
}
