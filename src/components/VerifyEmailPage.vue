<script setup>
import { useRoute, useRouter } from 'vue-router'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'

const route = useRoute()
const router = useRouter()

// Set by the API when it sends the browser back here from the link in the email:
// verified | expired | invalid. Missing right after signing up, when `sent` holds the address.
const status = String(route.query.status ?? '')
const sentTo = String(route.query.sent ?? '')
</script>

<template>
  <div class="auth-page">
    <AmbientBackground />

    <FormCard title="Confirm your email" @submit.prevent>
      <template v-if="status === 'verified'">
        <p class="text">Your email is confirmed and your account is ready. Log in to start.</p>
        <BaseButton size="lg" block @click="router.push('/login')">Log in</BaseButton>
      </template>

      <template v-else-if="status === 'expired' || status === 'invalid'">
        <p class="text">
          This confirmation link has expired or is broken. Sign up again to get a new one.
        </p>
        <BaseButton size="lg" block @click="router.push('/register')">Sign up again</BaseButton>
      </template>

      <template v-else>
        <p class="text">
          We sent a link to <strong>{{ sentTo || 'your email' }}</strong
          >. Open it to finish creating your account.
        </p>
        <p class="hint">
          Nothing in your inbox? Check the spam folder. The link works for 60 minutes; after that,
          sign up again.
        </p>
        <BaseButton size="lg" block @click="router.push('/login')">Go to log in</BaseButton>
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
</style>
