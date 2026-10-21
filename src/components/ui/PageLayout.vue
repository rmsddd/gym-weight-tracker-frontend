<script setup>
import { mdiArrowLeft } from '@mdi/js'
import AmbientBackground from './AmbientBackground.vue'

defineProps({
  title: { type: String, required: true },
  // { to, label }: a link up to the parent page, shown above the title
  back: { type: Object, default: null },
})
</script>

<template>
  <div class="page">
    <AmbientBackground />
    <main class="container">
      <RouterLink v-if="back" :to="back.to" class="back">
        <v-icon :icon="mdiArrowLeft" size="18" />{{ back.label }}
      </RouterLink>
      <header class="page-header">
        <h1 class="page-title">{{ title }}</h1>
        <slot name="actions" />
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

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 15px;
  text-decoration: none;
  padding: 8px 8px 8px 0;
  /* Belongs to the title below it, so it sits closer than the container gap */
  margin: -8px 0 -12px;
  transition: color 0.2s var(--ease-out);
}

.back:hover {
  color: var(--color-text-primary);
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
