import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, Orbit, Globe, Star, Gauge } from 'lucide-react'

interface SingleEntryFormProps {
  onBack: () => void
  onConfirm?: () => void
}

interface FormData {
  koi_period: string
  koi_depth: string
  koi_duration: string
  koi_prad: string
  koi_teq: string
  koi_insol: string
  koi_steff: string
  koi_slogg: string
  koi_srad: string
  koi_model_snr: string
  koi_impact: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const labelStyles = {
  CONFIRMED: {
    container: 'bg-green-500/10 border-green-500',
    text: 'text-green-400',
    message: 'Exoplanet confirmado por el modelo.',
    Icon: CheckCircle,
  },
  CANDIDATE: {
    container: 'bg-yellow-500/10 border-yellow-500',
    text: 'text-yellow-400',
    message: 'Posible exoplaneta: revisar manualmente.',
    Icon: AlertCircle,
  },
  'FALSE POSITIVE': {
    container: 'bg-red-500/10 border-red-500',
    text: 'text-red-400',
    message: 'Probable falso positivo según el modelo.',
    Icon: XCircle,
  },
} as const

export function SingleEntryForm({ onBack, onConfirm }: SingleEntryFormProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    koi_period: '',
    koi_depth: '',
    koi_duration: '',
    koi_prad: '',
    koi_teq: '',
    koi_insol: '',
    koi_steff: '',
    koi_slogg: '',
    koi_srad: '',
    koi_model_snr: '',
    koi_impact: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setResult(null)
    setErrorMessage(null)

    // Optimistic transition: trigger hyperspace immediately
    onConfirm?.()

    // Background analysis (results won't be shown, but logged for debugging)
    try {
      const response = await fetch(`${API_BASE_URL}/api/single-predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Analysis failed:', data?.error ?? 'Analysis failed')
      } else {
        console.log('Analysis successful:', data)
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const fieldGroups = [
    {
      title: 'Orbital Parameters',
      icon: Orbit,
      color: 'blue',
      fields: [
        { name: 'koi_period', label: 'Orbital Period (days)', placeholder: 'e.g., 2.47' },
        { name: 'koi_duration', label: 'Transit Duration (hours)', placeholder: 'e.g., 1.72' },
        { name: 'koi_impact', label: 'Impact Parameter', placeholder: 'e.g., 0.82' },
      ]
    },
    {
      title: 'Planetary Properties',
      icon: Globe,
      color: 'purple',
      fields: [
        { name: 'koi_prad', label: 'Planet Radius (Earth radii)', placeholder: 'e.g., 14.4' },
        { name: 'koi_teq', label: 'Equilibrium Temp (K)', placeholder: 'e.g., 1394' },
        { name: 'koi_insol', label: 'Insolation Flux', placeholder: 'e.g., 0.0' },
      ]
    },
    {
      title: 'Stellar Characteristics',
      icon: Star,
      color: 'yellow',
      fields: [
        { name: 'koi_steff', label: 'Stellar Eff Temp (K)', placeholder: 'e.g., 5814' },
        { name: 'koi_slogg', label: 'Stellar Surface Gravity', placeholder: 'e.g., 4.38' },
        { name: 'koi_srad', label: 'Stellar Radius (Solar radii)', placeholder: 'e.g., 1.06' },
      ]
    },
    {
      title: 'Signal Metrics',
      icon: Gauge,
      color: 'green',
      fields: [
        { name: 'koi_depth', label: 'Transit Depth (ppm)', placeholder: 'e.g., 14284' },
        { name: 'koi_model_snr', label: 'Model Signal-to-Noise', placeholder: 'e.g., 7856.1' },
      ]
    },
  ]

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
        Single Entry Analysis
      </h3>
      <p className="text-gray-400 mb-6">Enter exoplanet data for individual analysis</p>

      <form onSubmit={handleSubmit} className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
        {fieldGroups.map((group, groupIndex) => {
          const IconComponent = group.icon
          const iconColorClass = {
            blue: 'text-blue-400',
            purple: 'text-purple-400',
            yellow: 'text-yellow-400',
            green: 'text-green-400',
          }[group.color]

          const borderColorClass = {
            blue: 'border-blue-500/30',
            purple: 'border-purple-500/30',
            yellow: 'border-yellow-500/30',
            green: 'border-green-500/30',
          }[group.color]

          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
              className={`p-4 bg-slate-800/40 border ${borderColorClass} rounded-xl`}
            >
              <div className="flex items-center gap-2 mb-4">
                <IconComponent className={`w-5 h-5 ${iconColorClass}`} />
                <h4 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
                  {group.title}
                </h4>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {group.fields.map((field) => (
                  <div key={field.name} className={group.fields.length === 2 ? 'md:col-span-1' : ''}>
                    <label className="block text-xs text-gray-400 mb-1.5">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name as keyof FormData]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required
                      className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:bg-slate-900 transition-all hover:border-slate-500"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isAnalyzing}
          className="w-full mt-6 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Data'
          )}
        </motion.button>
      </form>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-xl border-2 border-red-500/60 bg-red-500/10 text-red-300"
        >
          {errorMessage}
        </motion.div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-6 p-6 rounded-xl border-2 ${
            labelStyles[result as keyof typeof labelStyles]?.container ?? 'border-slate-700 bg-slate-800/50'
          }`}
        >
          {(() => {
            const config = labelStyles[result as keyof typeof labelStyles]
            const IconComponent = config?.Icon ?? CheckCircle
            return (
              <div className="flex items-center gap-3">
                <IconComponent className={`w-8 h-8 ${config?.text ?? 'text-white'}`} />
                <div>
                  <h4 className="text-xl font-bold text-white">{result}</h4>
                  <p className="text-gray-300">{config?.message ?? 'Predicción generada correctamente.'}</p>
                </div>
              </div>
            )
          })()}
        </motion.div>
      )}
    </motion.div>
  )
}
