<template>
  <section>
    <h2>Gym</h2>
    <div class="panel u-mt-8">
      <div class="gym__grid">
        <div class="train-panel">
          <h3>Train</h3>
          <div class="muted" v-if="loading">Loading…</div>
          <div v-else>
            <div class="vitals-grid">
              <div class="vital-card">
                <div class="muted">Energy</div>
                <div class="vital-value"><strong>{{ energy }}</strong> / {{ energyMax }}</div>
              </div>
              <div class="vital-card">
                <div class="muted">Happiness</div>
                <div class="vital-value"><strong>{{ happy }}</strong> / {{ happyMax }}</div>
              </div>
            </div>

            <div class="gym__controls">
              <label class="block">
                <span class="lbl">Stat</span>
                <div class="stat-pills">
                  <label class="stat-pill" :class="{ active: stat === 'strength', disabled: !supports('strength') }">
                    <input type="radio" value="strength" v-model="stat" :disabled="!supports('strength')" />
                    <span>Strength</span>
                  </label>
                  <label class="stat-pill" :class="{ active: stat === 'speed', disabled: !supports('speed') }">
                    <input type="radio" value="speed" v-model="stat" :disabled="!supports('speed')" />
                    <span>Speed</span>
                  </label>
                  <label class="stat-pill" :class="{ active: stat === 'dexterity', disabled: !supports('dexterity') }">
                    <input type="radio" value="dexterity" v-model="stat" :disabled="!supports('dexterity')" />
                    <span>Dexterity</span>
                  </label>
                  <label class="stat-pill" :class="{ active: stat === 'defense', disabled: !supports('defense') }">
                    <input type="radio" value="defense" v-model="stat" :disabled="!supports('defense')" />
                    <span>Defense</span>
                  </label>
                </div>
              </label>

              <label class="block">
                <span class="lbl">Energy per train</span>
                <div class="energy-row">
                  <input class="energy-input" type="number" v-model.number="energyPerTrain" :max="energy" min="1" />
                  <button type="button" class="btn btn--small" @click="useAllEnergy">Use all</button>
                </div>
              </label>

              <div class="u-flex u-gap-16 u-wrap gym__meta">
                <div>
                  <div class="lbl">Gym</div>
                  <div class="gym__badge">{{ selectedGym?.name }}</div>
                </div>
                <div>
                  <div class="lbl">Energy (info)</div>
                  <div class="gym__badge">E/train: {{ selectedGym?.energyPerTrain ?? '-' }}</div>
                </div>
              </div>

              <div class="gym__gain">
                <button class="btn" @click="calcGain" :disabled="busy">Calculate</button>
                <span class="muted" v-if="gain==null">Expected gain: —</span>
                <span v-else>Expected gain: <strong>{{ fmtInt(gain) }}</strong></span>
              </div>

              <div class="gym__actions">
                <button class="btn" @click="train" :disabled="busy || !canTrainStat || energyPerTrain<1 || energyPerTrain>energy">{{ busy? 'Training…' : 'Train' }}</button>
                <span class="msg" :class="{ err: false, ok: false }"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-panel">
          <h3>Battle stats</h3>
          <div class="battle-grid">
            <div class="battle-card">
              <div class="muted">Strength</div>
              <div class="battle-value">{{ fmtStat(stats.strength) }}</div>
            </div>
            <div class="battle-card">
              <div class="muted">Speed</div>
              <div class="battle-value">{{ fmtStat(stats.speed) }}</div>
            </div>
            <div class="battle-card">
              <div class="muted">Dexterity</div>
              <div class="battle-value">{{ fmtStat(stats.dexterity) }}</div>
            </div>
            <div class="battle-card">
              <div class="muted">Defense</div>
              <div class="battle-value">{{ fmtStat(stats.defense) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel u-mt-12">
      <div class="gym-list-head">
        <h3>Gyms</h3>
        <span class="muted">Choose a gym to train. Unlock the next one as you progress.</span>
      </div>
      <div class="gyms__grid">
        <div
          v-for="g in gyms"
          :key="g.id"
          class="gym-card"
          :class="{ selected: g.id === selectedGymId, locked: g.locked }"
          @click="g.locked ? null : selectGym(g.id)"
          :aria-disabled="g.locked ? 'true' : 'false'"
        >
          <div class="gym-card__top">
            <div class="gym-card__name">{{ g.name }}</div>
            <span class="gym-card__state" :class="{ 'is-locked': g.locked, 'is-open': !g.locked }">
              {{ g.locked ? 'Locked' : 'Unlocked' }}
            </span>
          </div>

          <div class="gym-card__body">
            <div class="gym-card__line">
              <span class="muted">Energy / train</span>
              <strong>{{ g.energyPerTrain }}</strong>
            </div>

            <div v-if="g.locked && g.isNext" class="gym-card__unlock">
              <div class="gym-card__line">
                <span class="muted">Progress</span>
                <strong>{{ fmtInt(g.energySpent) }} / {{ fmtInt(g.requiredEnergy || 0) }}</strong>
              </div>
              <div class="gym-card__line">
                <span class="muted">Cost</span>
                <strong>${{ fmtInt(g.unlockCost) }}</strong>
              </div>
            </div>
          </div>

          <div class="gym-card__foot">
            <button
              v-if="g.locked && g.isNext"
              class="btn btn--small"
              :disabled="!g.unlockable"
              @click.stop="unlock(g.id)"
            >
              Unlock
            </button>
            <span v-else-if="g.locked" class="muted">Unlock previous gyms first</span>
            <span v-else-if="g.id === selectedGymId" class="gym-card__selected">Selected</span>
            <span v-else class="muted">Click to select</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtInt, fmtStat } from '../utils/format'

const loading = ref(true)
const busy = ref(false)
const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()

const stat = ref('strength')
const gyms = ref([])
const selectedGymId = ref(1)
const selectedGym = computed(() => gyms.value.find(g => g.id === selectedGymId.value))
const energyPerTrain = ref(5)
const canTrainStat = computed(() => {
  const g = selectedGym.value
  if (!g) return false
  const v = g.gains?.[stat.value]
  return typeof v === 'number' && v > 0
})
function supports(type) {
  const g = selectedGym.value
  if (!g) return false
  const v = g.gains?.[type]
  return typeof v === 'number' && v > 0
}
async function selectGym(id) {
  const g = gyms.value.find(x => x.id === id)
  if (!g || g.locked) return
  await api.post('/gym/select', { gymId: id })
  selectedGymId.value = id
}
async function unlock(id) {
  try {
    const { data } = await api.post('/gym/unlock', { gymId: id })
    store.mergePartial({ money: data.money })
    await loadCatalog()
    toast.ok('Gym unlocked.')
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to unlock')
  }
}
const gain = ref(null)

const stats = computed(() => store.player?.battleStats || { strength: 0, speed: 0, dexterity: 0, defense: 0 })
const energy = computed(() => store.player?.energyStats?.energy ?? 0)
const energyMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const happy = computed(() => store.player?.happiness?.happy ?? 0)
const happyMax = computed(() => store.player?.happiness?.happyMax ?? 0)

async function loadCatalog() {
  const res = await api.get('/gym/catalog')
  const data = res.data || res
  gyms.value = data.gyms || []
  selectedGymId.value = data.selectedGymId || 1
}

async function load() {
  loading.value = true
  try {
    if (!store.player) throw new Error('Not logged in')
    await reloadPlayer()
    await loadCatalog()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load player')
  } finally { loading.value = false }
}

async function calcGain() {
  gain.value = null
  try {
    const body = { statType: stat.value, energyPerTrain: Math.max(1, Math.floor(Number(energyPerTrain.value || 1))) }
    const res = await api.post('/gym/calculate', body)
    gain.value = Number((res.data || res).gain || 0)
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to calculate')
  }
}

async function train() {
  busy.value = true
  try {
    const body = { statType: stat.value, energyPerTrain: Math.max(1, Math.floor(Number(energyPerTrain.value || 1))) }
    const { data } = await api.post('/gym/train', body)
    toast.ok('Training complete.')
    store.mergePartial({
      battleStats: data.updatedStats,
      energyStats: { ...(store.player?.energyStats || {}), energy: data.remainingEnergy },
      happiness: { ...(store.player?.happiness || {}), happy: data.remainingHappiness },
    })
    await calcGain()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Training failed')
  } finally { busy.value = false }
}

function useAllEnergy() { energyPerTrain.value = Math.max(1, Number(energy.value || 0)) }

onMounted(async () => { await ensurePlayer(); await load(); await calcGain() })
</script>

<style scoped>
.gym__grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
.gym__controls { display: flex; flex-direction: column; gap: 10px; }
.block { display: block; }
.lbl { display: block; font-size: 11px; color: var(--muted); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.03em; }
input[type="number"], select { padding: 6px 8px; border-radius: 2px; }
.gym__meta .gym__badge { display: inline-block; padding: 4px 8px; border-radius: 2px; border: 1px solid var(--border); background: var(--bg-alt); font-size: 12px; }
.gym__gain { display: flex; align-items: center; gap: 10px; }
.gym__actions { display: flex; align-items: center; gap: 10px; }

.train-panel, .stats-panel { min-width: 0; }
.vitals-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.vital-card {
  border: 1px solid var(--border);
  background: var(--bg-alt);
  border-radius: 4px;
  padding: 8px;
}
.vital-value { font-size: 14px; margin-top: 2px; }

.stat-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stat-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  background: var(--panel);
  color: var(--text);
}
.stat-pill input { display: none; }
.stat-pill.active {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-muted);
  font-weight: 600;
}
.stat-pill.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.energy-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.energy-input { width: 120px; }

