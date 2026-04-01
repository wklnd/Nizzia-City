<template>
  <main class="offline-wrap">
    <section class="offline-card">
      <h1>Server offline</h1>
      <p class="muted">The frontend cannot reach the server right now.</p>
      <p class="muted">Check your connection, then try reloading the app.</p>
      <div class="actions">
        <button class="btn btn--primary" @click="retry">Try again</button>
      </div>
    </section>
  </main>
</template>

<script setup>
import { reloadToRecoverConnection } from '../composables/useConnectivityGuard.mjs'

function retry() {
  reloadToRecoverConnection()
}
</script>

<style scoped>
.offline-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
}

.offline-card {
  width: min(520px, 100%);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 18px;
  display: grid;
  gap: 10px;
}

.actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
