import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Globe, Thermometer, Orbit, Star as StarIcon, Gauge, Radar } from 'lucide-react'

interface ExoplanetData {
  id: number
  name: string
  koi_period: number
  koi_depth: number
  koi_duration: number
  koi_prad: number
  koi_teq: number
  koi_insol: number
  koi_steff: number
  koi_slogg: number
  koi_srad: number
  koi_model_snr: number
  koi_impact: number
  discoveryDate: string
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

// Función para generar datos aleatorios de exoplanetas
const generateExoplanetData = (id: number): ExoplanetData => {
  const names = [
    'Kepler-442b', 'HD 209458b', 'TRAPPIST-1e', 'Proxima Centauri b',
    'K2-18b', 'TOI-700d', 'LHS 1140b', 'GJ 1214b', 'WASP-121b', 'HAT-P-7b',
    '55 Cancri e', 'CoRoT-7b', 'Gliese 876d', 'HD 189733b', 'TrES-2b'
  ]

  return {
    id,
    name: names[id % names.length] || `KOI-${1000 + id}`,
    koi_period: Math.random() * 400 + 0.5,
    koi_depth: Math.random() * 20000 + 100,
    koi_duration: Math.random() * 10 + 0.5,
    koi_prad: Math.random() * 20 + 0.5,
    koi_teq: Math.random() * 2000 + 200,
    koi_insol: Math.random() * 1000,
    koi_steff: Math.random() * 5000 + 3000,
    koi_slogg: Math.random() * 2 + 3,
    koi_srad: Math.random() * 3 + 0.5,
    koi_model_snr: Math.random() * 10000 + 100,
    koi_impact: Math.random() * 1.5,
    discoveryDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
  }
}

export function ResultsPage() {
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
    const MAX_EXOPLANETS = 5 // Límite de exoplanetas para la demo

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
    let lastTime = 0
    let detectionTimer = 0
    const DETECTION_INTERVAL = 4000 // Detectar exoplaneta cada 4 segundos

    // Función para detectar un exoplaneta aleatorio
    const detectExoplanet = () => {
      // Definir zona segura (10% de margen desde cada borde)
      const marginX = canvas.width * 0.1
      const marginY = canvas.height * 0.1

      // Buscar una estrella que no sea ya un exoplaneta Y que esté en zona segura
      const availableStars = stars.filter(s =>
        !s.isExoplanet &&
        s.detectionState === 'idle' &&
        s.x > marginX && s.x < canvas.width - marginX &&
        s.y > marginY && s.y < canvas.height - marginY
      )

      if (availableStars.length === 0) return

      const randomStar = availableStars[Math.floor(Math.random() * availableStars.length)]
      randomStar.detectionState = 'blinking'
      randomStar.blinkCount = 0
      randomStar.isExoplanet = true

      // Generar datos del exoplaneta
      const exoplanetId = detectedCount
      randomStar.exoplanetData = generateExoplanetData(exoplanetId)

      setDetectedCount(prev => prev + 1)
    }

    // Animation loop
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      lastTime = currentTime
      detectionTimer += deltaTime

      // Trigger detección periódica (solo si no hemos alcanzado el límite)
      if (detectionTimer >= DETECTION_INTERVAL && detectedCount < MAX_EXOPLANETS) {
        detectExoplanet()
        detectionTimer = 0
      }

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
