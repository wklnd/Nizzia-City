<template>
  <section class="market">
    <h2>Marketplace</h2>
    <p class="muted">Buy and sell items, pets, and properties with other players.</p>

    <div class="tabs u-mb-8">
      <button :class="{ active: tab==='items' }" @click="switchTab('items')">Items</button>
      <button :class="{ active: tab==='pets' }" @click="switchTab('pets')">Pets</button>
      <button :class="{ active: tab==='properties' }" @click="switchTab('properties')">Properties</button>
    </div>

    <div class="grid">
      <div class="panel">
        <div class="panel__head">
          <h3>My Listings</h3>
          <button class="btn" @click="loadListings" :disabled="loading">Refresh</button>
        </div>
        <div v-if="loading" class="muted">Loading…</div>
        <div v-else>
          <table class="tbl" v-if="tab==='items'">
            <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Available</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.item?.name || l.itemId }}</td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num">{{ l.amountAvailable }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else-if="tab==='pets'">
            <thead><tr><th>Pet</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.pet?.name }} <span class="muted">({{ l.pet?.type }})</span></td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="3" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else>
            <thead><tr><th>Property</th><th class="num">Price</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in myListings" :key="l.id">
                <td>{{ l.property?.name || l.propertyId }}</td>
                <td class="num">{{ fmtMoney(l.price) }}</td>
                <td class="num"><button class="btn btn-danger" @click="cancel(l)" :disabled="busy">Cancel</button></td>
              </tr>
              <tr v-if="!myListings.length"><td colspan="3" class="muted">No listings</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>Create Listing</h3>
        <div class="form-grid" v-if="tab==='items'">
          <label>Item</label>
          <select v-model="form.itemKey">
            <option disabled value="">Select item</option>
            <option v-for="it in inv" :key="it.item.id" :value="it.item.id">{{ it.item.name }} (x{{ it.qty }})</option>
          </select>

          <label>Quantity</label>
          <input v-model.number="form.qty" type="number" min="1" />

          <label>Unit Price</label>
          <input v-model.number="form.price" type="number" min="1" />
        </div>
        <div class="form-grid" v-else-if="tab==='pets'">
          <label>Your Pet</label>
          <div>
            <template v-if="petMine && petMine.pet">
              <strong>{{ petMine.pet.name }}</strong> <span class="muted">({{ petMine.pet.type }})</span>
              <div class="muted">Bonus: +{{ petMine.pet.happyBonus }} happiness</div>
            </template>
            <span v-else class="muted">No pet available</span>
          </div>
          <label>Price</label>
          <input v-model.number="form.petPrice" type="number" min="1" />
        </div>
        <div class="form-grid" v-else>
          <label>Property</label>
          <select v-model="form.propertyId">
            <option disabled value="">Select property</option>
            <option v-for="opt in propertyOptions" :key="opt.id" :value="opt.id">{{ opt.name }} <span v-if="opt.count>1">(x{{ opt.count }})</span></option>
          </select>
          <label>Price</label>
          <input v-model.number="form.propertyPrice" type="number" min="1" />
        </div>
        <div class="actions">
          <button class="btn" @click="create" :disabled="busy || !canCreate">List</button>
          <span class="muted" v-if="!canCreate">Fill all fields</span>
        </div>
      </div>

      <div class="panel panel--full">
        <div class="panel__head">
          <h3>All Listings</h3>
          <button class="btn" @click="loadListings" :disabled="loading">Refresh</button>
        </div>
        <div class="filter">
          <input v-model="filter" class="input" type="text" :placeholder="tab==='items' ? 'Search item name…' : (tab==='pets' ? 'Search pet name…' : 'Search property…')" />
        </div>
        <div v-if="loading" class="muted">Loading…</div>
        <div v-else>
          <table class="tbl" v-if="tab==='items'">
            <thead><tr><th>Item</th><th class="num">Price</th><th class="num">Listings</th><th></th></tr></thead>
            <tbody>
              <template v-for="g in groupedListings" :key="g.itemId">
                <tr class="group-row" @click="toggleGroup(g.itemId)">
                  <td><strong>{{ g.item?.name || g.itemId }}</strong></td>
                  <td class="num">{{ fmtMoney(g.minPrice) }}<span v-if="g.maxPrice > g.minPrice" class="muted"> - {{ fmtMoney(g.maxPrice) }}</span></td>
                  <td class="num">{{ g.listings.length }}</td>
                  <td class="num"><span class="group-chevron">{{ expandedGroups[g.itemId] ? '▼' : '▶' }}</span></td>
                </tr>
                <tr v-if="expandedGroups[g.itemId]" class="expand-spacer"><td colspan="4" class="expand-pad"></td></tr>
                <tr v-for="l in g.listings" v-if="expandedGroups[g.itemId]" :key="l.id" class="sub-row">
                  <td class="sub-seller">
                    <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                    <span v-else>{{ l.seller?.name || '—' }}</span>
                  </td>
                  <td class="num">{{ fmtMoney(l.price) }}</td>
                  <td class="num">{{ l.amountAvailable }}</td>
                  <td class="num">
                    <input v-model.number="buyQtyMap[l.id]" type="number" min="1" :max="l.amountAvailable" class="input input--qty" />
                    <button class="btn" @click.stop="buy(l)" :disabled="busy || l.amountAvailable<=0">Buy</button>
                  </td>
                </tr>
              </template>
              <tr v-if="!groupedListings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else-if="tab==='pets'">
            <thead><tr><th>Pet</th><th class="num">Price</th><th class="num">Listings</th><th></th></tr></thead>
            <tbody>
              <template v-for="g in groupedListings" :key="g.petId">
                <tr class="group-row" @click="toggleGroup(g.petId)">
                  <td><strong>{{ g.pet?.name }} <span class="muted">({{ g.pet?.type }})</span></strong></td>
                  <td class="num">{{ fmtMoney(g.minPrice) }}<span v-if="g.maxPrice > g.minPrice" class="muted"> - {{ fmtMoney(g.maxPrice) }}</span></td>
                  <td class="num">{{ g.listings.length }}</td>
                  <td class="num"><span class="group-chevron">{{ expandedGroups[g.petId] ? '▼' : '▶' }}</span></td>
                </tr>
                <tr v-if="expandedGroups[g.petId]" class="expand-spacer"><td colspan="4" class="expand-pad"></td></tr>
                <tr v-for="l in g.listings" v-if="expandedGroups[g.petId]" :key="l.id" class="sub-row">
                  <td class="sub-seller">
                    <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                    <span v-else>{{ l.seller?.name || '—' }}</span>
                  </td>
                  <td class="num">{{ fmtMoney(l.price) }}</td>
                  <td class="num">—</td>
                  <td class="num">
                    <button class="btn" @click.stop="buy(l)" :disabled="busy">Buy</button>
                  </td>
                </tr>
              </template>
              <tr v-if="!groupedListings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
          <table class="tbl" v-else>
            <thead><tr><th>Property</th><th class="num">Price</th><th class="num">Listings</th><th></th></tr></thead>
            <tbody>
              <template v-for="g in groupedListings" :key="g.propertyId">
                <tr class="group-row" @click="toggleGroup(g.propertyId)">
                  <td><strong>{{ g.property?.name || g.propertyId }}</strong></td>
                  <td class="num">{{ fmtMoney(g.minPrice) }}<span v-if="g.maxPrice > g.minPrice" class="muted"> - {{ fmtMoney(g.maxPrice) }}</span></td>
                  <td class="num">{{ g.listings.length }}</td>
                  <td class="num"><span class="group-chevron">{{ expandedGroups[g.propertyId] ? '▼' : '▶' }}</span></td>
                </tr>
                <tr v-if="expandedGroups[g.propertyId]" class="expand-spacer"><td colspan="4" class="expand-pad"></td></tr>
                <tr v-for="l in g.listings" v-if="expandedGroups[g.propertyId]" :key="l.id" class="sub-row">
                  <td class="sub-seller">
                    <RouterLink v-if="l.seller?.playerId" :to="`/profile/${l.seller.playerId}`">{{ l.seller?.name }}</RouterLink>
                    <span v-else>{{ l.seller?.name || '—' }}</span>
                  </td>
                  <td class="num">{{ fmtMoney(l.price) }}</td>
                  <td class="num">—</td>
                  <td class="num">
                    <button class="btn" @click.stop="buy(l)" :disabled="busy">Buy</button>
                  </td>
                </tr>
              </template>
              <tr v-if="!groupedListings.length"><td colspan="4" class="muted">No listings</td></tr>
            </tbody>
          </table>
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
import { fmtMoney } from '../utils/format'

