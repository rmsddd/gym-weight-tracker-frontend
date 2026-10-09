<script setup>
defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Delete' },
  // danger for deletions (red); primary for confirmations that destroy nothing
  tone: { type: String, default: 'danger' },
  loading: { type: Boolean, default: false },
})

const open = defineModel({ type: Boolean, default: false })
defineEmits(['confirm'])
</script>

<template>
  <v-dialog v-model="open" max-width="360" :persistent="loading">
    <v-card color="surface-bright" border class="confirm">
      <h2 class="confirm-title">{{ title }}</h2>
      <p v-if="message" class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <v-btn variant="outlined" :disabled="loading" @click="open = false">Cancel</v-btn>
        <v-btn
          :color="tone === 'danger' ? 'danger' : 'accent-deep'"
          variant="flat"
          :loading="loading"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.confirm {
  padding: 20px 22px;
  overscroll-behavior: contain;
}

.confirm-title {
  font-size: 18px;
  margin: 0 0 8px;
}

.confirm-message {
  margin: 0 0 18px;
  color: var(--color-text-muted);
  font-size: 15px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
