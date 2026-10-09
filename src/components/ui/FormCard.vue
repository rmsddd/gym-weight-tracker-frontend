<script setup>
defineProps({
  title: { type: String, required: true },
  maxWidth: { type: String, default: '360px' },
})
</script>

<template>
  <v-card
    tag="form"
    class="form-card"
    color="surface-bright"
    border
    :max-width="maxWidth"
  >
    <h1 class="form-title">{{ title }}</h1>
    <div class="form-bar"></div>
    <slot />
  </v-card>
</template>

<style scoped>
.form-card {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 24px 28px;
  box-shadow: var(--shadow-panel-strong);
}

.form-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.5px;
  margin: 0 0 6px;
}

.form-bar {
  width: 48px;
  height: 4px;
  background: var(--color-accent);
  border-radius: 2px;
  margin: 0 0 18px;
}
</style>
