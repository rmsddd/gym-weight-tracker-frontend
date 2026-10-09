<script setup>
// Placeholder rows shaped like the list they stand in for, shown while it loads
defineProps({
  rows: { type: Number, default: 4 },
})
</script>

<template>
  <div class="skeleton-list" role="status" aria-label="Loading">
    <div v-for="n in rows" :key="n" class="skeleton-row" :style="{ animationDelay: `${(n - 1) * 0.12}s` }">
      <span class="bar bar-title"></span>
      <span class="bar bar-meta"></span>
    </div>
  </div>
</template>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
  animation: pulse 1.4s ease-in-out infinite;
}

.bar {
  display: block;
  height: 12px;
  border-radius: var(--radius-button);
  background: var(--color-surface-raised);
}

.bar-title {
  width: 46%;
  height: 14px;
}

.bar-meta {
  width: 28%;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