const { store, ensurePlayer, reloadPlayer } = usePlayer()
const toast = useToast()
const loading = ref(false)
const busy = ref(false)
const inv = ref([])
const listings = ref([])
const tab = ref('items')
const petMine = ref(null)
const filter = ref('')
const buyQtyMap = ref({})
const expandedGroups = ref({})

const form = ref({ itemKey: '', qty: 1, price: 1, petPrice: 1, propertyId: '', propertyPrice: 1 })
const canCreate = computed(() => {
  if (tab.value === 'items') return form.value.itemKey && form.value.qty > 0 && form.value.price > 0
  if (tab.value === 'pets') return Number(form.value.petPrice || 0) > 0 && !!(petMine.value && petMine.value.pet)
  return form.value.propertyId && Number(form.value.propertyPrice || 0) > 0
})

const myListings = computed(() => {
  const pid = store.player?._id
  return listings.value.filter(l => l.sellerId === pid)
})

const filteredListings = computed(() => {
  const f = (filter.value || '').trim().toLowerCase()
  if (!f) return listings.value
  if (tab.value === 'items') return listings.value.filter(l => (l.item?.name || l.itemId || '').toLowerCase().includes(f))
  if (tab.value === 'pets') return listings.value.filter(l => (l.pet?.name || '').toLowerCase().includes(f))
  return listings.value.filter(l => (l.property?.name || l.propertyId || '').toLowerCase().includes(f))
})

