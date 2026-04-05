<template>
  <section class="crime-pickpocket">
    <h2>Pickpocket</h2>

    <div class="card">
      <div class="row">
        <div class="stat">Money: ${{ fmt(store.player?.money) }}</div>
        <div class="stat">Nerve: {{ store.player?.nerveStats?.nerve ?? 0 }}</div>
      </div>
      <div class="muted">Choose a hotspot, scan likely targets, and attempt a clean lift.</div>

      <div class="locations">
        <button
          v-for="l in locations"
          :key="l.id"
          class="loc"
          :class="{ active: l.id===selLoc }"
          @click="selectLocation(l.id)">
          <div class="loc__name">{{ l.name }}</div>
          <div class="pop">
            <div class="pop__bar" :style="{ width: (Math.round((l.popularity||0)*100)) + '%' }"></div>
          </div>
        </button>
      </div>

      <div v-if="targets.length" class="targets muted">
        Targets in area: {{ targets.map(t => t.name + (t.isPolice ? ' (cop)' : '')).join(', ') }}
      </div>

      <button
        :disabled="busy || !store.player?.user || (store.player?.nerveStats?.nerve ?? 0) < 3 || !selLoc"
        @click="act()">
        Pickpocket
      </button>

      <div v-if="last" class="result">
        <div v-if="last.error" class="error">{{ last.error }}</div>
        <template v-else>
          <div>Outcome: <strong>{{ last.outcome }}</strong></div>
          <div v-if="last.target">Target: {{ last.target.name }} <span v-if="last.target.isPolice" class="error">(Police)</span></div>
          <div v-if="last.narration" class="muted">{{ last.narration }}</div>
          <div v-if="last.awarded?.money">Stolen ${{ fmt(last.awarded.money) }}</div>
          <div v-if="last.jail?.triggered" class="error">Arrested. Jail time: {{ last.jail.seconds }}s</div>
          <div v-if="last.outcome!=='success' && !last.awarded?.money">No payout.</div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api/client'
import { usePlayer } from '../../composables/usePlayer'
import { useToast } from '../../composables/useToast'
import { fmtInt as fmt } from '../../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()
const busy = ref(false)
const last = ref(null)
const locations = ref([])
const targets = ref([])
const selLoc = ref('')

async function loadLocations(){
  try {
    const { data } = await api.get('/crime/locations', { params: { crimeId: 'pickpocket' } })
    locations.value = data?.locations || []
    if (locations.value.length && !selLoc.value) {
      await selectLocation(locations.value[0].id)
    }
  } catch {
    locations.value = []
  }
}

async function loadTargets(locationId){
  if (!locationId) {
    targets.value = []
    return
  }
  try {
    const { data } = await api.get('/crime/pickpocket/targets', { params: { locationId } })
    targets.value = data?.targets || []
  } catch {
    targets.value = []
  }
}

async function selectLocation(locationId){
  selLoc.value = locationId
  await loadTargets(locationId)
}

async function act(){
  if (!store.player?.user) return
  busy.value = true
  try {
    const { data } = await api.post('/crime/pickpocket', { locationId: selLoc.value })
    last.value = data
    store.mergePartial({ money: data.money, jailed: data.jailed, jailTime: data.jailTime })
    if (store.player.nerveStats) store.player.nerveStats.nerve = data.nerve
    if (data.jailed) {
      toast.error('You were sent to jail.')
    }
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed')
  } finally { busy.value = false }
}

onMounted(async () => { await ensurePlayer(); await loadLocations() })
</script>

<style scoped>
.crime-pickpocket { max-width: 800px; margin: 16px auto; padding: 0 16px; }
.row { display: flex; gap: 12px; margin: 6px 0; color: var(--muted); }
.stat { font-size: 11px; }
.locations { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin: 10px 0; }
.loc { background: var(--bg-alt); color: var(--text); border: 1px solid var(--border); border-radius: 2px; padding: 8px; text-align: left; cursor: pointer; transition: border-color 80ms; font-size: 12px; }
.loc:hover { border-color: var(--accent); }
.loc.active { border-color: var(--accent); background: var(--accent-muted); }
.loc__name { font-weight: 600; margin-bottom: 4px; }
.pop { background: var(--bar-track); border: 1px solid var(--border); border-radius: 2px; height: 6px; overflow: hidden; }
.pop__bar { background: var(--accent); height: 100%; width: 0%; transition: width 0.2s ease; }
.targets { margin: 8px 0; font-size: 12px; }
.result { margin-top: 8px; font-size: 13px; }
</style>
