<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

const username = ref('')
const fieldError = ref('')
const errorMessage = ref('')
const isSaving = ref(false)

watch(username, () => (fieldError.value = ''))

async function save() {
  if (isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''

  try {
    await authStore.setUsername(username.value)
    router.push('/dashboard')
  } catch (error) {
    if (error.response?.status === 422) {
      fieldError.value = error.response.data.errors?.username?.[0] ?? 'Choose another username.'
    } else {
      errorMessage.value = 'Could not save your username. Check your connection and try again.'
    }
    console.error('Failed to set username:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="choose-page">
    <AmbientBackground />

    <FormCard title="Choose your username" @submit.prevent="save">
      <p class="intro">
        Friends find you by it. Pick carefully: it can't be changed later, though your name can.
      </p>
      <UnderlineField
        id="username"
        v-model="username"
        label="Username"
        type="text"
        required
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        hint="3–20 letters, digits, dots or underscores"
        persistent-hint
        :error-messages="fieldError"
      />

      <BaseButton type="submit" size="lg" block class="submit" :loading="isSaving"
        >Save username</BaseButton
      >

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    </FormCard>
  </div>
</template>

<style scoped>
.choose-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-night-floor);
  padding: 24px;
  overflow: hidden;
}

.intro {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.submit {
  margin-top: 12px;
}

.error {
  color: var(--color-danger-text);
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 0;
}
</style>
