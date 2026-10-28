import { motion } from 'framer-motion';

/**
 * Figma-grade ambient layer: slow-drifting gradient orbs, fine film grain,
 * vignette. Sits behind all content and follows the theme token colours via
 * CSS variables, so regime / zen / panic themes retint the whole scene.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-24 w-[42rem] h-[42rem] rounded-full blur-[120px]"
        style={{ background: 'var(--ambient)' }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, 70, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 w-[38rem] h-[38rem] rounded-full blur-[130px]"
        style={{ background: 'var(--accent-soft)' }}
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -40, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-48 left-1/3 w-[34rem] h-[34rem] rounded-full blur-[140px] opacity-60"
        style={{ background: 'rgba(157,107,255,0.12)' }}
        animate={{ x: [0, 50, -50, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* film grain */}
      <div className="noise absolute inset-0 opacity-[0.05]" />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(2,4,10,0.55) 100%)' }}
      />
    </div>
  );
}