const groupedListings = computed(() => {
  const filtered = filteredListings.value
  if (tab.value === 'items') {
    const groups = {}
    for (const l of filtered) {
      const key = l.itemId
      if (!groups[key]) groups[key] = { itemId: l.itemId, item: l.item, listings: [], minPrice: Infinity, maxPrice: 0 }
      groups[key].listings.push(l)
      groups[key].minPrice = Math.min(groups[key].minPrice, l.price)
      groups[key].maxPrice = Math.max(groups[key].maxPrice, l.price)
    }
    return Object.values(groups).sort((a, b) => a.minPrice - b.minPrice)
  } else if (tab.value === 'pets') {
    const groups = {}
    for (const l of filtered) {
      const key = l.id
      if (!groups[key]) groups[key] = { petId: key, pet: l.pet, listings: [], minPrice: Infinity, maxPrice: 0 }
      groups[key].listings.push(l)
      groups[key].minPrice = Math.min(groups[key].minPrice, l.price)
      groups[key].maxPrice = Math.max(groups[key].maxPrice, l.price)
    }
    return Object.values(groups).sort((a, b) => a.minPrice - b.minPrice)
  } else {
    const groups = {}
    for (const l of filtered) {
      const key = l.propertyId
      if (!groups[key]) groups[key] = { propertyId: key, property: l.property, listings: [], minPrice: Infinity, maxPrice: 0 }
      groups[key].listings.push(l)
      groups[key].minPrice = Math.min(groups[key].minPrice, l.price)
      groups[key].maxPrice = Math.max(groups[key].maxPrice, l.price)
    }
    return Object.values(groups).sort((a, b) => a.minPrice - b.minPrice)
  }
})

async function loadInventory() {
  if (!store.player?.user) return
  const { data } = await api.get('/inventory/mine')
  inv.value = (data?.inventory || []).map(e => ({ item: { id: e.item.id, name: e.item.name }, qty: e.qty }))
}

async function loadListings() {
  loading.value = true
  try {
    let data
    if (tab.value === 'items') {
      data = (await api.get('/market/listings')).data; listings.value = data?.listings || []
    } else if (tab.value === 'pets') {
      data = (await api.get('/market/listings/pets')).data; listings.value = data?.listings || []
    } else {
      data = (await api.get('/market/listings/properties')).data; listings.value = data?.listings || []
    }
    buyQtyMap.value = {}
  } catch { /* ignore */ } finally { loading.value = false }
}

async function create() {
  if (!canCreate.value) return
  busy.value = true
  try {
    if (tab.value === 'items') {
      await api.post('/market/list', { itemId: form.value.itemKey, qty: form.value.qty, price: form.value.price }); form.value.qty = 1
    } else if (tab.value === 'pets') {
      await api.post('/market/list/pet', { price: form.value.petPrice })
    } else {
      await api.post('/market/list/property', { propertyId: form.value.propertyId, price: form.value.propertyPrice })
    }
    await Promise.all([loadListings(), loadInventory(), reloadPlayer(), loadMinePet()])
    toast.ok('Listed.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to list') }
  finally { busy.value = false }
}

