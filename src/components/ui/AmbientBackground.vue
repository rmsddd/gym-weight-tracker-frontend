<script setup>
// Cheap replacement for the WebGL backdrops: three blurred colour blobs. With `animated` they
// drift on a CSS animation (transform only, so it stays on the compositor); the browser pauses
// it in hidden tabs and it is switched off for prefers-reduced-motion.
defineProps({ animated: { type: Boolean, default: false } })
</script>

<template>
  <div class="ambient" :class="{ 'is-animated': animated }" aria-hidden="true">
    <span class="blob blob-a"></span>
    <span class="blob blob-b"></span>
    <span class="blob blob-c"></span>
  </div>
</template>

<style scoped>
.ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.55;
  will-change: transform;
}

.blob-a {
  width: 55vmax;
  height: 55vmax;
  top: -25vmax;
  right: -15vmax;
  background: radial-gradient(circle closest-side, var(--color-accent), transparent);
}

.blob-b {
  width: 45vmax;
  height: 45vmax;
  top: 10vmax;
  left: -20vmax;
  background: radial-gradient(circle closest-side, #5a1a94, transparent);
}

.blob-c {
  width: 40vmax;
  height: 40vmax;
  bottom: -20vmax;
  right: 5vmax;
  background: radial-gradient(circle closest-side, #3a29ff, transparent);
  opacity: 0.35;
}

.is-animated .blob {
  animation: drift ease-in-out infinite alternate;
}

.is-animated .blob-a {
  --drift-x: 12vw;
  --drift-y: 8vh;
  animation-duration: 14s;
}

.is-animated .blob-b {
  --drift-x: -10vw;
  --drift-y: -6vh;
  animation-duration: 18s;
}

.is-animated .blob-c {
  --drift-x: -8vw;
  --drift-y: 10vh;
  animation-duration: 16s;
}

@keyframes drift {
  to {
    transform: translate(var(--drift-x), var(--drift-y));
  }
}

@media (prefers-reduced-motion: reduce) {
  .is-animated .blob {
    animation: none;
  }
}
</style>
