<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import authStore from './stores/auth'
import workoutFocus from './stores/workoutFocus'
import AppNav from './components/ui/AppNav.vue'

const route = useRoute()

// On every logged-in page, except a workout that is running right now
const showNav = computed(
  () =>
    authStore.state.user !== null &&
    !route.meta.guestOnly &&
    !route.meta.public &&
    !workoutFocus.state.isFocused,
)
</script>

<template>
  <div :class="{ 'with-nav': showNav }">
    <router-view />
  </div>
  <AppNav v-if="showNav" />
</template>

<style>
:root {
  --tab-bar-height: 60px;
  --rail-width: 232px;
}

/* Pages pad their bottom with --page-pad-bottom, so raising it keeps content clear of the tab bar */
.with-nav {
  --page-pad-bottom: calc(48px + var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 900px) {
  .with-nav {
    --page-pad-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
    padding-left: var(--rail-width);
  }
}
</style>
