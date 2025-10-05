import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useAnimation, type Variants } from 'framer-motion'
import { Upload, FileText, X } from 'lucide-react'
import { BulkUploadForm } from './BulkUploadForm'
import { SingleEntryForm } from './SingleEntryForm'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

type ViewType = 'selection' | 'bulk' | 'single'

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: 0.18, ease: 'easeIn' },
  },
}

const headingVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.26, ease: 'easeOut' } },
}

const descriptionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut', delay: 0.06 } },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut', delay: 0.18 + index * 0.07 },
  }),
  hover: {
    y: -6,
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  pressed: {
    scale: 0.98,
    y: -2,
    transition: { duration: 0.16, ease: 'easeOut' },
  },
}

const iconVariants: Variants = {
  hidden: { rotate: 0 },
  visible: { rotate: 0 },
  hover: { rotate: [-6, 6, -6, 0], transition: { duration: 0.45, ease: 'easeInOut' } },
}

interface SelectionViewProps {
  onBulk: () => void
  onSingle: () => void
}

function SelectionView({ onBulk, onSingle }: SelectionViewProps) {
  const cardsControls = useAnimation()

  useEffect(() => {
    cardsControls.set('hidden')
    void cardsControls.start('visible')
  }, [cardsControls])

  return (
    <motion.div
      key="selection"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.h2
        variants={headingVariants}
        className="text-3xl font-bold text-white mb-3 text-center"
        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}
      >
        Upload Data
      </motion.h2>

      <motion.p
        variants={descriptionVariants}
        className="text-gray-400 text-center mb-8"
      >
        Choose how you want to analyze exoplanet data
      </motion.p>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.button
          variants={cardVariants}
          initial="hidden"
          animate={cardsControls}
          custom={0}
          whileHover="hover"
          whileTap="pressed"
          onClick={onBulk}
          className="group relative bg-slate-800 border-2 border-slate-600 hover:border-blue-500 rounded-xl p-6 transition-colors duration-300"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div
              variants={iconVariants}
              className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-blue-500/30"
            >
              <FileText className="w-10 h-10 text-blue-400" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Bulk Upload</h3>
              <p className="text-sm text-gray-400">
                Upload a CSV file with multiple entries for batch analysis
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
        </motion.button>

        <motion.button
          variants={cardVariants}
          initial="hidden"
          animate={cardsControls}
          custom={1}
          whileHover="hover"
          whileTap="pressed"
          onClick={onSingle}
          className="group relative bg-slate-800 border-2 border-slate-600 hover:border-purple-500 rounded-xl p-6 transition-colors duration-300"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div
              variants={iconVariants}
              className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-purple-500/30"
            >
              <Upload className="w-10 h-10 text-purple-400" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Single Entry</h3>
              <p className="text-sm text-gray-400">
                Enter data manually for a single exoplanet analysis
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors" />
        </motion.button>
      </div>
    </motion.div>
  )
}

export function UploadModal({ isOpen, onClose, onConfirm }: UploadModalProps) {
  const [currentView, setCurrentView] = useState<ViewType>('selection')

  const handleClose = () => {
    setCurrentView('selection')
    onClose()
  }

  const handleBulkUpload = () => {
    setCurrentView('bulk')
  }

  const handleSingleEntry = () => {
    setCurrentView('single')
  }

  const handleBack = () => {
    setCurrentView('selection')
  }

  const handleConfirm = () => {
    setCurrentView('selection')
    onConfirm()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X size={24} />
              </button>

              <AnimatePresence mode="wait">
                {currentView === 'selection' && (
                  <SelectionView
                    key="selection"
                    onBulk={handleBulkUpload}
                    onSingle={handleSingleEntry}
                  />
                )}

                {currentView === 'bulk' && (
                  <BulkUploadForm key="bulk" onBack={handleBack} onConfirm={handleConfirm} />
                )}

                {currentView === 'single' && (
                  <SingleEntryForm key="single" onBack={handleBack} onConfirm={handleConfirm} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
