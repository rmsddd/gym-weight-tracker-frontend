<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  mdiAccountMultipleOutline,
  mdiAccountOutline,
  mdiClipboardListOutline,
  mdiHistory,
  mdiHomeOutline,
  mdiPlus,
  mdiShieldAccountOutline,
  mdiTrophyOutline,
} from '@mdi/js'
import { useStartWorkout } from '../../composables/useStartWorkout'
import authStore from '../../stores/auth'
import friendsStore from '../../stores/friends'
import Avatar from './Avatar.vue'

const route = useRoute()
const { can } = authStore
// Root only administers: its navigation is the admin page and its profile
const isRoot = computed(() => authStore.isRoot())
const { isStarting, startWorkout } = useStartWorkout()

// Pages without a tab of their own light the tab they are reached from: Records from Profile,
// History from Home, and a friend's page or Add friends from Friends
const phoneSection = computed(() => {
  if (route.path === '/records') return '/profile'
  if (route.path === '/history') return '/dashboard'
  if (route.path.startsWith('/friends')) return '/friends'
  return route.path
})

// The rail's Friends item stays lit on a friend's page and on Add friends too
function isRailActive(to) {
  return route.path === to || (to === '/friends' && route.path.startsWith('/friends/'))
}

// Requests waiting for an answer, checked again as the user moves between pages; an account
// still without a username has none to check
watch(
  () => route.path,
  () =>
    authStore.state.user?.username &&
    !isRoot.value &&
    can('friends.requests') &&
    friendsStore.refreshIncomingCount(),
  { immediate: true },
)
const incomingCount = computed(() => friendsStore.state.incomingCount)

// An entry needing a permission the role lacks is left out; on the tab bar its slot stays empty,
// so the ＋ button keeps the middle
const userTabs = [
  { title: 'Home', icon: mdiHomeOutline, to: '/dashboard' },
  {
    title: 'Templates',
    icon: mdiClipboardListOutline,
    to: '/templates',
    permission: 'templates.view',
  },
  null, // the ＋ button sits in the middle
  { title: 'Friends', icon: mdiAccountMultipleOutline, to: '/friends', permission: 'friends.view' },
  { title: 'Profile', icon: mdiAccountOutline, to: '/profile' },
]

const tabs = computed(() =>
  isRoot.value
    ? [
        { title: 'Admin', icon: mdiShieldAccountOutline, to: '/admin' },
        { title: 'Profile', icon: mdiAccountOutline, to: '/profile' },
      ]
    : userTabs,
)

const railItems = computed(() =>
  [
    { title: 'Home', icon: mdiHomeOutline, to: '/dashboard' },
    {
      title: 'Templates',
      icon: mdiClipboardListOutline,
      to: '/templates',
      permission: 'templates.view',
    },
    { title: 'History', icon: mdiHistory, to: '/history', permission: 'workouts.view' },
    { title: 'Records', icon: mdiTrophyOutline, to: '/records', permission: 'stats.view' },
    {
      title: 'Friends',
      icon: mdiAccountMultipleOutline,
      to: '/friends',
      permission: 'friends.view',
    },
    { title: 'Admin', icon: mdiShieldAccountOutline, to: '/admin', rootOnly: true },
  ].filter((item) =>
    isRoot.value ? item.rootOnly : !item.rootOnly && (!item.permission || can(item.permission)),
  ),
)

const firstName = computed(() => authStore.state.user?.name?.split(' ')[0] ?? '')
</script>

