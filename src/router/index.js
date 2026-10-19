import { createRouter, createWebHistory } from 'vue-router'
import authStore from '../stores/auth'

// Each page is its own chunk, downloaded the first time its route is visited
const LoginForm = () => import('../components/LoginForm.vue')
const RegisterForm = () => import('../components/RegisterForm.vue')
const Dashboard = () => import('../components/Dashboard.vue')
const AddWorkoutForm = () => import('../components/AddWorkoutForm.vue')
const ActiveWorkout = () => import('../components/ActiveWorkout.vue')
const PersonalRecords = () => import('../components/PersonalRecords.vue')
const ProfilePage = () => import('../components/ProfilePage.vue')
const HistoryPage = () => import('../components/HistoryPage.vue')
const TemplatesPage = () => import('../components/TemplatesPage.vue')
const NotFoundPage = () => import('../components/NotFoundPage.vue')
const ForgotPasswordPage = () => import('../components/ForgotPasswordPage.vue')
const ResetPasswordPage = () => import('../components/ResetPasswordPage.vue')
const VerifyEmailPage = () => import('../components/VerifyEmailPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/login', name: 'login', component: LoginForm, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: RegisterForm, meta: { guestOnly: true } },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordPage,
      meta: { guestOnly: true },
    },
    // Opened from links in emails (and /verify-email right after signing up), logged in or not
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordPage,
      meta: { public: true },
    },
    {
      path: '/verify-email',
      name: 'verify-email',
      component: VerifyEmailPage,
      meta: { public: true },
    },
    { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/records', name: 'records', component: PersonalRecords, meta: { requiresAuth: true } },
    { path: '/history', name: 'history', component: HistoryPage, meta: { requiresAuth: true } },
    {
      path: '/templates',
      name: 'templates',
      component: TemplatesPage,
      meta: { requiresAuth: true },
    },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    {
      path: '/workouts/new',
      name: 'workout-new',
      component: AddWorkoutForm,
      meta: { requiresAuth: true },
    },
    {
      path: '/workouts/:id',
      name: 'workout-active',
      component: ActiveWorkout,
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
      meta: { public: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (!authStore.state.isInitialized) {
    await authStore.fetchUser()
  }

  const isAuthenticated = authStore.state.user !== null

  // Private by default: a route is reachable without logging in only if it says so
  // (guestOnly or public). A new route that forgets its meta is locked, not exposed.
  const isOpen = to.meta.guestOnly || to.meta.public

  if (!isOpen && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
