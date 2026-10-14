<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

const email = ref('')
const emailError = ref('')
const errorMessage = ref('')
const isSending = ref(false)
// Set once the link is on its way: the form is replaced by what to do next
const sentTo = ref('')

watch(email, () => (emailError.value = ''))

async function handleSubmit() {
  emailError.value = ''
  errorMessage.value = ''
  isSending.value = true

  try {
    await api.post('/forgot-password', { email: email.value })
    sentTo.value = email.value
  } catch (error) {
    const status = error.response?.status
    const errors = error.response?.data?.errors
    if (status === 422 && errors?.email) emailError.value = errors.email[0]
    else if (status === 429) errorMessage.value = 'Too many attempts. Wait a minute and try again.'
    else errorMessage.value = 'Could not send the email. Check your connection and try again.'
    console.error('Forgot password error:', error)
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <AmbientBackground />

    <FormCard title="Reset password" @submit.prevent="handleSubmit">
      <template v-if="sentTo">
        <p class="text">
          We sent a link to <strong>{{ sentTo }}</strong
          >. Open it to choose a new password. It works for 60 minutes.
        </p>
        <p class="hint">Nothing in your inbox? Check the spam folder.</p>
        <BaseButton size="lg" block class="submit" @click="router.push('/login')"
          >Back to log in</BaseButton
        >
      </template>

      <template v-else>
        <p class="text">
          Enter the email of your account and we will send you a link to choose a new password.
        </p>
        <UnderlineField
          id="email"
          v-model="email"
          label="Email"
          type="email"
          required
          autocomplete="email"
          :error-messages="emailError"
        />

        <BaseButton type="submit" size="lg" block class="submit" :loading="isSending"
          >Send link</BaseButton
        >

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <p class="switch-text">
          Remembered it?
          <a href="#" class="switch-link" @click.prevent="router.push('/login')">Log in</a>
        </p>
      </template>
    </FormCard>
  </div>
</template>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-night-floor);
  padding: 24px;
  overflow: hidden;
}

.text {
  margin: 0 0 14px;
  font-size: 15px;
  line-height: 1.5;
}

.hint {
  margin: 0 0 14px;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.submit {
  margin-top: 4px;
}

.error {
  color: var(--color-danger-text);
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 0;
}

.switch-text {
  margin-top: 14px;
  margin-bottom: 0;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.switch-link {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
}

.switch-link:hover {
  text-decoration: underline;
}
</style>
