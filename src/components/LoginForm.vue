<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''

  try {
    await authStore.login({
      email: email.value,
      password: password.value,
    })

    router.push('/dashboard')
  } catch (error) {
    // Only a 422 means the credentials are wrong; say what actually happened otherwise
    const status = error.response?.status
    if (status === 422) errorMessage.value = 'Incorrect email or password.'
    else if (status === 429) errorMessage.value = 'Too many attempts. Wait a minute and try again.'
    else errorMessage.value = 'Could not log in. Check your connection and try again.'
    console.error('Login error:', error)
  }
}
</script>

<template>
  <div class="login-page">
    <AmbientBackground />

    <FormCard title="Gym Weight Tracker" @submit.prevent="handleLogin">
      <UnderlineField id="email" v-model="email" label="Email" type="email" required autocomplete="email" />
      <UnderlineField
        id="password"
        v-model="password"
        label="Password"
        type="password"
        required
        autocomplete="current-password"
      />

      <BaseButton type="submit" size="lg" block class="submit">Log in</BaseButton>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <p class="switch-text">
        Don't have an account?
        <a href="#" class="switch-link" @click.prevent="router.push('/register')">Sign up</a>
      </p>
    </FormCard>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-night-floor);
  padding: 24px;
  overflow: hidden;
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
