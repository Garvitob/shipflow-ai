"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

/**
 * Scroll-reveal wrapper: subtle fade + translate-up as it enters the viewport.
 * Reveals once, never bouncy. Honors prefers-reduced-motion (renders static).
 */
export function Reveal({
  children,
  delay = 0,
  y = 20,
  className,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  const reduce = useReducedMotion()

  if (reduce) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
