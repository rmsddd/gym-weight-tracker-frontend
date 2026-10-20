<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  mdiAccountOutline,
  mdiClipboardListOutline,
  mdiHistory,
  mdiHomeOutline,
  mdiPlus,
  mdiTrophyOutline,
} from '@mdi/js'
import { useStartWorkout } from '../../composables/useStartWorkout'
import authStore from '../../stores/auth'
import Avatar from './Avatar.vue'

const route = useRoute()
const { isStarting, startWorkout } = useStartWorkout()

// Records has no tab on the phone: it is reached from Profile, so Profile stays lit there
const phoneSection = computed(() => (route.path === '/records' ? '/profile' : route.path))

const tabs = [
  { title: 'Home', icon: mdiHomeOutline, to: '/dashboard' },
  { title: 'Templates', icon: mdiClipboardListOutline, to: '/templates' },
  null, // the ＋ button sits in the middle
  { title: 'History', icon: mdiHistory, to: '/history' },
  { title: 'Profile', icon: mdiAccountOutline, to: '/profile' },
]

const railItems = [
  { title: 'Home', icon: mdiHomeOutline, to: '/dashboard' },
  { title: 'Templates', icon: mdiClipboardListOutline, to: '/templates' },
  { title: 'History', icon: mdiHistory, to: '/history' },
  { title: 'Records', icon: mdiTrophyOutline, to: '/records' },
]

const firstName = computed(() => authStore.state.user?.name?.split(' ')[0] ?? '')
</script>

<template>
  <!-- Phone: tab bar along the bottom edge -->
  <nav class="tab-bar" aria-label="Main">
    <template v-for="tab in tabs" :key="tab?.to ?? 'start'">
      <button
        v-if="tab === null"
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
        <v-icon :icon="tab.icon" size="24" />
        <span>{{ tab.title }}</span>
      </RouterLink>
    </template>
  </nav>

  <!-- PC: rail along the left edge -->
  <nav class="rail" aria-label="Main">
    <p class="brand">Gym Weight Tracker</p>

    <button type="button" class="rail-start" :disabled="isStarting" @click="startWorkout">
      <v-icon :icon="mdiPlus" size="22" />
      Start workout
    </button>

    <RouterLink
      v-for="item in railItems"
      :key="item.to"
      :to="item.to"
      class="rail-item"
      :class="{ active: route.path === item.to }"
      :aria-current="route.path === item.to ? 'page' : undefined"
    >
      <v-icon :icon="item.icon" size="22" />
      {{ item.title }}
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

.start-tab {
  border: 0;
  background: none;
  padding: 0;
  cursor: pointer;
}

/* Raised half out of the bar: the one thing a thumb should find without looking */
.start-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-top: -28px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #fff;
  box-shadow: 0 8px 20px rgba(232, 21, 138, 0.35);
  transition: transform 0.15s var(--ease-out);
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
