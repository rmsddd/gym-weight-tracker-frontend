<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  multiline: { type: Boolean, default: false },
})

const model = defineModel({ type: String, default: '' })
</script>

<template>
  <v-textarea
    v-if="multiline"
    :id="id"
    v-model="model"
    :label="label"
    variant="underlined"
    auto-grow
    class="field"
  />
  <v-text-field v-else :id="id" v-model="model" :label="label" variant="underlined" class="field" />
</template>

<style scoped>
.field {
  margin-bottom: 8px;
}
</style>
