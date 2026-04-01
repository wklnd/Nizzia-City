<template>
  <component :is="hideChrome ? 'div' : AppLayout">
    <router-view />
  </component>

  <div v-if="showReloadPopup" class="conn-overlay" role="dialog" aria-modal="true">
    <section class="conn-popup">
      <h3>Connection lost</h3>
      <p class="muted">The app cannot reach the server. Reload to reconnect.</p>
      <div class="conn-actions">
        <button class="btn btn--primary" @click="reloadToRecoverConnection">Reload</button>
      </div>
    </section>
  </div>

  <ToastContainer />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
import ToastContainer from './components/ToastContainer.vue'
import { listenToConnectivityState, reloadToRecoverConnection } from './composables/useConnectivityGuard.mjs'

const route = useRoute()
const hideChrome = computed(() => !!route.meta?.hideChrome)
const showReloadPopup = ref(false)

let stopListening = null

onMounted(() => {
  stopListening = listenToConnectivityState((next) => {
    showReloadPopup.value = next
  })
})

onBeforeUnmount(() => {
  if (typeof stopListening === 'function') stopListening()
})
</script>

<style scoped>
.conn-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 1200;
}

.conn-popup {
  width: min(460px, 100%);
  background: var(--panel);
  border: 1px solid var(--border-heavy);
  border-radius: 4px;
  padding: 16px;
  display: grid;
  gap: 8px;
}

.conn-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}
</style>
