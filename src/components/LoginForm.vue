<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { ensureCsrfCookie } from '../services/api'
// import ElectricBorder from './ElectricBorder.vue'
import SideRays from './SideRays.vue'

const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function handleLogin() {
  errorMessage.value = ''

  try {
    await ensureCsrfCookie()

    const response = await api.post('/login', {
      email: email.value,
      password: password.value,
    })

    console.log('Login reușit, utilizator:', response.data.data.user)
  } catch (error) {
    errorMessage.value = 'Email sau parolă incorecte.'
    console.error('Eroare login:', error)
  }
}
</script>

<template>
  <div class="login-page">
    <div class="rays-bg">
      <SideRays
        :speed="1.5"
        ray-color1="#E8158A"
        ray-color2="#FFB3DE"
        :intensity="2.6"
        :spread="3.2"
        origin="top-right"
        :tilt="0"
        :saturation="1.5"
        :blend="0.6"
        :falloff="0.9"
        :opacity="0.95"
      />
    </div>
<!--    <ElectricBorder-->
<!--      color="#E8158A"-->
<!--      :speed="0.6"-->
<!--      :chaos="0.1"-->
<!--      :thickness="2"-->
<!--      :border-radius="16"-->
<!--      class="login-card-wrap"-->
<!--    >-->
      <form class="login-card" @submit.prevent="handleLogin">
        <h1 class="login-title">Gym Weight Tracker</h1>
        <div class="login-bar"></div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" required autocomplete="email" />
        </div>

        <div class="field">
          <label for="password">Parolă</label>
          <input id="password" v-model="password" type="password" required autocomplete="current-password" />
        </div>

        <button type="submit">Intră în cont</button>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <p class="switch-text">
          Nu ai cont?
          <a href="#" class="switch-link" @click.prevent="router.push('/register')">Înregistrează-te</a>
        </p>
      </form>
<!--    </ElectricBorder>-->
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #08060A;
  padding: 24px;
  overflow: hidden;
}

.rays-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.login-card-wrap {
  width: 100%;
  max-width: 360px;
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 360px;
  background: #2A2531;
  border: 1px solid #423B49;
  border-radius: 12px;
  padding: 24px 28px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
}

.login-title {
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.5px;
  color: #F5F0F4;
  margin: 0 0 6px;
}

.login-bar {
  width: 48px;
  height: 4px;
  background: #E8158A;
  border-radius: 2px;
  margin: 0 0 18px;
}

.field {
  margin-bottom: 12px;
}

.field label {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #C9C3CF;
  margin-bottom: 5px;
}

.field input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #38333C;
  color: #F5F0F4;
  font-size: 16px;
  padding: 6px 2px;
  outline: none;
  transition: border-color 0.15s ease;
}

.field input:focus {
  border-bottom-color: #E8158A;
}

.field input::placeholder {
  color: #625C68;
}

button[type='submit'] {
  width: 100%;
  background: #E8158A;
  color: #F5F0F4;
  border: none;
  border-radius: 4px;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
  box-shadow: 0 0 0 rgba(232, 21, 138, 0);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

button[type='submit']:hover {
  background: #CE117B;
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(232, 21, 138, 0.45), 0 0 24px rgba(232, 21, 138, 0.5);
}

button[type='submit']:active {
  transform: translateY(-1px);
}

.error {
  color: #FF6B6B;
  font-size: 14px;
  margin-top: 10px;
  margin-bottom: 0;
}

.switch-text {
  margin-top: 14px;
  margin-bottom: 0;
  text-align: center;
  font-size: 14px;
  color: #8A8390;
}

.switch-link {
  color: #E8158A;
  font-weight: 600;
  text-decoration: none;
  margin-left: 4px;
}

.switch-link:hover {
  text-decoration: underline;
}
</style>
