<script setup>
import { computed, useId } from 'vue'
import { avatarMarkup, findAvatar } from '../../data/avatars'

const props = defineProps({
  code: { type: String, default: 'dino' },
  size: { type: Number, default: 48 },
  // normal | focused | record: decided by the screen, never stored
  expression: { type: String, default: 'normal' },
})

const uid = useId()
const avatar = computed(() => findAvatar(props.code))
const markup = computed(() => avatarMarkup(avatar.value, props.expression, uid))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markup is built from the static avatar list -->
  <svg
    class="avatar"
    :class="`is-${expression}`"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    role="img"
    :aria-label="`${avatar.name} avatar`"
    v-html="markup"
  />
</template>

<style scoped>
.avatar {
  display: block;
  flex-shrink: 0;
}

.avatar.is-record {
  animation: hop 0.5s ease-out;
}

@keyframes hop {
  0% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .avatar.is-record {
    animation: none;
  }
}
</style>
