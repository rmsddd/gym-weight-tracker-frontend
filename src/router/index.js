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
const FriendsPage = () => import('../components/FriendsPage.vue')
const AddFriendsPage = () => import('../components/AddFriendsPage.vue')
const FriendPage = () => import('../components/FriendPage.vue')
const ChooseUsernamePage = () => import('../components/ChooseUsernamePage.vue')
const AdminPage = () => import('../components/AdminPage.vue')

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
    {
      path: '/records',
      name: 'records',
      component: PersonalRecords,
      meta: { requiresAuth: true, permission: 'stats.view' },
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
      meta: { requiresAuth: true, permission: 'workouts.view' },
    },
    {
      path: '/templates',
      name: 'templates',
      component: TemplatesPage,
      meta: { requiresAuth: true, permission: 'templates.view' },
    },
    { path: '/profile', name: 'profile', component: ProfilePage, meta: { requiresAuth: true } },
    {
      path: '/friends',
      name: 'friends',
      component: FriendsPage,
      meta: { requiresAuth: true, permission: 'friends.view' },
    },
    {
      path: '/friends/add',
      name: 'friends-add',
      component: AddFriendsPage,
      meta: { requiresAuth: true, permission: 'friends.search' },
    },
    {
      path: '/friends/:username',
      name: 'friend',
      component: FriendPage,
      meta: { requiresAuth: true, permission: 'friends.view' },
    },
    // Accounts from before usernames existed land here until they choose one
    {
      path: '/choose-username',
      name: 'choose-username',
      component: ChooseUsernamePage,
      meta: { requiresAuth: true, choosingUsername: true },
    },
    {
      path: '/workouts/new',
      name: 'workout-new',
      component: AddWorkoutForm,
      meta: { requiresAuth: true, permission: 'workouts.create' },
    },
    {
      path: '/workouts/:id',
      name: 'workout-active',
      component: ActiveWorkout,
      meta: { requiresAuth: true, permission: 'workouts.view' },
    },
    // The root account's page: roles, their permissions and who has which
    {
      path: '/admin',
      name: 'admin',
      component: AdminPage,
      meta: { requiresAuth: true, requiresRoot: true },
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

  // Friends find each other by username, so an account without one picks it before anything else
  const needsUsername = isAuthenticated && !authStore.state.user.username
  if (needsUsername && !isOpen && !to.meta.choosingUsername) {
    return { name: 'choose-username' }
  }
  if (!needsUsername && to.meta.choosingUsername) {
    return { name: 'dashboard' }
  }

  if (to.meta.requiresRoot && !authStore.isRoot()) {
    return { name: 'dashboard' }
  }

  // A page for something the role may not do is not opened: back to the dashboard
  if (to.meta.permission && !authStore.can(to.meta.permission)) {
    return { name: 'dashboard' }
  }

  return true
})

// Once logged in, fetch the other tabs' chunks while the browser is idle, so tapping one opens
// it at once instead of first waiting for its code
let hasPrefetched = false
router.afterEach(() => {
  if (hasPrefetched || authStore.state.user === null) return
  hasPrefetched = true
  const idle = window.requestIdleCallback ?? ((callback) => setTimeout(callback, 1500))
  idle(() =>
    [HistoryPage, TemplatesPage, FriendsPage, ProfilePage, ActiveWorkout].forEach((load) =>
      load().catch(() => {}),
    ),
  )
})

export default router
