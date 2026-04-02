<template>
  <section class="job-page">
    <h2>Employment</h2>

    <!-- Tab bar -->
    <div class="tabs">
      <button v-for="t in tabs" :key="t.key"
              :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <!-- Inline messages -->


    <div v-if="loading" class="muted">Loading…</div>

    <!-- Status tab -->
    <div v-else-if="tab === 'status'">
      <!-- Work stats bar -->
      <div class="card">
        <h3>Work Stats</h3>
        <div class="stat-grid">
          <div class="stat-item"><span class="lbl">Manual Labor</span><span class="val">{{ fmt(status.workStats?.manuallabor) }}</span></div>
          <div class="stat-item"><span class="lbl">Intelligence</span><span class="val">{{ fmt(status.workStats?.intelligence) }}</span></div>
          <div class="stat-item"><span class="lbl">Endurance</span><span class="val">{{ fmt(status.workStats?.endurance) }}</span></div>
          <div class="stat-item"><span class="lbl">Job Points</span><span class="val accent">{{ fmt(status.jobPoints) }}</span></div>
        </div>
      </div>

      <!-- Not employed -->
      <div v-if="!status.employed" class="card">
        <p class="muted">You are currently unemployed.</p>
        <p v-if="status.canApplyAt && !status.canApply" class="text-warn">
          Quit penalty active — you can apply at {{ fmtDate(status.canApplyAt) }}
        </p>
        <p v-else class="text-ok">You're free to apply for a job.</p>
      </div>

      <!-- City job employed -->
      <div v-else-if="status.type === 'city'" class="card">
        <div class="job-header">
          <span class="icon">{{ status.jobIcon }}</span>
          <div>
            <h3>{{ status.jobName }}</h3>
            <span class="muted">Rank {{ status.rank }}: {{ status.rankName }}</span>
          </div>
        </div>
        <div class="stat-grid u-mt-8">
          <div class="stat-item"><span class="lbl">Pay</span><span class="val">${{ fmt(status.pay) }}</span></div>
          <div class="stat-item"><span class="lbl">Job Points</span><span class="val">{{ fmt(status.jobPoints) }}</span></div>
        </div>

        <!-- Work button -->
        <div class="actions u-mt-8">
          <button :disabled="busy || !status.canWork" @click="doWork">
            {{ status.canWork ? '💼 Work' : `⏳ ${cooldownStr}` }}
          </button>
          <button v-if="status.nextRank" :disabled="busy" @click="doPromote" class="btn btn-secondary">⬆ Promote</button>
          <button :disabled="busy" @click="doQuit" class="btn btn-danger">Quit Job</button>
        </div>

        <!-- Promotion preview -->
        <div v-if="status.nextRank" class="promo-box u-mt-8">
          <h4>Next Rank: {{ status.nextRank.name }}</h4>
          <span>Pay: ${{ fmt(status.nextRank.pay) }}</span>
          <span>JP needed: {{ fmt(status.nextRank.jpRequired) }}</span>
          <span>Stats: ML {{ fmt(status.nextRank.requiredStats?.manuallabor) }} / INT {{ fmt(status.nextRank.requiredStats?.intelligence) }} / END {{ fmt(status.nextRank.requiredStats?.endurance) }}</span>
        </div>

        <!-- Abilities -->
        <div v-if="status.abilities?.length" class="card u-mt-8">
          <h4>Abilities</h4>
          <div class="ability-list">
            <div v-for="a in status.abilities" :key="a.index"
                 :class="['ability', { locked: !a.unlocked }]">
              <div>
                <strong>{{ a.name }}</strong>
                <span class="muted"> — {{ a.description }}</span>
              </div>
              <div class="ability-meta">
                <span class="muted">Cost: {{ a.cost }} JP</span>
                <span v-if="!a.unlocked" class="text-warn">Unlock at rank {{ a.unlockRank }}</span>
                <button v-else :disabled="busy || a.cost > status.jobPoints"
                        @click="doAbility(a.index)">Use</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Company job employed -->
      <div v-else-if="status.type === 'company'" class="card">
        <div class="job-header">
          <span class="icon">{{ status.companyIcon }}</span>
          <div>
            <h3>{{ status.companyName }}</h3>
            <span class="muted">{{ status.companyType }} — Rating {{ status.rating }}/10</span>
          </div>
        </div>
        <div class="stat-grid u-mt-8">
          <div class="stat-item"><span class="lbl">Estimated Pay</span><span class="val">${{ fmt(status.pay) }}</span></div>
        </div>
        <div class="actions u-mt-8">
          <button :disabled="busy || !status.canWork" @click="doWork">
            {{ status.canWork ? '💼 Work' : `⏳ ${cooldownStr}` }}
          </button>
          <button :disabled="busy" @click="doQuit" class="btn btn-danger">Quit Job</button>
        </div>
      </div>

    </div>

    <!-- City jobs tab -->
    <div v-else-if="tab === 'city'">
      <div v-if="!cityJobs.length" class="muted">No city jobs available.</div>
      <div v-for="j in cityJobs" :key="j.id" class="card job-listing">
        <div class="job-header">
          <span class="icon">{{ j.icon }}</span>
          <div>
            <h3>{{ j.name }}</h3>
            <p class="muted">{{ j.description }}</p>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-item"><span class="lbl">Starting Pay</span><span class="val">${{ fmt(j.startingPay) }}</span></div>
          <div class="stat-item"><span class="lbl">Req ML</span><span class="val">{{ fmt(j.requiredStats?.manuallabor) }}</span></div>
          <div class="stat-item"><span class="lbl">Req INT</span><span class="val">{{ fmt(j.requiredStats?.intelligence) }}</span></div>
          <div class="stat-item"><span class="lbl">Req END</span><span class="val">{{ fmt(j.requiredStats?.endurance) }}</span></div>
        </div>
        <div class="actions">
          <button :disabled="busy || status.employed" @click="doHire(j.id)">Apply</button>
          <button class="btn btn-secondary" @click="viewJob = viewJob === j.id ? null : j.id">
            {{ viewJob === j.id ? 'Hide Ranks' : 'View Ranks' }}
          </button>
        </div>
        <!-- Expanded rank table -->
        <div v-if="viewJob === j.id && jobDetail" class="rank-table u-mt-8">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Rank</th><th>Pay</th><th>JP/work</th><th>ML req</th><th>INT req</th><th>END req</th><th>Promo JP</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rk in jobDetail.ranks" :key="rk.index">
                <td>{{ rk.index }}</td>
                <td>{{ rk.name }}</td>
                <td>${{ fmt(rk.pay) }}</td>
                <td>{{ rk.jobPoints }}</td>
                <td>{{ fmt(rk.requiredStats?.manuallabor) }}</td>
                <td>{{ fmt(rk.requiredStats?.intelligence) }}</td>
                <td>{{ fmt(rk.requiredStats?.endurance) }}</td>
                <td>{{ rk.pointsForPromotion ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Companies tab -->
    <div v-else-if="tab === 'companies'">
      <div v-if="!companies.length" class="muted">No companies available.</div>
      <div v-for="c in companies" :key="c._id" class="card job-listing">
        <div class="job-header">
          <span class="icon">{{ c.icon }}</span>
          <div>
            <h3>{{ c.name }}</h3>
            <span class="muted">{{ c.typeName }} — Rating {{ c.rating }}/10</span>
          </div>
        </div>
        <div class="stat-grid">
          <div class="stat-item"><span class="lbl">Base Pay</span><span class="val">${{ fmt(c.basePay) }}</span></div>
          <div class="stat-item"><span class="lbl">Employees</span><span class="val">{{ c.employees }}/{{ c.maxEmployees }}</span></div>
        </div>
        <p v-if="c.description" class="muted">{{ c.description }}</p>
        <div class="actions">
          <button :disabled="busy || status.employed || c.employees >= c.maxEmployees"
                  @click="doJoinCompany(c._id)">Join</button>
        </div>
      </div>
    </div>


  </section>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmt } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()

const tabs = [
  { key: 'status',    label: '📋 Status' },
  { key: 'city',      label: '🏙️ City Jobs' },
  { key: 'companies', label: '🏢 Companies' },
]
const tab = ref('status')

const loading = ref(true)
const busy    = ref(false)

// Data
const status    = ref({})
const cityJobs  = ref([])
const companies = ref([])
const viewJob   = ref(null)
const jobDetail = ref(null)

const fmtDate = d => d ? new Date(d).toLocaleString() : ''
const isPast  = d => d ? new Date(d).getTime() <= Date.now() : true

// Cooldown ticker
const cooldownStr = ref('')
let cooldownTimer = null
function tickCooldown() {
  if (!status.value.canWorkAt) { cooldownStr.value = ''; return }
  const diff = new Date(status.value.canWorkAt).getTime() - Date.now()
  if (diff <= 0) { status.value.canWork = true; cooldownStr.value = ''; return }
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  cooldownStr.value = `${m}m ${s}s`
}

async function loadData() {
  loading.value = true
  try {
    // Public listings load independently so they always show
    const [cj, co] = await Promise.all([
      api.get('/job/city-jobs'), api.get('/job/companies'),
    ])
    cityJobs.value = cj.data; companies.value = co.data
  } catch (e) {
    cityJobs.value = []
    companies.value = []
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load jobs')
  }
  try {
    const { data } = await api.get('/job/status')
    status.value = data
  } catch (e) {
    if (e?.response?.status !== 401) {
      console.error('Failed to load job status', e)
    }
  }
  loading.value = false
}

async function loadJobDetail(jobId) {
  try { const { data } = await api.get(`/job/city-jobs/${jobId}`); jobDetail.value = data }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
}
watch(viewJob, id => { if (id) loadJobDetail(id); else jobDetail.value = null })

async function doHire(jobId) {
  busy.value = true
  try { const { data } = await api.post('/job/hire', { jobId }); toast.ok(`Hired as ${data.jobName} — ${data.rank}`); await loadData() }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}
async function doQuit() {
  busy.value = true
  try { const { data } = await api.post('/job/quit'); toast.ok(data.message || 'You quit.'); await loadData() }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}
async function doWork() {
  busy.value = true
  try {
    const { data } = await api.post('/job/work')
    const gains = Object.entries(data.statGains || {}).filter(([,v]) => v).map(([k,v]) => `${k} +${v}`).join(', ')
    toast.ok(`Earned $${fmt(data.pay)}${data.jpGained ? `, ${data.jpGained} JP` : ''}. ${gains}`)
    await loadData()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}
async function doPromote() {
  busy.value = true
  try { const { data } = await api.post('/job/promote'); toast.ok(`Promoted! ${data.oldRank} → ${data.newRank}. Pay: $${fmt(data.newPay)}`); await loadData() }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}
async function doAbility(index) {
  busy.value = true
  try {
    const { data } = await api.post('/job/ability', { abilityIndex: index })
    const fx = Object.entries(data.effect || {}).map(([k,v]) => `${k}: ${v}`).join(', ')
    toast.ok(`${data.ability} used (${data.cost} JP). ${fx}`)
    await loadData()
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}
async function doJoinCompany(companyId) {
  busy.value = true
  try { const { data } = await api.post('/job/join-company', { companyId }); toast.ok(`Joined ${data.companyName}. Pay: $${fmt(data.pay)}`); await loadData() }
  catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed') }
  busy.value = false
}

onMounted(async () => {
  await ensurePlayer()
  await loadData()
  cooldownTimer = setInterval(tickCooldown, 1000)
})

onUnmounted(() => { if (cooldownTimer) clearInterval(cooldownTimer) })
</script>

<style scoped>
.job-page { max-width: 840px; }

/* Job header */
.job-header { display: flex; align-items: center; gap: 10px; }
.icon { font-size: 1.5rem; }

/* Promo box */
.promo-box { background: rgba(255,255,255,.03); border: 1px dashed var(--border); padding: 10px; display: flex; flex-wrap: wrap; gap: 12px; font-size: .85rem; }
.promo-box h4 { width: 100%; margin: 0; }

/* Rank table */
.rank-table { overflow-x: auto; }
.rank-table table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.rank-table th, .rank-table td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; }
.rank-table th { color: var(--muted); font-weight: 500; }

/* Abilities */
.ability-list { display: flex; flex-direction: column; gap: 8px; }
.ability { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.ability.locked { opacity: .5; }
.ability-meta { display: flex; align-items: center; gap: 8px; font-size: .8rem; }

/* Job listings */
.job-listing { margin-bottom: 10px; }
</style>