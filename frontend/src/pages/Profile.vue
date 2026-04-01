<template>
  <section class="profile">
    <h2>Profile</h2>
    <p class="muted" v-if="!player && !loading">No data.</p>

    <div v-if="loading" class="panel" style="margin-top:12px;">Loading…</div>
    <div v-else-if="error" class="panel" style="margin-top:12px;color:var(--danger);">{{ error }}</div>

    <div v-else>
      <ProfileHeaderCard
        :name="player.name"
        :id="player.id"
        :player-title="player.playerTitle"
        :player-status="player.playerStatus"
        :profile-image="primaryProfileImage"
        :fallback-image="DEFAULT_PROFILE_IMAGE"
        :vitals="vitals"
      />

      <div class="tabs u-mt-8">
        <button :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
        <button :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">Settings</button>
      </div>

      <div class="panel" v-if="activeTab === 'overview' && profileImages.length">
        <h3>Profile images</h3>
        <div class="profile__images">
          <a
            v-for="(img, idx) in profileImages"
            :key="`${img}-${idx}`"
            :href="img"
            target="_blank"
            rel="noopener noreferrer"
            class="profile__image-link"
            :title="`Open image ${idx + 1}`"
          >
            <img :src="img" :alt="`Profile image ${idx + 1}`" @error="onGalleryImgErr($event)" />
          </a>
        </div>
      </div>

      <div v-if="activeTab === 'overview'" class="profile__grid">
        <ProfileActionsCard />

        <ProfileMetaCard
          :level="player.level"
          :age="player.age"
          :player-role="player.playerRole"
          :player-status="player.playerStatus"
          :npc="player.npc"
          :exp="player.exp"
        />

        <ProfileAwardsCard />

        <div class="panel">
          <h3>Pet</h3>
          <div v-if="petLoading" class="muted">Loading…</div>
          <div v-else-if="!pet?.pet" class="muted">No pet owned.</div>
          <div v-else class="pet-owned">
            <img class="pet-img" :src="petImage(pet.pet)" alt="Pet" @error="onImgErr($event)"/>
            <div>
              <div class="pet-title"><strong>{{ pet.pet.name }}</strong> <span class="muted">({{ pet.pet.type }})</span></div>
              <div class="pet-tags">
                <span class="pill">Happiness Bonus: +{{ pet.pet.happyBonus }}</span>
                <span class="pill">Age: {{ pet.pet.age }}d</span>
              </div>
            </div>
          </div>
        </div>
        <div class="panel">
          <h3>Finances</h3>
          <ul class="kv">
            <li><span class="k">Money</span><span class="v">{{ fmtMoney(fin.money) }}</span></li>
            <li><span class="k">Bank locked</span><span class="v">{{ fmtMoney(fin.bankLocked) }}</span></li>
            <li><span class="k">Portfolio</span><span class="v">{{ fmtMoney(fin.portfolioValue) }}</span></li>
            <li><span class="k">Net worth</span><span class="v">{{ fmtMoney(fin.netWorth) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Battle stats (total {{ fmtInt(battleTotal) }})</h3>
          <ul class="kv">
            <li><span class="k">Strength</span><span class="v">{{ fmtStat(player.battleStats.strength) }}</span></li>
            <li><span class="k">Speed</span><span class="v">{{ fmtStat(player.battleStats.speed) }}</span></li>
            <li><span class="k">Dexterity</span><span class="v">{{ fmtStat(player.battleStats.dexterity) }}</span></li>
            <li><span class="k">Defense</span><span class="v">{{ fmtStat(player.battleStats.defense) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Work stats (total {{ fmtInt(workTotal) }})</h3>
          <ul class="kv">
            <li><span class="k">Manual labor</span><span class="v">{{ fmtInt(player.workStats.manuallabor) }}</span></li>
            <li><span class="k">Intelligence</span><span class="v">{{ fmtInt(player.workStats.intelligence) }}</span></li>
            <li><span class="k">Endurance</span><span class="v">{{ fmtInt(player.workStats.endurance) }}</span></li>
            <li><span class="k">Employee efficiency</span><span class="v">{{ fmtInt(player.workStats.employeEfficiency) }}</span></li>
          </ul>
        </div>

        <div class="panel">
          <h3>Holdings</h3>
          <div class="table-wrap profile__holdings">
            <table class="tbl">
              <thead><tr><th>Symbol</th><th>Shares</th><th>Avg price</th><th>Value</th></tr></thead>
              <tbody>
                <tr v-for="h in player.finances.holdings" :key="h.symbol">
                  <td>{{ h.symbol }}</td>
                  <td class="num">{{ fmtInt(h.shares) }}</td>
                  <td class="num">{{ fmtMoney(h.avgPrice) }}</td>
                  <td class="num">{{ fmtMoney(h.value) }}</td>
                </tr>
                <tr v-if="!player.finances.holdings?.length"><td colspan="4" class="muted">No holdings</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel profile__panel--full">
          <div class="profile__head2">
            <h3>History</h3>
            <div class="tabs">
              <button :class="{ active: days===7 }" @click="setDays(7)">7d</button>
              <button :class="{ active: days===30 }" @click="setDays(30)">30d</button>
              <button :class="{ active: days===90 }" @click="setDays(90)">90d</button>
            </div>
          </div>
          <div class="sparkline__caption muted">Net worth — last {{ days }} days</div>
          <div class="sparkline">
            <svg :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none">
              <polyline
                v-if="points.length"
                :points="svgPoints"
                fill="none"
                stroke="#5ac8fa"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
            </svg>
            <div class="muted" v-if="!points.length">No data</div>
          </div>
          <div class="sparkline__scale muted" v-if="points.length">
            <span>{{ fmtMoney(minVal) }}</span>
            <span>{{ fmtMoney(maxVal) }}</span>
          </div>
        </div>
      </div>

      <ProfileSettingsImagesCard
        v-else
        :images="editableProfileImages"
        :can-edit="canEditSettings"
        :saving="savingImages"
        :default-image="DEFAULT_PROFILE_IMAGE"
        :error-text="settingsError"
        :ok-text="settingsOk"
        @save="saveProfileImages"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api/client'
import { fmtInt, fmtMoney, fmtStat } from '../utils/format'
import ProfileHeaderCard from '../components/profile/ProfileHeaderCard.vue'
import ProfileActionsCard from '../components/profile/ProfileActionsCard.vue'
import ProfileMetaCard from '../components/profile/ProfileMetaCard.vue'
import ProfileAwardsCard from '../components/profile/ProfileAwardsCard.vue'
import ProfileSettingsImagesCard from '../components/profile/ProfileSettingsImagesCard.vue'

const DEFAULT_PROFILE_IMAGE = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png'

const route = useRoute()
const player = ref(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref('overview')
const savingImages = ref(false)
const settingsError = ref('')
const settingsOk = ref('')
const ownPlayerId = ref(null)

const days = ref(30)
const history = ref({ id: null, days: 0, points: [] })
const w = 480, h = 90

// Pet state
const pet = ref(null)
const petLoading = ref(true)

const vitals = computed(() => player.value?.vitals || { health: 0, energy: 0, energyMax: 0, nerve: 0, nerveMax: 0, happy: 0, happyMax: 0 })
const fin = computed(() => player.value?.finances || { money: 0, bankLocked: 0, portfolioValue: 0, netWorth: 0 })
const battleTotal = computed(() => {
  const b = player.value?.battleStats || {}; return (b.strength||0)+(b.speed||0)+(b.dexterity||0)+(b.defense||0)
})
const workTotal = computed(() => {
  const w = player.value?.workStats || {}; return (w.manuallabor||0)+(w.intelligence||0)+(w.endurance||0)+(w.employeEfficiency||0)
})
const profileImages = computed(() => {
  const arr = player.value?.profileImages
  return Array.isArray(arr) && arr.length ? arr : [DEFAULT_PROFILE_IMAGE]
})
const primaryProfileImage = computed(() => profileImages.value[0] || DEFAULT_PROFILE_IMAGE)
const editableProfileImages = computed(() => {
  const arr = Array.isArray(player.value?.profileImages) ? player.value.profileImages : []
  return arr.filter((u) => u && u !== DEFAULT_PROFILE_IMAGE)
})
const canEditSettings = computed(() => Number(player.value?.id) > 0 && Number(player.value?.id) === Number(ownPlayerId.value))

function resolveOwnPlayerId() {
  try {
    const cached = JSON.parse(localStorage.getItem('nc_player') || 'null')
    ownPlayerId.value = Number(cached?.id || 0) || null
  } catch {
    ownPlayerId.value = null
  }
}

function normalizeLinks(links) {
  if (!Array.isArray(links)) return []
  const dedup = [...new Set(links.map((s) => String(s || '').trim()).filter(Boolean))]
  return dedup.slice(0, 10)
}

async function saveProfileImages(links) {
  settingsError.value = ''
  settingsOk.value = ''
  if (!canEditSettings.value) {
    settingsError.value = 'You can only change your own profile settings.'
    return
  }

  savingImages.value = true
  try {
    const images = normalizeLinks(links)
    const { data } = await api.patch('/player/me/profile-images', { images })
    if (player.value) {
      player.value.profileImages = data?.profileImages || [DEFAULT_PROFILE_IMAGE]
      if (player.value.profileImages[0]) player.value.profileImage = player.value.profileImages[0]
    }
    settingsOk.value = 'Profile images updated.'
  } catch (e) {
    settingsError.value = e?.response?.data?.error || e?.message || 'Failed to update profile images'
  } finally {
    savingImages.value = false
  }
}

async function load(){
  loading.value = true
  error.value = ''
  try {
    const id = route.params.id || new URLSearchParams(location.search).get('id')
    if (!id) throw new Error('Missing id')
    const res = await api.get(`/player/profile/${id}`)
    player.value = res.data || res
  } catch(e){
    error.value = e?.response?.data?.error || e?.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

async function loadHistory(){
  try {
    const id = route.params.id || new URLSearchParams(location.search).get('id')
    if (!id) return
    const res = await api.get(`/player/profile/${id}/history?days=${days.value}`)
    history.value = res.data || res
  } catch (_) {
    history.value = { id: null, days: 0, points: [] }
  }
}

function onImgErr(e){ e.target.style.background = '#2b2b2b'; e.target.src = '' }
function onGalleryImgErr(e){ e.target.src = DEFAULT_PROFILE_IMAGE }
function petImage(p){
  if (!p?.type) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${p.type}.jpg`
}

async function loadPet(){
  petLoading.value = true
  try {
    const id = route.params.id || new URLSearchParams(location.search).get('id')
    if (!id) { pet.value = { pet: null }; return }
    const res = await api.get(`/pets/player/${id}`)
    pet.value = res.data || res
  } catch { pet.value = { pet: null } }
  finally { petLoading.value = false }
}

function setDays(d){ days.value = d }

const points = computed(() => (history.value?.points||[]).map(p => p.netWorth))
const minVal = computed(() => points.value.length ? Math.min(...points.value) : 0)
const maxVal = computed(() => points.value.length ? Math.max(...points.value) : 0)
const svgPoints = computed(() => {
  const arr = points.value
  if (!arr.length) return ''
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const span = max - min || 1
  return arr.map((v, i) => {
    const x = Math.round((i / Math.max(1, arr.length - 1)) * w)
    const y = Math.round(h - ((v - min) / span) * h)
    return `${x},${y}`
  }).join(' ')
})

onMounted(async () => { await load(); await loadHistory(); await loadPet() })
watch(days, loadHistory)
watch(() => route.params.id, async () => { await load(); await loadHistory(); await loadPet() })
onMounted(() => { resolveOwnPlayerId() })
</script>

<style scoped>
.profile__grid { margin-top: 10px; display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.profile__holdings { max-height: 220px; }
.tbl td.num { text-align: right; font-feature-settings: 'tnum'; font-variant-numeric: tabular-nums; }
.profile__head2 { display: flex; align-items: center; justify-content: space-between; }
.profile__panel--full { grid-column: 1 / -1; }
.pet-owned { display: flex; gap: 10px; align-items: center; }
.pet-img { width: 100px; height: 66px; object-fit: cover; border-radius: 2px; border: 1px solid var(--border); background: var(--bg-alt); }
.pet-title { font-size: 13px; margin-bottom: 4px; }
.pet-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.profile__images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}
.profile__image-link img {
  width: 100%;
  height: 88px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--bg-alt);
}
</style>