.battle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.battle-card {
  border: 1px solid var(--border);
  background: var(--bg-alt);
  border-radius: 4px;
  padding: 8px;
}
.battle-value {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-strong);
}

.gym-list-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px; }

.gyms__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.gym-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 8px;
  cursor: pointer;
  transition: border-color 80ms, background 80ms;
  min-height: 136px;
}
.gym-card:hover { border-color: var(--accent); background: var(--panel-hover); }
.gym-card.selected { border-color: var(--accent); background: var(--accent-muted); }
.gym-card.locked { opacity: 0.8; }
.gym-card.locked { cursor: default; }
.gym-card.locked:hover { border-color: var(--border); background: var(--panel); }

.gym-card__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.gym-card__name { font-weight: 700; }
.gym-card__state {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}
.gym-card__state.is-open {
  border-color: var(--ok);
  color: var(--ok);
  background: var(--ok-muted);
}
.gym-card__state.is-locked {
  border-color: var(--warn);
  color: var(--warn);
  background: var(--warn-muted);
}

.gym-card__body { display: grid; gap: 6px; }
.gym-card__unlock {
  border-top: 1px dashed var(--border);
  padding-top: 6px;
  display: grid;
  gap: 4px;
}
.gym-card__line { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 12px; }

.gym-card__foot {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
}
.gym-card__selected {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 1200px) {
  .gym__grid { grid-template-columns: 1fr; }
}

@media (max-width: 700px) {
  .vitals-grid,
  .battle-grid {
    grid-template-columns: 1fr;
  }
}
</style>
