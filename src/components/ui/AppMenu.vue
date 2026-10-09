<script setup>
import { useRouter } from 'vue-router'
import {
  mdiAccountOutline,
  mdiClipboardListOutline,
  mdiDumbbell,
  mdiHistory,
  mdiLogout,
  mdiMenu,
  mdiTrophyOutline,
} from '@mdi/js'
import authStore from '../../stores/auth'

const router = useRouter()

const items = [
  { title: 'Workouts', icon: mdiDumbbell, to: '/dashboard' },
  { title: 'History', icon: mdiHistory, to: '/history' },
  { title: 'Templates', icon: mdiClipboardListOutline, to: '/templates' },
  { title: 'Personal records', icon: mdiTrophyOutline, to: '/records' },
  { title: 'Profile', icon: mdiAccountOutline, to: '/profile' },
]

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <v-menu location="bottom end">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :icon="mdiMenu"
        variant="outlined"
        size="small"
        rounded="md"
        color="secondary"
        aria-label="Menu"
      />
    </template>

    <v-list color="primary" bg-color="surface-bright" class="app-menu" density="comfortable">
      <v-list-item
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
      />
      <v-divider class="my-1" />
      <v-list-item :prepend-icon="mdiLogout" title="Log out" @click="handleLogout" />
    </v-list>
  </v-menu>
</template>

<style scoped>
.app-menu {
  min-width: 200px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-menu);
}
</style>
