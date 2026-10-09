<script setup>
import { ref } from 'vue'
import authStore from '../../stores/auth'
import { avatars } from '../../data/avatars'
import Avatar from './Avatar.vue'

const open = defineModel({ type: Boolean, default: false })

const savingCode = ref(null)
const errorMessage = ref('')

async function choose(code) {
  if (savingCode.value) return
  errorMessage.value = ''
  savingCode.value = code

  try {
    await authStore.updateAvatar(code)
    open.value = false
  } catch (error) {
    errorMessage.value = 'Could not save your avatar. Try again.'
    console.error('Failed to update avatar:', error)
  } finally {
    savingCode.value = null
  }
}
</script>

<template>
  <v-dialog v-model="open" max-width="380">
    <v-card color="surface-bright" border class="picker">
      <h2 class="picker-title">Choose your avatar</h2>

      <div class="grid">
        <button
          v-for="avatar in avatars"
          :key="avatar.code"
          type="button"
          class="option"
          :class="{ selected: authStore.state.user?.avatar === avatar.code }"
          :disabled="savingCode !== null"
          :aria-label="avatar.name"
          :aria-pressed="authStore.state.user?.avatar === avatar.code"
          @click="choose(avatar.code)"
        >
          <Avatar :code="avatar.code" :size="72" />
          <span class="option-name">{{ avatar.name }}</span>
        </button>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.picker {
  padding: 20px 22px;
}

.picker-title {
  font-size: 18px;
  margin: 0 0 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 4px;
  background: var(--color-surface-low);
  border: 2px solid transparent;
  border-radius: var(--radius-card);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.option:hover:not(:disabled) {
  background: var(--color-surface-hover);
}

.option:focus-visible {
  outline: 2px solid var(--color-accent-blush);
  outline-offset: 2px;
}

.option.selected {
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.option:disabled {
  opacity: 0.6;
  cursor: default;
}

.error {
  margin: 14px 0 0;
  color: var(--color-danger-text);
  font-size: 14px;
}
</style>