async function cancel(l) {
  busy.value = true
  try {
    if (tab.value === 'items') await api.post('/market/cancel', { listingId: l.id })
    else if (tab.value === 'pets') await api.post('/market/cancel/pet', { listingId: l.id })
    else await api.post('/market/cancel/property', { listingId: l.id })
    await Promise.all([loadListings(), loadInventory(), reloadPlayer(), loadMinePet()])
    toast.ok('Cancelled.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to cancel') }
  finally { busy.value = false }
}

async function buy(l) {
  busy.value = true
  try {
    let res
    if (tab.value === 'items') {
      const q = Math.max(1, Number(buyQtyMap.value[l.id] || 1))
      res = await api.post('/market/buy', { listingId: l.id, qty: q })
    } else if (tab.value === 'pets') {
      res = await api.post('/market/buy/pet', { listingId: l.id })
    } else {
      res = await api.post('/market/buy/property', { listingId: l.id })
    }
    if (res?.data?.money != null) store.mergePartial({ money: res.data.money })
    await Promise.all([loadListings(), loadMinePet()])
    toast.ok('Purchased.')
  } catch (e) { toast.error(e?.response?.data?.error || e?.message || 'Failed to buy') }
  finally { busy.value = false }
}

function switchTab(next) { tab.value = next; expandedGroups.value = {}; loadListings() }

function toggleGroup(key) {
  expandedGroups.value[key] = !expandedGroups.value[key]
}

async function loadMinePet() {
  try {
    if (!store.player?.user) return
    const { data } = await api.get('/pets/my')
    petMine.value = data
  } catch { petMine.value = null }
}

const propertyOptions = computed(() => {
  const seen = {}
  const props = store.player?.properties || []
  for (const e of props) {
    if (e.propertyId === 'trailer') continue
    if (store.player?.home === e.propertyId) continue
    seen[e.propertyId] = (seen[e.propertyId] || 0) + 1
  }
  return Object.keys(seen).map(id => ({
    id, name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), count: seen[id],
  })).sort((a, b) => a.name.localeCompare(b.name))
})

onMounted(async () => { await ensurePlayer(); await Promise.all([loadInventory(), loadListings(), loadMinePet()]) })
</script>

<style scoped>
.market { max-width: 1000px; margin: 0 auto; }

.grid { 
  display: grid; 
  grid-template-columns: 1fr 1fr; 
  gap: 1rem; 
  width: 100%;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  overflow: hidden;
}

.panel h3 {
  margin: 0 0 1rem 0;
  font-size: 16px;
}

.panel__head { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  margin-bottom: 1rem;
}

.panel--full { 
  grid-column: 1 / -1; 
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tbl thead {
  background: var(--panel-hover);
  border-bottom: 1px solid var(--border);
}

.tbl th {
  padding: 8px;
  text-align: left;
  font-weight: 600;
  color: var(--muted);
}

.tbl td {
  padding: 8px;
  border-bottom: 1px solid var(--border);
}

.tbl tbody tr:hover {
  background: var(--panel-hover);
}

.tbl .num {
  text-align: right;
}

.form-grid { 
  display: grid; 
  grid-template-columns: 100px 1fr; 
  gap: 6px; 
  align-items: center; 
  font-size: 12px;
  margin-bottom: 1rem;
}

.input--qty { 
  width: 72px; 
}

.filter { 
  margin-bottom: 6px; 
}

.btn-danger { 
  background: var(--danger); 
  color: #fff; 
  border-color: var(--danger); 
}

.group-row { 
  background: var(--panel-hover); 
  font-weight: 600;
  cursor: pointer;
}

.group-chevron { color: var(--muted); }

.group-row:hover { 
  background: var(--accent-muted); 
}

.expand-spacer { 
  height: 2px;
  background: transparent;
}

.expand-pad { padding: 0; }

.sub-row { 
  background: var(--panel); 
  font-size: 13px; 
}

.sub-seller { padding-left: 2rem; }

.sub-row td { 
  padding-top: 4px; 
  padding-bottom: 4px; 
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
