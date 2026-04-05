<template>
  <section class="jail">
    <h2>County Jail</h2>

    <div class="card">
      <p v-if="busy" class="muted">Checking your sentence...</p>

      <template v-else>
        <div v-if="!status.jailed" class="ok">You are free to leave jail.</div>
        <template v-else>
          <div class="sentence">Remaining sentence: <strong>{{ status.jailTime }}</strong> seconds</div>
          <p class="muted">You cannot access other facilities until your sentence is served.</p>
          <button :disabled="tickBusy" @click="serveTime">Serve 60 seconds</button>
        </template>
      </template>
    </div>
  </section>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { store, ensurePlayer } = usePlayer()
const toast = useToast()
const busy = ref(false)
const tickBusy = ref(false)
const status = reactive({ jailed: false, jailTime: 0 })

async function loadStatus(){
  busy.value = true
  try {
    const { data } = await api.get('/jail/status')
    status.jailed = !!data?.jailed
    status.jailTime = Number(data?.jailTime || 0)
    store.mergePartial({ jailed: status.jailed, jailTime: status.jailTime })
    if (!status.jailed) {
      toast.success('Sentence completed.')
      await router.push({ name: 'home' })
    }
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load jail status')
  } finally {
    busy.value = false
  }
}

async function serveTime(){
  tickBusy.value = true
  try {
    const { data } = await api.post('/jail/serve-time')
    status.jailed = !!data?.jailed
    status.jailTime = Number(data?.jailTime || 0)
    store.mergePartial({ jailed: status.jailed, jailTime: status.jailTime })
    if (!status.jailed) {
      toast.success('You are released from jail.')
      await router.push({ name: 'home' })
    }
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to serve time')
  } finally {
    tickBusy.value = false
  }
}

onMounted(async () => {
  await ensurePlayer()
  await loadStatus()
})
</script>

<style scoped>
.jail { max-width: 720px; margin: 16px auto; padding: 0 16px; }
.sentence { margin-bottom: 8px; }
.ok { color: #22c55e; }
</style>
