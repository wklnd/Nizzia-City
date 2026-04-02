<template>
  <section class="pets-page">
    <header class="pets-page__header">
      <h2>Pet Store</h2>
      <p class="muted">Adopt a companion that increases happiness. You can own one pet at a time.</p>
    </header>

    <div class="panel" v-if="loading">Loading pets…</div>
    <div class="panel" v-else-if="error">
      <p class="text-danger">{{ error }}</p>
    </div>

    <div v-else class="pets-shell">
      <article class="panel pets-current">
        <h3>Your Pet</h3>

        <div v-if="!hasPet" class="pets-empty u-mt-8">
          <p class="muted">You do not currently own a pet.</p>
          <p class="muted">Choose one from the catalog below to gain a happiness bonus.</p>
        </div>

        <div v-else class="pets-current__card card card--flush u-mt-8">
          <div class="pets-current__media card__media">
            <img :src="petImage(mine.pet)" :alt="mine.pet?.name || 'Pet'" loading="lazy" decoding="async" @error="onImgErr($event)" />
          </div>

          <div class="pets-current__body card__body">
            <div class="pets-current__title-row">
              <h4 class="pets-current__name">{{ mine.pet?.name }}</h4>
              <span class="pill pill--info">{{ mine.pet?.type }}</span>
            </div>

            <div class="pets-current__stats">
              <div class="stat-item">
                <div class="lbl">Happiness Bonus</div>
                <div class="val">+{{ mine.pet?.happyBonus || 0 }}</div>
              </div>
              <div class="stat-item">
                <div class="lbl">Age</div>
                <div class="val">{{ mine.pet?.age || 0 }}d</div>
              </div>
            </div>

            <div class="pets-current__actions">
              <input
                v-model="newName"
                type="text"
                class="input pets-current__name-input"
                placeholder="New nickname"
                :maxlength="32"
              />
              <button class="btn btn--primary" @click="renamePet" :disabled="busy || !canRename">Save Name</button>
              <button class="btn btn--danger" @click="release" :disabled="busy">Release</button>
            </div>
          </div>
        </div>
      </article>

      <article class="panel pets-catalog">
        <div class="pets-catalog__head">
          <h3>Catalog</h3>
          <input v-model="query" type="search" class="input input--sm pets-catalog__search" placeholder="Search pets" />
        </div>

        <div class="pets-catalog__rows u-mt-8">
          <div class="pets-row card card--flush" v-for="p in filteredCatalog" :key="p.id">
            <div class="pets-row__media card__media">
              <img :src="petImageById(p.id)" :alt="p.name" loading="lazy" decoding="async" @error="onImgErr($event)" />
            </div>

            <div class="pets-row__main">
              <div class="pets-row__top">
                <div class="pets-row__name">{{ p.name }}</div>
                <span class="pill pill--ok">+{{ p.happyBonus }} happy</span>
              </div>

              <div class="pets-row__meta muted">
                <span>Price: {{ fmtMoney(p.cost) }}</span>
                <span>Type: {{ p.id }}</span>
              </div>
            </div>

            <div class="pets-row__actions">
              <button class="btn btn--primary" @click="buy(p)" :disabled="busy || hasPet">Adopt</button>
            </div>
          </div>

          <div v-if="!filteredCatalog.length" class="pets-empty muted">No pets match your search.</div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../api/client'
import { useToast } from '../composables/useToast'
import { fmtMoney } from '../utils/format'

const toast = useToast()

const loading = ref(true)
const error = ref('')
const busy = ref(false)
const mine = ref({ pet: null })
const catalog = ref({ pets: [] })
const newName = ref('')
const query = ref('')

const hasPet = computed(() => !!mine.value?.pet)

const filteredCatalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = catalog.value?.pets || []
  if (!q) return list
  return list.filter((p) => {
    const name = String(p?.name || '').toLowerCase()
    const id = String(p?.id || '').toLowerCase()
    return name.includes(q) || id.includes(q)
  })
})

function onImgErr(e) {
  const img = e?.target
  if (!img) return
  img.onerror = null
  img.src = '/assets/images/pet_placeholder.jpg'
}

function petImage(p) {
  if (!p?.type) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${p.type}.jpg`
}

function petImageById(id) {
  if (!id) return '/assets/images/pet_placeholder.jpg'
  return `/assets/images/pet_${id}.jpg`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [mineRes, catRes] = await Promise.all([
      api.get('/pets/my'),
      api.get('/pets/catalog'),
    ])
    mine.value = mineRes.data || mineRes
    catalog.value = catRes.data || catRes
    newName.value = mine.value?.pet?.name || ''
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load pets'
  } finally {
    loading.value = false
  }
}

async function buy(p) {
  busy.value = true
  try {
    await api.post('/pets/buy', { type: p.id, name: p.name })
    toast.ok(`Adopted ${p.name}!`)
    await load()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to buy pet')
  } finally {
    busy.value = false
  }
}

async function release() {
  if (!confirm('Release your pet?')) return
  busy.value = true
  try {
    await api.post('/pets/release')
    toast.ok('Pet released')
    await load()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to release pet')
  } finally {
    busy.value = false
  }
}

const canRename = computed(() => {
  const n = newName.value.trim()
  return n.length >= 2 && n.length <= 32
})

async function renamePet() {
  if (!canRename.value) return
  busy.value = true
  try {
    await api.post('/pets/rename', { name: newName.value.trim() })
    toast.ok('Pet renamed')
    await load()
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to rename pet')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.pets-page {
  display: grid;
  gap: var(--space-3);
}

.pets-page__header {
  display: grid;
  gap: 2px;
}

.pets-shell {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  align-items: start;
}

.pets-empty {
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-1);
}

.pets-current__card {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
}

.pets-current__media {
  border-radius: 0;
}

.pets-current__body {
  min-width: 0;
}

.pets-current__title-row {
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.pets-current__name {
  margin: 0;
  font-size: 1rem;
  color: var(--text-strong);
  text-transform: none;
  letter-spacing: 0;
}

.pets-current__stats {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(2, minmax(120px, 1fr));
}

.pets-current__actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  align-items: center;
}

.pets-current__name-input {
  flex: 1 1 240px;
  min-width: 0;
}

.pets-catalog {
  min-width: 0;
}

.pets-catalog__head {
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.pets-catalog__search {
  width: min(100%, 240px);
}

.pets-catalog__rows {
  display: grid;
  gap: var(--space-2);
}

.pets-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  align-items: stretch;
}

.pets-row__media {
  border-radius: 0;
}

.pets-row__main {
  padding: var(--space-3);
  min-width: 0;
  display: grid;
  align-content: center;
  gap: var(--space-1);
}

.pets-row__top {
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.pets-row__name {
  font-weight: 700;
  color: var(--text-strong);
}

.pets-row__meta {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: 12px;
}

.pets-row__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  border-left: 1px solid var(--border);
}

@media (max-width: 1100px) {
  .pets-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .pets-current__card {
    grid-template-columns: 1fr;
  }

  .pets-current__media {
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }

  .pets-current__stats {
    grid-template-columns: 1fr;
  }

  .pets-row {
    grid-template-columns: 1fr;
  }

  .pets-row__media {
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }

  .pets-row__actions {
    border-left: 0;
    border-top: 1px solid var(--border);
    justify-content: stretch;
  }

  .pets-row__actions .btn {
    width: 100%;
  }
}
</style>
