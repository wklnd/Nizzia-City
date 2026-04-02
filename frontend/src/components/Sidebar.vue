<template>
  <aside class="sidebar" :class="{ 'is-open': mobileOpen }">
    <div class="status-effects" v-if="effects.length">
      <span
        v-for="(e, i) in effects"
        :key="i"
        class="effect-icon"
        :data-tip="e.title"
        :title="e.title"
        role="img"
        :aria-label="e.title"
      >{{ e.symbol }}</span>
    </div>
    <div class="info">
      <p id="ui-name">Name: {{ store.player?.name || '—' }}</p>
      <p id="ui-money">Money: {{ money }}</p>
      <p id="ui-level">Level: {{ store.player?.level || 1 }}</p>
      <p id="ui-points">Points: {{ store.player?.points || 0 }}</p>
    </div>

    <div class="info">
      <p id="ui-energy-label" :title="energyTooltip">Energy: {{ eNow }}/{{ eMax }}</p>
      <div class="progress-bar"><div class="progress-fill energy" :style="{ width: pct(eNow, eMax) + '%' }"></div></div>

      <p id="ui-nerve-label" :title="nerveTooltip">Nerve: {{ nNow }}/{{ nMax }}</p>
      <div class="progress-bar"><div class="progress-fill nerve" :style="{ width: pct(nNow, nMax) + '%' }"></div></div>

      <p id="ui-happy-label" :title="happyTooltip">Happy: {{ hNow }}/{{ hMax }}</p>
      <div class="progress-bar"><div class="progress-fill happy" :style="{ width: pct(hNow, hMax) + '%' }"></div></div>

  <p id="ui-hp-label">HP: {{ hpNow }}/{{ hpMax }}</p>
  <div class="progress-bar"><div class="progress-fill life" :style="{ width: pct(hpNow, hpMax) + '%' }"></div></div>
    </div>

    <div class="sidebar-groups">
      <section class="sidebar-group" v-for="group in navGroups" :key="group.key">
        <button class="sidebar-group__head" @click="toggleGroup(group.key)">
          <span>{{ group.title }}</span>
          <span class="muted">{{ groupOpen[group.key] ? 'Hide' : 'Show' }}</span>
        </button>
        <ul v-show="groupOpen[group.key]">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink :to="item.to" @click="emit('navigate')">{{ item.label }}</RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtMoney, fmtDuration } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()
const router = useRouter()
defineProps({
  mobileOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['navigate'])

const eNow = computed(() => store.player?.energyStats?.energy ?? 0)
const eMax = computed(() => store.player?.energyStats?.energyMax ?? 0)
const nNow = computed(() => store.player?.nerveStats?.nerve ?? 0)
const nMax = computed(() => store.player?.nerveStats?.nerveMax ?? 0)
const hNow = computed(() => store.player?.happiness?.happy ?? 0)
const hMax = computed(() => store.player?.happiness?.happyMax ?? 0)
const hpNow = computed(() => typeof store.player?.health === 'number' ? store.player.health : 0)
const hpMax = 100
const money = computed(() => fmtMoney(store.player?.money || 0))

const isDev = computed(() => store.player?.playerRole === 'Developer')

const devMoney = ref(100000)
const devEnergy = ref(10)
const devNerve = ref(5)

let vitalsPollId
let vitalsPollBusy = false
let hasLoggedVitalsRefreshError = false

async function refreshVitals() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
  if (!store.player?.user || vitalsPollBusy) return
  vitalsPollBusy = true
  try {
    await store.loadByUser()
  } catch (e) {
    // Keep current UI values and retry on next tick.
    if (!hasLoggedVitalsRefreshError) {
      console.warn('Failed to refresh sidebar vitals', e)
      hasLoggedVitalsRefreshError = true
    }
  } finally {
    vitalsPollBusy = false
  }
}

async function handleVisibilityRefresh() {
  if (document.visibilityState === 'visible') {
    await refreshVitals()
  }
}

function pct(cur, max){ return max > 0 ? Math.min(100, Math.round((cur/max)*100)) : 0 }

function msUntilNextCronTick(intervalMinutes) {
  const t = new Date(now.value)
  const intervalSec = intervalMinutes * 60
  const secOfHour = (t.getMinutes() * 60) + t.getSeconds()
  const remainder = secOfHour % intervalSec
  const waitSec = remainder === 0 ? (t.getMilliseconds() > 0 ? intervalSec : 0) : (intervalSec - remainder)
  return Math.max(0, (waitSec * 1000) - t.getMilliseconds())
}

