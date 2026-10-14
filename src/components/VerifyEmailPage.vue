<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'

const route = useRoute()
const router = useRouter()

// Set by the API when it sends the browser back here from the link in the email:
// verified | expired | invalid. Missing when the router sends an unconfirmed account here.
const status = String(route.query.status ?? '')

const user = computed(() => authStore.state.user)
const isConfirmed = computed(() => Boolean(user.value?.email_verified_at))

const notice = ref('')
const errorMessage = ref('')
const isSending = ref(false)
const isChecking = ref(false)

onMounted(async () => {
  if (status === 'verified') {
    // The user loaded before the link was opened still says unconfirmed
    if (user.value) await authStore.fetchUser()
    return
  }

  if (status) return

  if (!user.value) router.replace('/login')
  else if (isConfirmed.value) router.replace('/dashboard')
})

async function resend() {
  notice.value = ''
  errorMessage.value = ''
  isSending.value = true

  try {
    const response = await api.post('/email/verification-notification')
    notice.value = response.data.message
  } catch (error) {
    const httpStatus = error.response?.status
    if (httpStatus === 429)
      errorMessage.value = 'We just sent one. Wait a minute before asking for another.'
    else
      errorMessage.value = error.response?.data?.message ?? 'Could not send the email. Try again.'
    console.error('Resend verification error:', error)
  } finally {
    isSending.value = false
  }
}

// For when the link was opened on another device: this tab does not know yet
async function checkAgain() {
  notice.value = ''
  errorMessage.value = ''
  isChecking.value = true

  try {
    await authStore.fetchUser()
    if (isConfirmed.value) router.push('/dashboard')
    else errorMessage.value = 'Not confirmed yet. Open the link from the email first.'
  } finally {
    isChecking.value = false
  }
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="auth-page">
    <AmbientBackground />

    <FormCard title="Confirm your email" @submit.prevent>
      <template v-if="status === 'verified'">
        <p class="text">Your email is confirmed. You're all set!</p>
        <BaseButton v-if="user" size="lg" block @click="router.push('/dashboard')"
          >Go to the app</BaseButton
        >
        <BaseButton v-else size="lg" block @click="router.push('/login')">Log in</BaseButton>
      </template>

      <template v-else>
        <p v-if="status === 'expired'" class="text">
          This confirmation link has expired or is broken. Ask for a new one below.
        </p>
        <p v-else-if="status === 'invalid'" class="text">
          This confirmation link is not valid for your account. Ask for a new one below.
        </p>
        <p v-else-if="user" class="text">
          We sent a link to <strong>{{ user.email }}</strong
          >. Open it to start using the app.
        </p>

        <template v-if="user && !isConfirmed">
          <p class="hint">Nothing in your inbox? Check the spam folder, or send it again.</p>

          <BaseButton size="lg" block :loading="isChecking" @click="checkAgain"
            >I've confirmed it</BaseButton
          >
          <BaseButton variant="secondary" block class="second" :loading="isSending" @click="resend">
            Send the link again
          </BaseButton>

          <p v-if="notice" class="notice">{{ notice }}</p>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <p class="switch-text">
            Wrong email?
            <a href="#" class="switch-link" @click.prevent="logout">Log out</a>
          </p>
        </template>

        <template v-else-if="user">
          <p class="text">Your email is already confirmed.</p>
          <BaseButton size="lg" block @click="router.push('/dashboard')">Go to the app</BaseButton>
        </template>

        <template v-else>
          <p class="hint">Log in to get a new confirmation link.</p>
          <BaseButton size="lg" block @click="router.push('/login')">Log in</BaseButton>
        </template>
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

.second {
  margin-top: 10px;
}

.notice {
  color: var(--color-text-subtle);
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 0;
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
