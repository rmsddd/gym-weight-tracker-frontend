<script setup>
import { computed, useId } from 'vue'
import { findAvatar } from '../../data/avatars'
import { avatarBodyMarkup } from '../../data/avatarBody'

const props = defineProps({
  code: { type: String, default: 'dino' },
  // { chest: 0..3, back: 0..3, ... }: see MUSCLE_GROUPS in data/avatarBody.js
  levels: { type: Object, default: () => ({}) },
  width: { type: Number, default: 150 },
})

const uid = useId()
const avatar = computed(() => findAvatar(props.code))
const markup = computed(() => avatarBodyMarkup(avatar.value, props.levels, uid))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- markup is built from the static avatar list -->
  <svg
    class="body-avatar"
    :width="width"
    :height="Math.round((width * 184) / 120)"
    viewBox="0 0 120 184"
    role="img"
    :aria-label="`${avatar.name} avatar, full body`"
    v-html="markup"
  />
</template>

<style scoped>
.body-avatar {
  display: block;
  flex-shrink: 0;
}
</style>
