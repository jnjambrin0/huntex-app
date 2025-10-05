import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  prevZ: number
}

interface HyperspaceAnimationProps {
  onComplete: () => void
}

export function HyperspaceAnimation({ onComplete }: HyperspaceAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    // Constants
    const STAR_COUNT = 250
    const ANIMATION_DURATION = 4000 // 4 seconds
    const MAX_SPEED = 50
    const MIN_SPEED = 0.5
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Initialize stars
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
        prevZ: 0,
      })
    }

    // Animation timing
    const startTime = Date.now()
    let animationFrameId: number

    // Easing function for smooth acceleration/deceleration
    const easeInOutCubic = (t: number): number => {
      if (t < 0.5) {
        return 4 * t * t * t
      } else {
        return 1 - Math.pow(-2 * t + 2, 3) / 2
      }
    }

    // Animation loop
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

      // Calculate current speed with acceleration phases
      let speed: number
      if (progress < 0.25) {
        // Phase 1: Rapid acceleration (0-1s)
        const t = progress / 0.25
        speed = MIN_SPEED + (MAX_SPEED * 0.3) * easeInOutCubic(t)
      } else if (progress < 0.75) {
        // Phase 2: Maximum velocity with tunnel effect (1-3s)
        speed = MAX_SPEED
      } else {
        // Phase 3: Gradual deceleration (3-4s)
        const t = (progress - 0.75) / 0.25
        speed = MAX_SPEED * (1 - easeInOutCubic(t))
      }

      // Create motion blur effect with transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw stars
      stars.forEach((star) => {
        // Save previous z for trail effect
        star.prevZ = star.z

        // Move star towards viewer
        star.z -= speed

        // Reset star if it goes behind camera or too far away
        if (star.z <= 1) {
          star.x = (Math.random() - 0.5) * canvas.width * 2
          star.y = (Math.random() - 0.5) * canvas.height * 2
          star.z = canvas.width
          star.prevZ = star.z
        }

        // 3D to 2D perspective projection
        const sx = (star.x / star.z) * canvas.width + centerX
        const sy = (star.y / star.z) * canvas.height + centerY

        // Previous position for trail
        const px = (star.x / star.prevZ) * canvas.width + centerX
        const py = (star.y / star.prevZ) * canvas.height + centerY

        // Calculate star size based on distance
        const size = (1 - star.z / canvas.width) * 3
        const opacity = Math.min(1, (1 - star.z / canvas.width) * 2)

        // Draw trail/streak from previous position
        const gradient = ctx.createLinearGradient(px, py, sx, sy)
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`)
        gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity * 0.8})`)

        ctx.strokeStyle = gradient
        ctx.lineWidth = Math.max(size * 0.5, 0.5)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(sx, sy)
        ctx.stroke()

        // Draw star point
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(size, 0.5), 0, Math.PI * 2)
        ctx.fill()
      })

      // Continue animation or complete
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        // Animation complete, trigger callback
        onComplete()
      }
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [onComplete])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-30"
      style={{ background: 'black' }}
    />
  )
}
