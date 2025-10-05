import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, ArrowLeft, Loader2 } from 'lucide-react'

interface BulkUploadFormProps {
  onBack: () => void
  onConfirm: () => void
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024

export function BulkUploadForm({ onBack, onConfirm }: BulkUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [results, setResults] = useState<{ row: number; label: string }[]>([])
  const [rowErrors, setRowErrors] = useState<{ row: number; message: string }[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    if (!file) return

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError('File exceeds the 100 MB limit.')
      return
    }

    setIsUploading(true)
    setUploadError(null)
    setResults([])
    setRowErrors([])

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/bulk-upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Upload failed')
      }

      setResults(data.entries ?? [])
      setRowErrors(data.errors ?? [])

      // Trigger hyperspace animation after successful upload
      setTimeout(() => {
        onConfirm()
      }, 1500)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(
        error instanceof Error ? error.message : 'Failed to upload file. Make sure the backend is running.'
      )
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

      {file && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex gap-4"
        >
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
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload & Analyze'
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