function buildRegenTooltip(current, max, gainPerTick, intervalMinutes) {
  const cur = Number(current || 0)
  const cap = Number(max || 0)
  if (cap <= 0) return 'No cap configured'
  if (cur >= cap) return 'Full'

  const missing = cap - cur
  const ticksNeeded = Math.ceil(missing / gainPerTick)
  const tickMs = intervalMinutes * 60 * 1000
  const nextTickMs = msUntilNextCronTick(intervalMinutes)
  const fullMs = nextTickMs + Math.max(0, ticksNeeded - 1) * tickMs
  return `Next +${gainPerTick} in ${fmtDuration(nextTickMs)}. Full in ${fmtDuration(fullMs)}.`
}

const energyTooltip = computed(() => {
  now.value
  return buildRegenTooltip(eNow.value, eMax.value, 5, 10)
})

const nerveTooltip = computed(() => {
  now.value
  return buildRegenTooltip(nNow.value, nMax.value, 1, 5)
})

const happyTooltip = computed(() => {
  now.value
  return buildRegenTooltip(hNow.value, hMax.value, 5, 5)
})

// Live clock for countdown displays.
const now = ref(Date.now())
let timerId
onMounted(() => { timerId = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => {
  clearInterval(timerId)
  clearInterval(vitalsPollId)
  document.removeEventListener('visibilitychange', handleVisibilityRefresh)
})

// Extra sidebar data.
const bankUnlockAt = ref(null)
const cartelRank = ref(null)
const hasWarehouse = ref(false)
const hasBusiness = ref(false)
const hasCartel = computed(() => !!cartelRank.value)
const hasStocks = computed(() => (store.player?.portfolio || []).some(p => Number(p?.shares || 0) > 0))

const groupOpen = ref({
  activities: true,
  economy: true,
  crime: true,
  social: true,
  progression: true,
})

const navGroups = computed(() => {
  const groups = [
    {
      key: 'progression',
      title: 'Main',
      items: [
        { to: '/', label: 'Home' },
        { to: '/inventory', label: 'Inventory' },
        { to: '/vault', label: 'Vault' },
        { to: '/pets', label: 'Pets' },
        { to: '/profile', label: 'Profile' },
      ],
    },
    {
      key: 'activities',
      title: 'Activities',
      items: [
        { to: '/city', label: 'City' },
        { to: '/job', label: 'Job' },
        { to: '/education', label: 'Education' },
        { to: '/gym', label: 'Gym' },
        { to: '/casino', label: 'Casino' },
      ],
    },
    {
      key: 'economy',
      title: 'Economy',
      items: [
        { to: '/money', label: 'Money' },
        { to: '/bank', label: 'Bank' },
        { to: '/stocks', label: 'Stocks' },
        { to: '/market', label: 'Market' },
        { to: '/property', label: 'Property' },
        { to: '/real-estate', label: 'Real Estate' },
        ...(hasBusiness.value ? [{ to: '/real-estate?tab=businesses', label: 'Business' }] : []),
      ],
    },
    {
      key: 'crime',
      title: 'Crime',
      items: [
        { to: '/crimes', label: 'Crimes' },
        ...(hasWarehouse.value ? [{ to: '/grow', label: 'Grow Operation' }] : []),
        ...(hasCartel.value ? [{ to: '/cartel', label: 'Drug Empire' }] : []),
      ],
    },
    {
      key: 'social',
      title: 'Social',
      items: [
        { to: '/hall-of-fame', label: 'Hall of Fame' },
        { to: '/leaderboards', label: 'Leaderboards - TBD' },
        { to: '/clans', label: 'Factions - TBD' },
      ],
    },

  ]

  return groups.filter((g) => g.items.length)
})

function toggleGroup(key) {
  groupOpen.value[key] = !groupOpen.value[key]
}

async function loadBank() {
  try {
    const { data } = await api.get('/bank/accounts')
    const active = (data?.accounts || []).filter(a => !a.isWithdrawn && new Date(a.endDate) > new Date())
    if (active.length) {
      active.sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
      bankUnlockAt.value = new Date(active[0].endDate)
    }
  } catch {}
}

async function loadCartel() {
  try {
    const { data } = await api.get('/cartel/overview')
    cartelRank.value = data?.cartel?.repInfo?.name || (data?.cartel?.name ? 'Nobody' : null)
  } catch { cartelRank.value = null }
}

async function loadGrowState() {
  try {
    const { data } = await api.get('/grow/my')
    hasWarehouse.value = !!data?.warehouse
  } catch { hasWarehouse.value = false }
}

async function loadBusinessState() {
  try {
    const { data } = await api.get('/business/my')
    hasBusiness.value = (data?.businesses || []).length > 0
  } catch { hasBusiness.value = false }
}

// Status effects (icons with tooltips).
function fmtDur(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '0s'
  return fmtDuration(sec * 1000)
}

const effects = computed(() => {
  const arr = []
  const p = store.player
  if (!p) return arr

  // Gender
  const g = p.gender
  if (g === 'Male')        arr.push({ symbol: '♂', title: 'Male' })
  else if (g === 'Female') arr.push({ symbol: '♀', title: 'Female' })
  else if (g === 'Enby')   arr.push({ symbol: '⚧', title: 'Non-binary' })

  // Cooldowns
  const cds = p.cooldowns || {}
  if (Number(cds.medicalCooldown || 0) > 0)
    arr.push({ symbol: '🩹', title: `Medical cooldown • ${fmtDur(cds.medicalCooldown)}` })

  // Drug cooldowns
  const drugMap = cds.drugs || {}
  let drugCount = 0, maxDrug = 0
  for (const k in drugMap) {
    const n = Number(drugMap[k] || 0)
    if (n > 0) { drugCount++; maxDrug = Math.max(maxDrug, n) }
  }
  const legacyDrug = Number(cds.drugCooldown || 0)
  if (legacyDrug > 0) { drugCount = Math.max(drugCount, 1); maxDrug = Math.max(maxDrug, legacyDrug) }
  if (drugCount > 0)
    arr.push({ symbol: '💊', title: `Drug cooldowns • ${drugCount} active • longest ${fmtDur(maxDrug)}` })

  if (Number(cds.alcoholCooldown || 0) > 0) arr.push({ symbol: '🍺', title: `Alcohol cooldown • ${fmtDur(cds.alcoholCooldown)}` })
  if (Number(cds.boosterCooldown || 0) > 0) arr.push({ symbol: '⚡', title: `Booster active • ${fmtDur(cds.boosterCooldown)}` })
  if (hasStocks.value) arr.push({ symbol: '📈', title: 'Stock holdings present' })

  if (bankUnlockAt.value) {
    const remainSec = Math.max(0, Math.floor((bankUnlockAt.value.getTime() - now.value) / 1000))
    arr.push({ symbol: '🏦', title: `Bank unlocks in • ${fmtDur(remainSec)}` })
  }

  const edu = p.education?.active
  if (edu?.courseId) {
    const endsAt = edu.endsAt ? new Date(edu.endsAt) : null
    const remainEdu = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.value) / 1000)) : 0
    const done = endsAt && endsAt.getTime() <= now.value
    arr.push({ symbol: '📖', title: done ? 'Course ready to complete!' : `Studying • ${fmtDur(remainEdu)} remaining` })
  }

  if (p.job?.jobId || p.job?.companyId) arr.push({ symbol: '💼', title: p.job?.companyId ? 'Employed (Company)' : 'Employed (City Job)' })
  if (cartelRank.value) arr.push({ symbol: '🧪', title: cartelRank.value })
  if (p.subscriber) arr.push({ symbol: '⭐', title: 'Subscriber' })
  return arr
})

