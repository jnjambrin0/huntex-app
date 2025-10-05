import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, ArrowLeft, Loader2 } from 'lucide-react'
import type { ExoplanetResult, PreprocessAndPredictResponse } from '../types/exoplanet'

interface BulkUploadFormProps {
  onBack: () => void
  onConfirm?: () => void
  onResultsReceived?: (results: ExoplanetResult[]) => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

export function BulkUploadForm({ onBack, onConfirm, onResultsReceived }: BulkUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [results, setResults] = useState<{ row: number; label: string }[]>([])
  const [rowErrors, setRowErrors] = useState<{ row: number; message: string }[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'text/csv' || droppedFile.name.toLowerCase().endsWith('.csv')) {
        setFile(droppedFile)
        setUploadError(null)
      } else {
        setUploadError('Please upload a CSV file.')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.type === 'text/csv' || selected.name.toLowerCase().endsWith('.csv')) {
        setFile(selected)
        setUploadError(null)
      } else {
        setUploadError('Please upload a CSV file.')
      }
    }
  }

  const handleUpload = async () => {
    // Demo mode: skip file validation and trigger hyperspace immediately
    if (demoMode) {
      setIsUploading(true)
      onConfirm?.()

      // Generate demo data for testing
      const demoResults: ExoplanetResult[] = [
        {
          row: 0,
          label: 'CONFIRMED',
          koi_period: 2.47,
          koi_depth: 14284,
          koi_duration: 1.72,
          koi_prad: 14.4,
          koi_teq: 1394,
          koi_insol: 0.0,
          koi_steff: 5814,
          koi_slogg: 4.38,
          koi_srad: 1.06,
          koi_model_snr: 7856.1,
          koi_impact: 0.82,
          name: 'Kepler-442b',
          discoveryDate: new Date().toLocaleDateString()
        },
        {
          row: 1,
          label: 'CANDIDATE',
          koi_period: 365.25,
          koi_depth: 8420,
          koi_duration: 3.2,
          koi_prad: 2.1,
          koi_teq: 280,
          koi_insol: 1.0,
          koi_steff: 5778,
          koi_slogg: 4.44,
          koi_srad: 1.0,
          koi_model_snr: 542.3,
          koi_impact: 0.45,
          name: 'TRAPPIST-1e',
          discoveryDate: new Date().toLocaleDateString()
        },
        {
          row: 2,
          label: 'CONFIRMED',
          koi_period: 11.2,
          koi_depth: 19200,
          koi_duration: 2.8,
          koi_prad: 11.2,
          koi_teq: 800,
          koi_insol: 50.2,
          koi_steff: 6100,
          koi_slogg: 4.2,
          koi_srad: 1.8,
          koi_model_snr: 9200.5,
          koi_impact: 0.12,
          name: 'HD 209458b',
          discoveryDate: new Date().toLocaleDateString()
        }
      ]

      onResultsReceived?.(demoResults)
      setIsUploading(false)
      return
    }

    // Normal mode: require file
    if (!file) return

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('File exceeds the 100 MB limit.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setResults([])
    setRowErrors([])

    // Optimistic transition: trigger hyperspace immediately
    onConfirm?.()

    // Background upload - use new preprocess-and-predict endpoint
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/preprocess-and-predict`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Upload failed:', data?.error ?? 'Upload failed')
        console.error('Preprocessing errors:', data?.preprocessing_errors)
        onResultsReceived?.([]) // Send empty array on error
      } else {
        const typedData = data as PreprocessAndPredictResponse
        console.log('Upload successful:', typedData)
        console.log('Preprocessing stats:', {
          original: typedData.preprocessing.original_rows,
          processed: typedData.preprocessing.processed_rows,
          removed: typedData.preprocessing.removed_rows,
          warnings: typedData.preprocessing.warnings
        })

        // Backend now returns entries with ALL processed feature values
        const transformedResults: ExoplanetResult[] = typedData.entries?.map((entry) => ({
          row: entry.row,
          label: entry.label,
          // Features are already processed (log-transformed) by the backend
          koi_period: entry.koi_period,
          koi_depth: entry.koi_depth,
          koi_duration: entry.koi_duration,
          koi_prad: entry.koi_prad,
          koi_teq: entry.koi_teq,
          koi_insol: entry.koi_insol,
          koi_steff: entry.koi_steff,
          koi_slogg: entry.koi_slogg,
          koi_srad: entry.koi_srad,
          koi_model_snr: entry.koi_model_snr,
          koi_impact: entry.koi_impact,
          name: `KOI-${(entry.row ?? 0).toString().padStart(4, '0')}`,
          discoveryDate: new Date().toLocaleDateString()
        })) ?? []

        onResultsReceived?.(transformedResults)
      }
    } catch (error) {
      console.error('Upload error:', error)
      onResultsReceived?.([]) // Send empty array on error
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.1em' }}>
        Bulk Upload
      </h3>
      <p className="text-gray-400 mb-6">Upload a CSV file for batch exoplanet analysis</p>

      {/* Demo Mode Checkbox */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg"
      >
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-blue-500 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer transition-all"
          />
          <div className="flex-1">
            <p className="text-white font-semibold group-hover:text-blue-300 transition-colors">
              Demo Mode
            </p>
            <p className="text-sm text-gray-400">
              Don't have a dataset? Enable demo mode to see the system in action with sample data
            </p>
          </div>
        </label>
      </motion.div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 transition-all ${
          dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-800/50'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          id="file-upload"
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center text-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-4"
            >
              {file ? (
                <FileText className="w-10 h-10 text-blue-400" />
              ) : (
                <Upload className="w-10 h-10 text-blue-400" />
              )}
            </motion.div>

            {file ? (
              <div className="space-y-2">
                <p className="text-white font-semibold">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-white font-semibold">
                  Drag & drop your CSV file here
                </p>
                <p className="text-sm text-gray-400">or click to browse</p>
              </div>
            )}
          </div>
        </label>
      </div>

      {uploadError && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-sm text-red-400"
        >
          {uploadError}
        </motion.p>
      )}

      {(file || demoMode) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex gap-4"
        >
          {file && !demoMode && (
            <button
              onClick={() => {
                setFile(null)
                setResults([])
                setRowErrors([])
                setUploadError(null)
              }}
              className="flex-1 px-6 py-3 border-2 border-slate-600 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`${file && !demoMode ? 'flex-1' : 'w-full'} px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {demoMode ? 'Launching Demo...' : 'Uploading...'}
              </>
            ) : (
              demoMode ? 'Start Demo Analysis' : 'Upload & Analyze'
            )}
          </button>
        </motion.div>
      )}

      {(results.length > 0 || rowErrors.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-xl border-2 border-slate-700 bg-slate-800/60 p-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4">Predictions</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {results.map((entry) => (
              <div
                key={`result-${entry.row}`}
                className="flex items-center justify-between rounded-lg bg-slate-900/60 px-4 py-2 border border-slate-700"
              >
                <span className="text-sm text-gray-300">Row {entry.row + 1}</span>
                <span className="text-sm font-semibold text-blue-300">{entry.label}</span>
              </div>
            ))}
            {rowErrors.map((rowError) => (
              <div
                key={`error-${rowError.row}`}
                className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-200"
              >
                Row {rowError.row + 1}: {rowError.message}
              </div>
            ))}
            {results.length === 0 && rowErrors.length === 0 && (
              <p className="text-sm text-gray-400">No predictions generated.</p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
