<script setup>
import { useRouter } from 'vue-router'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'

const router = useRouter()
</script>

<template>
  <div class="not-found-page">
    <AmbientBackground />
    <main class="not-found">
      <p class="code">404</p>
      <h1 class="title">This page is not on the floor</h1>
      <p class="message">The address may be mistyped, or the workout was deleted.</p>
      <BaseButton size="lg" @click="router.push('/dashboard')">Back to workouts</BaseButton>
    </main>
  </div>
</template>

<style scoped>
.not-found-page {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  background: var(--color-night-floor);
  color: var(--color-text-primary);
  padding: 24px;
}

.not-found {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 28px 26px 32px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
}

.code {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 52px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}

.title {
  margin: 4px 0 8px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  line-height: 1.2;
}

.message {
  margin: 0 0 22px;
  max-width: 44ch;
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
