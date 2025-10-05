import { motion } from 'framer-motion'

export function ResultsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Content - placeholder for future development */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <h1
          className="text-5xl text-white tracking-[0.2em]"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          RESULTS
        </h1>
        <p className="text-lg text-gray-300 font-light">
          Analysis complete
        </p>
      </div>
    </motion.div>
  )
}
