<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const route = useRoute()
const router = useRouter()

// Both come from the link in the email
const token = String(route.query.token ?? '')
const email = String(route.query.email ?? '')

const password = ref('')
const passwordConfirmation = ref('')
const fieldErrors = ref({})
const errorMessage = ref('')
const isSaving = ref(false)
const isDone = ref(false)
// The token was refused (expired, already used): only a new link helps
const linkIsBad = ref(false)

watch(password, () => delete fieldErrors.value.password)
watch(passwordConfirmation, () => delete fieldErrors.value.password)

async function handleSubmit() {
  fieldErrors.value = {}
  errorMessage.value = ''
  linkIsBad.value = false
  isSaving.value = true

  try {
    await api.post('/reset-password', {
      token,
      email,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    // The server logged the account out everywhere, this tab included
    authStore.clearUser()
    isDone.value = true
  } catch (error) {
    const status = error.response?.status
    const errors = error.response?.data?.errors
    if (status === 422 && errors?.password) fieldErrors.value = { password: errors.password[0] }
    else if (status === 422 && errors) {
      errorMessage.value = (errors.token ?? errors.email)?.[0]
      linkIsBad.value = true
    } else if (status === 429)
      errorMessage.value = 'Too many attempts. Wait a minute and try again.'
    else errorMessage.value = 'Could not change the password. Check your connection and try again.'
    console.error('Reset password error:', error)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <AmbientBackground />

    <FormCard title="New password" @submit.prevent="handleSubmit">
      <template v-if="isDone">
        <p class="text">Your password was changed. Log in with the new one.</p>
        <BaseButton size="lg" block class="submit" @click="router.push('/login')"
          >Log in</BaseButton
        >
      </template>

      <template v-else-if="!token || !email">
        <p class="text">
          This link is incomplete. Open the link from the email again, or ask for a new one.
        </p>
        <BaseButton size="lg" block class="submit" @click="router.push('/forgot-password')">
          Ask for a new link
        </BaseButton>
      </template>

      <template v-else>
        <p class="text">
          Choose a new password for <strong>{{ email }}</strong
          >.
        </p>
        <UnderlineField
          id="password"
          v-model="password"
          label="New password"
          type="password"
          required
          autocomplete="new-password"
          :error-messages="fieldErrors.password"
        />
        <UnderlineField
          id="password_confirmation"
          v-model="passwordConfirmation"
          label="Confirm new password"
          type="password"
          required
          autocomplete="new-password"
        />

        <BaseButton type="submit" size="lg" block class="submit" :loading="isSaving"
          >Change password</BaseButton
        >

        <p v-if="errorMessage" class="error">
          {{ errorMessage }}
          <a
            v-if="linkIsBad"
            href="#"
            class="switch-link"
            @click.prevent="router.push('/forgot-password')"
          >
            Ask for a new link
          </a>
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

.submit {
  margin-top: 4px;
}

.error {
  color: var(--color-danger-text);
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 0;
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
