import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X } from 'lucide-react'
import { BulkUploadForm } from './BulkUploadForm'
import { SingleEntryForm } from './SingleEntryForm'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

type ViewType = 'selection' | 'bulk' | 'single'

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X size={24} />
              </button>

              <AnimatePresence mode="wait">
                {currentView === 'selection' && (
                  <motion.div
                    key="selection"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Title */}
                    <motion.h2
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl font-bold text-white mb-3 text-center"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}
                    >
                      Upload Data
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-gray-400 text-center mb-8"
                    >
                      Choose how you want to analyze exoplanet data
                    </motion.p>

                    {/* Options Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Bulk Upload Option */}
                      <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBulkUpload}
                        className="group relative bg-slate-800 border-2 border-slate-600 hover:border-blue-500 rounded-xl p-6 transition-all duration-300"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors"
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
                        <div className="absolute inset-0 rounded-xl bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
                      </motion.button>

                      {/* Single Entry Option */}
                      <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSingleEntry}
                        className="group relative bg-slate-800 border-2 border-slate-600 hover:border-purple-500 rounded-xl p-6 transition-all duration-300"
                      >
                        <div className="flex flex-col items-center text-center space-y-4">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                            transition={{ duration: 0.5 }}
                            className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 transition-colors"
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
                        <div className="absolute inset-0 rounded-xl bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors" />
                      </motion.button>
                    </div>
                  </motion.div>
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
