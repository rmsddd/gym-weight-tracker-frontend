<script setup>
import AmbientBackground from './AmbientBackground.vue'
import AppMenu from './AppMenu.vue'

defineProps({
  title: { type: String, required: true },
})
</script>

<template>
  <div class="page">
    <AmbientBackground />
    <main class="container">
      <header class="page-header">
        <h1 class="page-title">{{ title }}</h1>
        <AppMenu />
      </header>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  background: var(--color-night-floor);
  color: var(--color-text-primary);
  padding: var(--page-pad-top) var(--page-pad-right) var(--page-pad-bottom) var(--page-pad-left);
  box-sizing: border-box;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;
}
</style>