// Initialize sidebar data.
onMounted(async () => {
  try {
    await ensurePlayer()
  } catch (e) {
    if (e?.response?.status === 404) { router.push('/auth/create-player'); return }
  }
  // Ensure first paint is fresh even when local cache existed.
  await refreshVitals()
  // Keep stats current with lower overhead; cron updates are minute-scale anyway.
  vitalsPollId = setInterval(refreshVitals, 30000)
  document.addEventListener('visibilitychange', handleVisibilityRefresh)
  await Promise.all([loadBank(), loadCartel(), loadGrowState(), loadBusinessState()])
})

// Developer tools.
async function doDev(path, amount) {
  try {
    await api.post(`/dev/${path}`, { amount: Number(amount) })
    await store.loadByUser()
    toast.ok('Done')
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Error')
  }
}
</script>

<style scoped>
.sidebar-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-group {
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel-alt);
  overflow: hidden;
}

.sidebar-group__head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 10px;
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: var(--panel);
}

.sidebar-group ul {
  list-style: none;
  margin: 0;
  padding: 6px;
}

.sidebar-group li {
  margin-bottom: 4px;
}

.sidebar-group li:last-child {
  margin-bottom: 0;
}

.status-effects { display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap; }
.effect-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: 2px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
  font-size: 13px;
  cursor: default;
}
.effect-icon::after {
  content: attr(data-tip);
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  white-space: normal;
  overflow-wrap: break-word;
  min-width: 140px;
  max-width: min(240px, 80vw);
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 2px;
  padding: 4px 8px;
  font-size: 11px;
  line-height: 1.4;
  opacity: 0;
  pointer-events: none;
  transition: opacity 80ms;
  z-index: 1000;
}
.effect-icon:hover::after { opacity: 1; }

</style>
