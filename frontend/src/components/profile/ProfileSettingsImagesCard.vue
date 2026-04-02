<template>
  <div class="panel">
    <h3>Profile Image Settings</h3>
    <p class="muted">Add image links (http/https). You can keep up to 10 links. If empty, default profile image is used.</p>

    <div class="settings-row u-mt-8">
      <input
        v-model.trim="draftUrl"
        type="url"
        placeholder="https://example.com/profile-image.jpg"
        :disabled="!canEdit || saving"
      />
      <button class="btn" :disabled="!canEdit || saving || !draftUrl" @click="addUrl">Add Link</button>
    </div>

    <div class="settings-grid u-mt-8" v-if="localImages.length">
      <div class="settings-card" v-for="(img, idx) in localImages" :key="`${img}-${idx}`">
        <img :src="img" :alt="`Profile image ${idx + 1}`" loading="lazy" decoding="async" @error="onImgErr($event)" />
        <a :href="img" target="_blank" rel="noopener noreferrer" class="muted settings-link">Open</a>
        <button class="btn btn--danger btn--small" :disabled="!canEdit || saving" @click="removeAt(idx)">Remove</button>
      </div>
    </div>

    <div class="panel u-mt-8" v-else>
      <p class="muted">No custom profile images set. Default image is active.</p>
      <img class="settings-default" :src="defaultImage" alt="Default profile image" loading="lazy" decoding="async" />
    </div>

    <div class="settings-actions u-mt-8">
      <span class="muted">{{ localImages.length }}/10 links</span>
      <button class="btn btn--primary" :disabled="!canEdit || saving" @click="save">Save</button>
    </div>

    <p v-if="errorText" class="text-danger u-mt-8">{{ errorText }}</p>
    <p v-if="okText" class="text-ok u-mt-8">{{ okText }}</p>
    <p v-if="!canEdit" class="muted u-mt-8">You can only edit settings on your own profile.</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  defaultImage: { type: String, required: true },
  errorText: { type: String, default: '' },
  okText: { type: String, default: '' },
})

const emit = defineEmits(['save'])

const localImages = ref([])
const draftUrl = ref('')

watch(
  () => props.images,
  (next) => {
    localImages.value = Array.isArray(next) ? [...next] : []
  },
  { immediate: true }
)

function isValidUrl(v) {
  try {
    const u = new URL(String(v))
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch (_) {
    return false
  }
}

function addUrl() {
  const v = String(draftUrl.value || '').trim()
  if (!isValidUrl(v)) return
  if (localImages.value.includes(v)) return
  if (localImages.value.length >= 10) return
  localImages.value.push(v)
  draftUrl.value = ''
}

function removeAt(idx) {
  localImages.value.splice(idx, 1)
}

function save() {
  emit('save', [...localImages.value])
}

function onImgErr(e) {
  e.target.src = props.defaultImage
}
</script>

<style scoped>
.settings-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.settings-card {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px;
  background: var(--bg-alt);
  display: grid;
  gap: 6px;
}
.settings-card img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border);
}
.settings-link { font-size: 11px; }
.settings-actions { display: flex; align-items: center; justify-content: space-between; }
.settings-default {
  margin-top: 8px;
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}
</style>