<template>
  <!-- Phone: tab bar along the bottom edge -->
  <nav class="tab-bar" :class="{ 'root-bar': isRoot }" aria-label="Main">
    <!-- The bar's top edge rises around the ＋ button along a circle concentric with it, so the
         button sits inside the bar instead of floating over it -->
    <svg
      v-if="!isRoot"
      class="hump"
      viewBox="0 0 100 26"
      width="100"
      height="26"
      aria-hidden="true"
    >
      <path
        class="hump-fill"
        d="M0 22.5 H7 Q17 22.5 21.2 18 A34 34 0 0 1 78.8 18 Q83 22.5 93 22.5 H100 V26 H0 Z"
      />
      <path
        class="hump-edge"
        d="M0 22.5 H7 Q17 22.5 21.2 18 A34 34 0 0 1 78.8 18 Q83 22.5 93 22.5 H100"
      />
    </svg>
    <template v-for="tab in tabs" :key="tab?.to ?? 'start'">
      <span
        v-if="tab === null ? !can('workouts.create') : tab.permission && !can(tab.permission)"
        class="tab"
        aria-hidden="true"
      ></span>
      <button
        v-else-if="tab === null"
        type="button"
        class="tab start-tab"
        aria-label="Start workout"
        :disabled="isStarting"
        @click="startWorkout"
      >
        <span class="start-circle"><v-icon :icon="mdiPlus" size="28" /></span>
      </button>
      <RouterLink
        v-else
        :to="tab.to"
        class="tab"
        :class="{ active: phoneSection === tab.to }"
        :aria-current="phoneSection === tab.to ? 'page' : undefined"
      >
        <span class="tab-icon">
          <v-icon :icon="tab.icon" size="24" />
          <span
            v-if="tab.to === '/friends' && incomingCount > 0"
            class="dot"
            :aria-label="`${incomingCount} friend requests`"
          ></span>
        </span>
        <span>{{ tab.title }}</span>
      </RouterLink>
    </template>
  </nav>

  <!-- PC: rail along the left edge -->
  <nav class="rail" aria-label="Main">
    <p class="brand">Gym Weight Tracker</p>

    <button
      v-if="!isRoot && can('workouts.create')"
      type="button"
      class="rail-start"
      :disabled="isStarting"
      @click="startWorkout"
    >
      <v-icon :icon="mdiPlus" size="22" />
      Start workout
    </button>

    <RouterLink
      v-for="item in railItems"
      :key="item.to"
      :to="item.to"
      class="rail-item"
      :class="{ active: isRailActive(item.to) }"
      :aria-current="isRailActive(item.to) ? 'page' : undefined"
    >
      <v-icon :icon="item.icon" size="22" />
      {{ item.title }}
      <span
        v-if="item.to === '/friends' && incomingCount > 0"
        class="rail-count"
        :aria-label="`${incomingCount} friend requests`"
        >{{ incomingCount }}</span
      >
    </RouterLink>

    <RouterLink
      to="/profile"
      class="rail-me"
      :class="{ active: route.path === '/profile' }"
      :aria-current="route.path === '/profile' ? 'page' : undefined"
    >
      <Avatar :code="authStore.state.user?.avatar" :size="40" />
      <span class="me-text">
        <span class="me-name">{{ firstName }}</span>
        <span class="me-link">Profile</span>
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  height: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
  padding: 0 max(6px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px)
    max(6px, env(safe-area-inset-left, 0px));
  background: var(--color-surface-low);
  border-top: 1px solid var(--color-divider);
  box-sizing: border-box;
}

/* Root's two tabs: no ＋ button to keep a middle for */
.tab-bar.root-bar {
  grid-template-columns: repeat(2, 1fr);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s var(--ease-out);
}

.tab.active {
  color: var(--color-accent-blush);
}

.tab-icon {
  position: relative;
  display: flex;
}

/* A friend request waits for an answer */
.dot {
  position: absolute;
  top: -1px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-surface-low);
}

.rail-count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  margin-left: auto;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--color-accent-deep);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

/* Centred over the middle slot, its bottom overlapping the bar's top border to hide it there */
.hump {
  position: absolute;
  left: 50%;
  top: -23px;
  margin-left: -50px;
  overflow: visible;
  pointer-events: none;
}

.hump-fill {
  fill: var(--color-surface-low);
}

.hump-edge {
  fill: none;
  stroke: var(--color-divider);
  stroke-width: 1;
}

.start-tab {
  position: relative;
  justify-content: flex-start;
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
}

/* Rises above the bar, centred on the hump's arc with a 6px gap all round: the one thing a
   thumb should find without looking */
.start-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-top: -15px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  transition:
    transform 0.15s var(--ease-out),
    background 0.2s var(--ease-out);
}

.start-tab:hover .start-circle {
  background: var(--color-accent-deep);
}

.start-tab:active .start-circle {
  transform: scale(0.94);
}

.rail {
  display: none;
}

@media (min-width: 900px) {
  .tab-bar {
    display: none;
  }

  .rail {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: var(--rail-width);
    padding: 22px 14px;
    background: var(--color-surface-low);
    border-right: 1px solid var(--color-divider);
    box-sizing: border-box;
  }
}

.brand {
  margin: 0;
  padding: 0 10px 18px;
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.rail-start {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 0;
  border-radius: var(--radius-card);
  background: var(--color-accent);
  box-shadow: 0 6px 18px rgba(232, 21, 138, 0.3);
  font: inherit;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.rail-start:hover {
  background: var(--color-accent-deep);
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: var(--radius-card);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
  transition:
    background 0.2s var(--ease-out),
    color 0.2s var(--ease-out);
}

.rail-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.rail-item.active {
  background: var(--color-surface-raised);
  color: var(--color-accent-blush);
}

.rail-me {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding: 12px 10px 0;
  border-top: 1px solid var(--color-divider);
  color: var(--color-text-primary);
  text-decoration: none;
}

.me-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.me-name {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-link {
  font-size: 12px;
  color: var(--color-text-muted);
  transition: color 0.2s var(--ease-out);
}

.rail-me:hover .me-link,
.rail-me.active .me-link {
  color: var(--color-accent-blush);
}
</style>
