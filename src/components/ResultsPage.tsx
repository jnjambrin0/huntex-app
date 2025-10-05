import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, Thermometer, Orbit, Star as StarIcon, Gauge, Radar } from 'lucide-react'
import type { ExoplanetResult } from '../types/exoplanet'

interface ExoplanetData extends ExoplanetResult {
  id: number
}

interface Star {
  x: number
  y: number
  baseSize: number
  baseOpacity: number
  pulseOffset: number
  isExoplanet: boolean
  detectionState: 'idle' | 'blinking' | 'confirmed'
  blinkCount: number
  targetSize: number
  targetOpacity: number
  currentSize: number
  currentOpacity: number
  exoplanetData?: ExoplanetData
}

interface ResultsPageProps {
  results: ExoplanetResult[]
}

export function ResultsPage({ results }: ResultsPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [detectedCount, setDetectedCount] = useState(0)
  const [selectedExoplanet, setSelectedExoplanet] = useState<ExoplanetData | null>(null)
  const [hoveredExoplanet, setHoveredExoplanet] = useState<number | null>(null)
  const starsRef = useRef<Star[]>([])
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Helper: normaliza el nombre para construir el slug usado por la web de la NASA
  const makeNasaPath = (name: string) => {
    if (!name) return ''
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Star configuration - sistema de mapa estelar de baja intensidad
    const stars: Star[] = []
    const STAR_COUNT = 300
    const EXOPLANET_BASE_SIZE = 2.5 // Tamaño base fijo para todos los exoplanetas

    // Padding relativo alrededor del área de spawn (10% = 0.10)
    const PAD = 0.10

    const spawnLeft = canvas.width * PAD
    const spawnTop = canvas.height * PAD
    const spawnWidth = canvas.width * (1 - 2 * PAD)
    const spawnHeight = canvas.height * (1 - 2 * PAD)

    // Crear estrellas con variación natural
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: spawnLeft + Math.random() * spawnWidth,
        y: spawnTop + Math.random() * spawnHeight,
        baseSize: Math.random() * 1.2 + 0.3,
        baseOpacity: Math.random() * 0.25 + 0.15,
        pulseOffset: Math.random() * Math.PI * 2,
        isExoplanet: false,
        detectionState: 'idle',
        blinkCount: 0,
        targetSize: 0,
        targetOpacity: 0,
        currentSize: 0,
        currentOpacity: 0,
      })
    }

    // Inicializar valores actuales
    stars.forEach(star => {
      star.currentSize = star.baseSize
      star.currentOpacity = star.baseOpacity
      star.targetSize = star.baseSize
      star.targetOpacity = star.baseOpacity
    })

    // Guardar referencia para eventos de mouse
    starsRef.current = stars

    let animationFrameId: number

    // Animation loop
    const animate = (currentTime: number) => {
      // Limpiar canvas
      ctx.fillStyle = 'rgba(2, 6, 23, 1)' // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Dibujar estrellas
      stars.forEach((star) => {
        // Calcular pulso sutil para estrellas normales
        const time = currentTime * 0.001
        const pulse = Math.sin(time * 2 + star.pulseOffset) * 0.03 + 1

        // Gestionar animación de parpadeo
        if (star.detectionState === 'blinking') {
          const blinkSpeed = 8 // Velocidad del parpadeo
          const blinkCycle = Math.sin(time * blinkSpeed)

          // Contar parpadeos
          if (blinkCycle > 0.9 && star.blinkCount < 2) {
            star.blinkCount++
          }

          // Después de 2 parpadeos, expandir y brillar
          if (star.blinkCount >= 2) {
            star.detectionState = 'confirmed'
            star.targetSize = EXOPLANET_BASE_SIZE // Tamaño fijo para exoplanetas
            star.targetOpacity = 1.0 // Brillo máximo
          } else {
            // Durante parpadeo
            star.targetSize = star.baseSize * (1 + blinkCycle * 0.8)
            star.targetOpacity = star.baseOpacity * (1 + blinkCycle * 2)
          }
        } else if (star.detectionState === 'confirmed') {
          // Exoplaneta confirmado: pulso continuo para indicar interactividad
          const interactivePulse = Math.sin(time * 3) * 0.15 + 1 // Pulso suave continuo
          star.targetSize = EXOPLANET_BASE_SIZE * interactivePulse // Tamaño fijo con pulso
          star.targetOpacity = 0.9 + (interactivePulse - 1) * 0.5 // Opacidad 0.85 - 0.95
        } else {
          // Estado normal con pulso sutil
          star.targetSize = star.baseSize * pulse
          star.targetOpacity = star.baseOpacity * pulse
        }

        // Suavizar transiciones (ease-out)
        const smoothingFactor = 0.1
        star.currentSize += (star.targetSize - star.currentSize) * smoothingFactor
        star.currentOpacity += (star.targetOpacity - star.currentOpacity) * smoothingFactor

        // Dibujar estrella
        if (star.detectionState === 'confirmed') {
          // Exoplaneta confirmado: sistema de anillos múltiples para mayor visibilidad

          // Anillo exterior (halo azul-violeta extendido)
          const outerGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.currentSize * 6
          )
          outerGradient.addColorStop(0, `rgba(96, 165, 250, ${star.currentOpacity * 0.3})`) // blue-400
          outerGradient.addColorStop(0.3, `rgba(139, 92, 246, ${star.currentOpacity * 0.5})`) // violet-500
          outerGradient.addColorStop(0.6, `rgba(168, 85, 247, ${star.currentOpacity * 0.3})`) // purple-500
          outerGradient.addColorStop(1, `rgba(168, 85, 247, 0)`) // purple-500 transparent

          ctx.fillStyle = outerGradient
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.currentSize * 6, 0, Math.PI * 2)
          ctx.fill()

          // Anillo medio (resplandor intenso)
          const midGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.currentSize * 3.5
          )
          midGradient.addColorStop(0, `rgba(147, 197, 253, ${star.currentOpacity * 0.8})`) // blue-300
          midGradient.addColorStop(0.5, `rgba(139, 92, 246, ${star.currentOpacity * 0.7})`) // violet-500
          midGradient.addColorStop(1, `rgba(168, 85, 247, 0)`) // purple-500 transparent

          ctx.fillStyle = midGradient
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.currentSize * 3.5, 0, Math.PI * 2)
          ctx.fill()

          // Núcleo brillante con gradiente
          const coreGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.currentSize * 1.5
          )
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${star.currentOpacity})`)
          coreGradient.addColorStop(0.6, `rgba(191, 219, 254, ${star.currentOpacity * 0.9})`) // blue-200
          coreGradient.addColorStop(1, `rgba(96, 165, 250, ${star.currentOpacity * 0.7})`) // blue-400

          ctx.fillStyle = coreGradient
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.currentSize * 1.5, 0, Math.PI * 2)
          ctx.fill()

          // Anillo de definición (stroke sutil para mayor definición)
          ctx.strokeStyle = `rgba(139, 92, 246, ${star.currentOpacity * 0.4})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.currentSize * 4, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          // Estrellas normales: blancas sutiles
          ctx.fillStyle = `rgba(255, 255, 255, ${star.currentOpacity})`
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.currentSize, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate(0)

    // Handlers de mouse
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      let foundHover = false
      stars.forEach((star, index) => {
        if (star.detectionState === 'confirmed') {
          const distance = Math.sqrt(
            Math.pow(mouseX - star.x, 2) + Math.pow(mouseY - star.y, 2)
          )
          const hitRadius = star.currentSize * 6 // Área de hit coincide con el anillo exterior

          if (distance <= hitRadius) {
            foundHover = true
            setHoveredExoplanet(index)
          }
        }
      })

      if (!foundHover) {
        setHoveredExoplanet(null)
      }
    }

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      stars.forEach((star) => {
        if (star.detectionState === 'confirmed' && star.exoplanetData) {
          const distance = Math.sqrt(
            Math.pow(mouseX - star.x, 2) + Math.pow(mouseY - star.y, 2)
          )
          const hitRadius = star.currentSize * 6

          if (distance <= hitRadius) {
            setSelectedExoplanet(star.exoplanetData)
          }
        }
      })
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // Progressive revelation effect - reveals exoplanets one by one with exactly 1000ms delay
  // CRITICAL: Only show CONFIRMED and CANDIDATE, filter out FALSE POSITIVE
  useEffect(() => {
    if (!results || results.length === 0) return

    // Filter to show only valid exoplanet detections
    const validExoplanets = results.filter(result =>
      result.label === 'CONFIRMED' || result.label === 'CANDIDATE'
    )

    if (validExoplanets.length === 0) {
      console.log('No exoplanets detected (all FALSE POSITIVE)')
      return
    }

    const timeouts: ReturnType<typeof setTimeout>[] = []

    // Function to reveal a single exoplanet
    const revealExoplanet = (result: ExoplanetResult, index: number) => {
      const stars = starsRef.current
      if (!stars || stars.length === 0) return

      // Find available star in safe zone
      const availableStars = stars.filter(s =>
        !s.isExoplanet &&
        s.detectionState === 'idle'
      )

      if (availableStars.length === 0) {
        console.warn('No available stars to reveal exoplanet')
        return
      }

      // Select random available star
      const randomStar = availableStars[Math.floor(Math.random() * availableStars.length)]

      // Configure star for exoplanet detection
      randomStar.detectionState = 'blinking'
      randomStar.blinkCount = 0
      randomStar.isExoplanet = true

      // Assign real backend data to the star
      randomStar.exoplanetData = {
        ...result,
        id: index
      }

      // Update detected count
      setDetectedCount(index + 1)
    }

    // Schedule progressive revelation: 1 exoplanet every 1000ms
    // Only reveal CONFIRMED and CANDIDATE exoplanets
    validExoplanets.forEach((result, index) => {
      const timeout = setTimeout(() => {
        revealExoplanet(result, index)
      }, index * 1000) // 0ms, 1000ms, 2000ms, 3000ms...

      timeouts.push(timeout)
    })

    // Cleanup timeouts on unmount or results change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [results])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Starfield Canvas */}
      <div ref={canvasContainerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${hoveredExoplanet !== null ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 pointer-events-none">
        <h1
          className="text-5xl text-white tracking-[0.2em]"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          EXOPLANET MAP
        </h1>
        <p className="text-lg text-gray-300 font-light">
          Monitoring stellar activity
        </p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 px-6 py-3 bg-slate-800/50 border border-slate-600 rounded-full backdrop-blur-sm"
        >
          <p className="text-sm text-blue-400 font-semibold tracking-wide">
            DETECTED: <span className="text-white text-lg">{detectedCount}</span> EXOPLANETS
          </p>
        </motion.div>
      </div>

      {/* Panel de Información del Exoplaneta */}
      <AnimatePresence>
        {selectedExoplanet && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExoplanet(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900/95 border-l-2 border-slate-700 backdrop-blur-md z-50 overflow-y-auto"
            >
              <div className="p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2
                      className="text-3xl text-white tracking-wider mb-2"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {selectedExoplanet.name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      Discovered: {selectedExoplanet.discoveryDate}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedExoplanet(null)}
                    className="text-gray-400 hover:text-white transition-colors p-2"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Badge */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/20 border border-blue-500 rounded-full mb-6"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  {selectedExoplanet?.name ? (
                    (() => {
                      const path = makeNasaPath(selectedExoplanet.name)
                      const url = `https://science.nasa.gov/exoplanet-catalog/${path}`
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-blue-200 hover:text-white px-3 py-1 rounded-md bg-blue-500/10 border border-transparent hover:bg-blue-500/20 transition-colors"
                        >
                          Ver en NASA: {selectedExoplanet.name}
                        </a>
                      )
                    })()
                  ) : (
                    <span className="text-sm font-semibold text-blue-400">CONFIRMED EXOPLANET</span>
                  )}
                </motion.div>

                {/* Datos */}
                <div className="space-y-4">
                  <DataItem
                    icon={<Orbit className="w-5 h-5" />}
                    label="Orbital Period"
                    value={`${selectedExoplanet.koi_period.toFixed(2)} days`}
                    delay={0.15}
                  />
                  <DataItem
                    icon={<Globe className="w-5 h-5" />}
                    label="Planet Radius"
                    value={`${selectedExoplanet.koi_prad.toFixed(2)} R⊕`}
                    delay={0.2}
                  />
                  <DataItem
                    icon={<Thermometer className="w-5 h-5" />}
                    label="Equilibrium Temperature"
                    value={`${selectedExoplanet.koi_teq.toFixed(0)} K`}
                    delay={0.25}
                  />
                  <DataItem
                    icon={<StarIcon className="w-5 h-5" />}
                    label="Stellar Effective Temp"
                    value={`${selectedExoplanet.koi_steff.toFixed(0)} K`}
                    delay={0.3}
                  />
                  <DataItem
                    icon={<Gauge className="w-5 h-5" />}
                    label="Transit Depth"
                    value={`${selectedExoplanet.koi_depth.toFixed(0)} ppm`}
                    delay={0.35}
                  />
                  <DataItem
                    icon={<Radar className="w-5 h-5" />}
                    label="Signal-to-Noise Ratio"
                    value={selectedExoplanet.koi_model_snr.toFixed(1)}
                    delay={0.4}
                  />
                </div>

                {/* Detalles adicionales */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl"
                >
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 tracking-wide">ADDITIONAL PARAMETERS</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Transit Duration</p>
                      <p className="text-white font-medium">{selectedExoplanet.koi_duration.toFixed(2)} hrs</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Insolation Flux</p>
                      <p className="text-white font-medium">{selectedExoplanet.koi_insol.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stellar Log(g)</p>
                      <p className="text-white font-medium">{selectedExoplanet.koi_slogg.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Stellar Radius</p>
                      <p className="text-white font-medium">{selectedExoplanet.koi_srad.toFixed(2)} R☉</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Impact Parameter</p>
                      <p className="text-white font-medium">{selectedExoplanet.koi_impact.toFixed(3)}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Componente auxiliar para items de datos
interface DataItemProps {
  icon: React.ReactNode
  label: string
  value: string
  delay: number
}

function DataItem({ icon, label, value, delay }: DataItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition-colors"
    >
      <div className="text-blue-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </motion.div>
  )
}
