<template>
  <div class="topbar">
    <div class="topbar__left">
      <button class="topbar__menu" @click="emit('toggle-nav')" :title="mobileNavOpen ? 'Close navigation' : 'Open navigation'">
        {{ mobileNavOpen ? 'Close' : 'Menu' }}
      </button>
      <div class="brand">Nizzia City</div>
      <div class="topbar__context" v-if="sectionLabel || pageLabel">
        <span class="topbar__section" v-if="sectionLabel">{{ sectionLabel }}</span>
        <span v-if="sectionLabel && pageLabel">/</span>
        <span class="topbar__page" v-if="pageLabel">{{ pageLabel }}</span>
      </div>
    </div>

    <div class="topbar__center">
      <div class="buttons">
        <button v-if="isAdmin" @click="goAdmin" title="Admin">Admin</button>
        <button @click="openWiki" title="Wiki">Wiki</button>
        <button @click="rules" title="Rules">Rules</button>
        <button @click="staff" title="Staff">Staff</button>
      </div>
      <div class="ticker" :class="{ 'ticker--single': tickerMode==='single' }">
        <div class="ticker__track" :style="trackStyle">{{ tickerText }}</div>
      </div>
    </div>

    <div class="topbar__right actions">
      <button @click="forums" title="Forums" data-label="secondary">Forums</button>
      <button @click="discord" title="Discord" data-label="secondary">Discord</button>
      <button @click="credits" title="Credits" data-label="secondary">Credits</button>
      <button @click="toggleTheme" :title="isDark ? 'Switch to light' : 'Switch to dark'">{{ isDark ? 'Light' : 'Dark' }}</button>
      <button @click="goProfile" title="Profile">Profile</button>
      <button @click="logout" title="Log out">Log out</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'
// Note: do not import dev-only packages (like eslint configs) into runtime code

const props = defineProps({
  sectionLabel: { type: String, default: '' },
  pageLabel: { type: String, default: '' },
  mobileNavOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle-nav'])

const router = useRouter()
const store = usePlayerStore()
const isAdmin = computed(() => {
  // Check role from store or cached player
  const role = store.player?.playerRole || (() => { try { return JSON.parse(localStorage.getItem('nc_player')||'null')?.playerRole } catch { return null } })()
  return role === 'Admin' || role === 'Developer'
})

function goAdmin(){
  router.push('/admin')
}

// Theme toggle
const isDark = ref(document.documentElement.getAttribute('data-theme') !== 'light')
function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('nc_theme', next)
  isDark.value = next === 'dark'
}

// Ticker: simple rotation by default, with optional slow scroll
const tickerMode = ref('scroll') // 'single' | 'scroll'
const newsItems = ref([
  'Welcome to Nizzia City!',
  'Train in the gym to boost your stats.',
  'Happiness increases gym gains.',
  'Jobs pay out daily at 01:00 server time.',
  'Oscar is awesome!',
  'Lazy? Go and train!',
  'Bababing, bababing, bababing...',
  'AAAAHHHH!',
  'Drugs man, drugs!'
])
const idx = ref(0)
const tickerText = computed(() => tickerMode.value==='single' ? (newsItems.value[idx.value] || '') : newsItems.value.concat(newsItems.value).join(' — '))
const trackStyle = computed(() => tickerMode.value==='scroll' ? { animationDuration: '60s' } : { animation: 'none', paddingLeft: '0' })

let timer
onMounted(() => {
  // Rotate ticker in single mode
  timer = setInterval(() => { if (tickerMode.value==='single') idx.value = (idx.value + 1) % newsItems.value.length }, 8000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })

async function goProfile(){
  // Try store -> localStorage player -> fetch by user to resolve numeric Player.id
  const hasId = (v) => v !== undefined && v !== null
  let pid = store.player?.id
  if (!hasId(pid)) {
    try {
      const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
      pid = cached?.id
    } catch {}
  }
  if (!hasId(pid)) {
    try {
      const p = await store.loadByUser()
      pid = p?.id
    } catch {}
  }
  if (hasId(pid)) router.push(`/profile/${pid}`)
  else router.push('/profile')
}
function logout(){
  try { localStorage.removeItem('nc_token'); localStorage.removeItem('nc_user'); localStorage.removeItem('nc_player'); } catch {}
  router.push('/auth/login')
}

// Topbar action handlers (customize targets as you like)
function openWiki(){
  try { window.open('https://github.com/wklnd/Nizzia-City-Rewrite/wiki', '_blank') } catch {}
}
function rules(){
  // Route to News page as a placeholder for rules; replace with /rules when available
  router.push('/rules')
}
function forums(){
  try { window.open('https://forums.example.com', '_blank') } catch {}
}
function discord(){
  try { window.open('https://discord.gg/your-invite', '_blank') } catch {}
}
function staff(){
  // Placeholder; route somewhere relevant when a staff page exists
  router.push('/hall-of-fame')
}
function credits(){
  router.push('/credits')
}

const sectionLabel = computed(() => props.sectionLabel)
const pageLabel = computed(() => props.pageLabel)
const mobileNavOpen = computed(() => props.mobileNavOpen)
</script>

<style scoped>
</style>
