<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

const props = defineProps({
  color: { type: String, default: '#85FF80' },
  speed: { type: Number, default: 1 },
  chaos: { type: Number, default: 0.14 },
  thickness: { type: Number, default: 1 },
  borderRadius: { type: Number, default: 24 },
})

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0,0,0,${alpha})`
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const int = parseInt(h, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const canvasRef = useTemplateRef('canvasRef')
const containerRef = useTemplateRef('containerRef')
const animationRef = ref(null)
const timeRef = ref(0)
const lastFrameTimeRef = ref(0)

function random(x) {
  return (Math.sin(x * 12.9898) * 43758.5453) % 1
}

function noise2D(x, y) {
  const i = Math.floor(x)
  const j = Math.floor(y)
  const fx = x - i
  const fy = y - j

  const a = random(i + j * 57)
  const b = random(i + 1 + j * 57)
  const c = random(i + (j + 1) * 57)
  const d = random(i + 1 + (j + 1) * 57)

  const ux = fx * fx * (3.0 - 2.0 * fx)
  const uy = fy * fy * (3.0 - 2.0 * fy)

  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy
}

function octavedNoise(x, octaves, lacunarity, gain, baseAmplitude, baseFrequency, time, seed, baseFlatness) {
  let y = 0
  let amplitude = baseAmplitude
  let frequency = baseFrequency

  for (let i = 0; i < octaves; i++) {
    let octaveAmplitude = amplitude
    if (i === 0) {
      octaveAmplitude *= baseFlatness
    }
    y += octaveAmplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3)
    frequency *= lacunarity
    amplitude *= gain
  }

  return y
}

function getCornerPoint(centerX, centerY, radius, startAngle, arcLength, progress) {
  const angle = startAngle + progress * arcLength
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  }
}

function getRoundedRectPoint(t, left, top, width, height, radius) {
  const straightWidth = width - 2 * radius
  const straightHeight = height - 2 * radius
  const cornerArc = (Math.PI * radius) / 2
  const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc
  const distance = t * totalPerimeter

  let accumulated = 0

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth
    return { x: left + radius + progress * straightWidth, y: top }
  }
  accumulated += straightWidth

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight
    return { x: left + width, y: top + radius + progress * straightHeight }
  }
  accumulated += straightHeight

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightWidth) {
    const progress = (distance - accumulated) / straightWidth
    return { x: left + width - radius - progress * straightWidth, y: top + height }
  }
  accumulated += straightWidth

  if (distance <= accumulated + cornerArc) {
    const progress = (distance - accumulated) / cornerArc
    return getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, progress)
  }
  accumulated += cornerArc

  if (distance <= accumulated + straightHeight) {
    const progress = (distance - accumulated) / straightHeight
    return { x: left, y: top + height - radius - progress * straightHeight }
  }
  accumulated += straightHeight

  const progress = (distance - accumulated) / cornerArc
  return getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, progress)
}

function resolveBorderRadius(borderRadius, maxRadius) {
  if (typeof borderRadius === 'number') {
    return Math.min(borderRadius, maxRadius)
  }
  return Math.min(props.borderRadius, maxRadius)
}

let cleanup = null
function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const octaves = 5
  const lacunarity = 1.6
  const gain = 0.7
  const amplitude = props.chaos
  const frequency = 10
  const baseFlatness = 0
  const displacement = 60
  const borderOffset = 60
  const targetFrameInterval = 1000 / 30

  const updateSize = () => {
    const rect = container.getBoundingClientRect()
    const width = rect.width + borderOffset * 2
    const height = rect.height + borderOffset * 2

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    return { width, height }
  }

  let { width, height } = updateSize()
  let lastDpr = Math.min(window.devicePixelRatio || 1, 2)

  let lastDrawTime = 0

  const drawElectricBorder = (currentTime) => {
    if (!canvas || !ctx) return

    animationRef.value = requestAnimationFrame(drawElectricBorder)

    if (currentTime - lastDrawTime < targetFrameInterval) return
    lastDrawTime = currentTime

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (dpr !== lastDpr) {
      lastDpr = dpr
      const newSize = updateSize()
      width = newSize.width
      height = newSize.height
    }

    const deltaTime = (currentTime - lastFrameTimeRef.value) / 1000
    timeRef.value += deltaTime * props.speed
    lastFrameTimeRef.value = currentTime

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const scale = displacement
    const left = borderOffset
    const top = borderOffset
    const borderWidth = width - 2 * borderOffset
    const borderHeight = height - 2 * borderOffset
    const maxRadius = Math.min(borderWidth, borderHeight) / 2
    const radius = resolveBorderRadius(props.borderRadius, maxRadius)

    const approximatePerimeter = 2 * (borderWidth + borderHeight) + 2 * Math.PI * radius
    const sampleCount = Math.floor(approximatePerimeter / 4)

    const path = new Path2D()

    for (let i = 0; i <= sampleCount; i++) {
      const progress = i / sampleCount

      const point = getRoundedRectPoint(progress, left, top, borderWidth, borderHeight, radius)

      const xNoise = octavedNoise(
        progress * 8,
        octaves,
        lacunarity,
        gain,
        amplitude,
        frequency,
        timeRef.value,
        0,
        baseFlatness,
      )
      const yNoise = octavedNoise(
        progress * 8,
        octaves,
        lacunarity,
        gain,
        amplitude,
        frequency,
        timeRef.value,
        1,
        baseFlatness,
      )

      const displacedX = point.x + xNoise * scale
      const displacedY = point.y + yNoise * scale

      if (i === 0) {
        path.moveTo(displacedX, displacedY)
      } else {
        path.lineTo(displacedX, displacedY)
      }
    }

    path.closePath()

    // Soft glow that hugs the exact jagged path
    ctx.save()
    ctx.strokeStyle = props.color
    ctx.shadowColor = props.color
    ctx.shadowBlur = 12
    ctx.lineWidth = props.thickness * 2
    ctx.globalAlpha = 0.5
    ctx.stroke(path)
    ctx.restore()

    // Crisp core line
    ctx.save()
    ctx.strokeStyle = props.color
    ctx.shadowBlur = 0
    ctx.lineWidth = props.thickness
    ctx.globalAlpha = 1
    ctx.stroke(path)
    ctx.restore()
  }

  const resizeObserver = new ResizeObserver(() => {
    const newSize = updateSize()
    width = newSize.width
    height = newSize.height
  })
  resizeObserver.observe(container)

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (animationRef.value) {
        cancelAnimationFrame(animationRef.value)
        animationRef.value = null
      }
    } else if (!animationRef.value) {
      lastFrameTimeRef.value = performance.now()
      animationRef.value = requestAnimationFrame(drawElectricBorder)
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  animationRef.value = requestAnimationFrame(drawElectricBorder)

  cleanup = () => {
    if (animationRef.value) {
      cancelAnimationFrame(animationRef.value)
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    resizeObserver.disconnect()
  }
}

watch(
  () => [props.color, props.speed, props.chaos, props.thickness, props.borderRadius],
  () => {
    cleanup?.()
    requestAnimationFrame(() => {
      setupCanvas()
    })
  },
)

onMounted(() => {
  setupCanvas()
})

onBeforeUnmount(() => {
  cleanup?.()
})

const wrapperStyle = computed(() => ({
  '--electric-border-color': props.color,
  borderRadius: `${props.borderRadius}px`,
}))
</script>

<template>
  <div ref="containerRef" class="electric-border" :style="wrapperStyle">
    <div class="electric-border-canvas-wrap">
      <canvas ref="canvasRef" class="electric-border-canvas" />
    </div>

    <div class="electric-border-layers">
      <div
        class="electric-border-layer"
        :style="{
          border: `2px solid ${hexToRgba(color, 0.6)}`,
          filter: 'blur(1px)',
        }"
      />
      <div
        class="electric-border-layer"
        :style="{
          border: `2px solid ${color}`,
          filter: 'blur(4px)',
        }"
      />
    </div>

    <div class="electric-border-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.electric-border {
  position: relative;
  overflow: visible;
  isolation: isolate;
}

.electric-border-canvas-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.electric-border-canvas {
  display: block;
}

.electric-border-layers {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.electric-border-layer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}

.electric-border-content {
  position: relative;
  z-index: 1;
  border-radius: inherit;
}
</style>
