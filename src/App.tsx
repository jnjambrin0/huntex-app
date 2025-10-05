import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedBackground } from './components/AnimatedBackground'
import { UploadModal } from './components/UploadModal'
import { HyperspaceAnimation } from './components/HyperspaceAnimation'
import { ResultsPage } from './components/ResultsPage'
import type { ExoplanetResult } from './types/exoplanet'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHyperspaceActive, setIsHyperspaceActive] = useState(false)
  const [showResultsPage, setShowResultsPage] = useState(false)
  const [backendResults, setBackendResults] = useState<ExoplanetResult[]>([])

  const handleDataConfirmed = () => {
    setIsModalOpen(false)
    setIsHyperspaceActive(true)
  }

  const handleResultsReceived = (results: ExoplanetResult[]) => {
    setBackendResults(results)
  }

  const handleHyperspaceComplete = () => {
    setIsHyperspaceActive(false)
    setShowResultsPage(true)
  }

  // Show results page after hyperspace
  if (showResultsPage) {
    return <ResultsPage results={backendResults} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated Particles */}
      <AnimatedBackground />

      {/* Hyperspace Animation */}
      {isHyperspaceActive && <HyperspaceAnimation onComplete={handleHyperspaceComplete} />}

      {/* Logo - stays fixed during hyperspace */}
       <div
        className="fixed w-64 h-64 mb-2 z-50"
        style={{ top: '40%', left: '50%', transform: isHyperspaceActive ? 'translate(-50%, -40%)' : 'translate(-50%, -60%)' }}
      >
        <img src="/logo.png" alt="HuntEX Logo" className="w-full h-full" />
      </div>


      {/* Content */}
      <AnimatePresence>
        {!isHyperspaceActive && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative flex flex-col items-center gap-4"
          >
            {/* Title */}
            <h1
              className="text-7xl text-white tracking-[0.2em] mt-72"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                textShadow: "2px 2px 10px black"
              }}
            >
              HUNTEX
            </h1>


            {/* Subtitle */}
            <p className="text-lg text-gray-300 font-light -mt-2 pt-5">
              your hunt starts here
            </p>

            {/* Button - only show if modal not confirmed yet */}
            {!isHyperspaceActive && !showResultsPage && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-7 cursor-pointer px-12 py-3.5 border-[3px] border-white text-white text-sm font-semibold tracking-widest rounded-[2rem] hover:bg-white hover:text-slate-900 transition-all duration-300"
              >
                UPLOAD DATA
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDataConfirmed}
        onResultsReceived={handleResultsReceived}
      />
    </div>
  )
}

export default App
