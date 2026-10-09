<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | danger
  size: { type: String, default: 'md' }, // sm | md | lg
  block: { type: Boolean, default: false },
})

// Deep Magenta at rest: the light label needs it to stay readable (4.67:1)
const color = computed(() => (props.variant === 'danger' ? 'danger' : 'accent-deep'))
const vVariant = computed(() => (props.variant === 'secondary' ? 'outlined' : 'flat'))
const vSize = computed(() => ({ sm: 'small', md: 'default', lg: 'large' })[props.size])
// Lift and halo only on md/lg primary buttons, never at rest
const lifts = computed(() => props.variant === 'primary' && props.size !== 'sm')
</script>

<template>
  <v-btn
    :color="props.variant === 'secondary' ? undefined : color"
    :variant="vVariant"
    :size="vSize"
    :block="block"
    :class="['base-button', { lifts }]"
  >
    <slot />
  </v-btn>
</template>

<style scoped>
.base-button {
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.base-button.lifts:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: var(--shadow-halo);
}

.base-button.lifts:active:not(:disabled) {
  transform: translateY(-1px);
}
</style>
