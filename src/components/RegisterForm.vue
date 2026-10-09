<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const errorMessage = ref('')

async function handleRegister() {
  errorMessage.value = ''

  try {
    await authStore.register({
      name: name.value,
      email: email.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    router.push('/dashboard')
  } catch (error) {
    errorMessage.value = 'Could not create the account. Check the details you entered.'
    console.error('Registration error:', error)
  }
}
</script>

<template>
  <div class="register-page">
    <AmbientBackground />

    <FormCard title="Gym Weight Tracker" @submit.prevent="handleRegister">
      <UnderlineField id="name" v-model="name" label="Name" type="text" required autocomplete="name" />
      <UnderlineField id="email" v-model="email" label="Email" type="email" required autocomplete="email" />
      <UnderlineField
        id="password"
        v-model="password"
        label="Password"
        type="password"
        required
        autocomplete="new-password"
      />
      <UnderlineField
        id="password_confirmation"
        v-model="passwordConfirmation"
        label="Confirm password"
        type="password"
        required
        autocomplete="new-password"
      />

      <BaseButton type="submit" size="lg" block class="submit">Sign up</BaseButton>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <p class="switch-text">
        Already have an account?
        <a href="#" class="switch-link" @click.prevent="router.push('/login')">Log in</a>
      </p>
    </FormCard>
  </div>
</template>

<style scoped>
.register-page {
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
