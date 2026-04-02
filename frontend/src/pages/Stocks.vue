<template>
  <section class="stocks-terminal">
    <header class="stocks-top">
      <div>
        <h2>Stocks Terminal</h2>
        <p class="muted">TradingView-inspired workflow, simplified for Nizzia City.</p>
      </div>
      <div class="stocks-top__actions">
        <button class="btn" @click="refreshAll" :disabled="loading">Refresh</button>
      </div>
    </header>

    <div class="stocks-kpis stat-grid u-mt-8">
      <div class="stat-item">
        <div class="label">Cash</div>
        <div class="value">{{ fmtMoney(analytics.money || portfolio.money || 0) }}</div>
      </div>
      <div class="stat-item">
        <div class="label">Invested</div>
        <div class="value">{{ fmtMoney(analytics.invested || 0) }}</div>
      </div>
      <div class="stat-item">
        <div class="label">Market Value</div>
        <div class="value">{{ fmtMoney(analytics.marketValue || 0) }}</div>
      </div>
      <div class="stat-item">
        <div class="label">Unrealized PnL</div>
        <div class="value" :class="(analytics.unrealizedPnL || 0) >= 0 ? 'val--pos' : 'val--neg'">{{ fmtMoney(analytics.unrealizedPnL || 0) }}</div>
      </div>
    </div>

    <div class="terminal-grid u-mt-12">
      <aside class="panel terminal-left">
        <div class="panel-head">
          <h3>Symbols</h3>
          <label class="inline-check"><input type="checkbox" v-model="watchOnly" /> Watchlist only</label>
        </div>
        <input class="input input--sm u-mt-6" type="search" v-model="search" placeholder="Search symbol or name" />

        <div class="table-wrap terminal-list u-mt-8">
          <table class="tbl">
            <thead>
              <tr>
                <th>★</th>
                <th>Symbol</th>
                <th class="num">Price</th>
                <th class="num">24h</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in filteredList"
                :key="s.symbol"
                :class="{ active: s.symbol === symbol }"
                @click="selectSymbol(s.symbol)"
              >
                <td class="num">
                  <button class="star-btn" @click.stop="toggleWatch(s.symbol)">{{ isWatched(s.symbol) ? '★' : '☆' }}</button>
                </td>
                <td>
                  <div class="sym">{{ s.symbol }}</div>
                  <div class="muted sym-name">{{ s.name }}</div>
                </td>
                <td class="num">{{ fmtPrice(s.price, s.decimals) }}</td>
                <td class="num" :class="{ up: s.change > 0, down: s.change < 0 }">{{ signedPercent(s.changePct) }}</td>
              </tr>
              <tr v-if="!filteredList.length"><td colspan="4" class="muted">No symbols match filter</td></tr>
            </tbody>
          </table>
        </div>
      </aside>

      <main class="terminal-main">
        <div class="panel chart-panel">
          <div class="panel-head">
            <div>
              <h3 v-if="quote">{{ quote.symbol }} <span class="muted">{{ quote.name }}</span></h3>
              <h3 v-else>Chart</h3>
              <div class="muted" v-if="quote">
                Last: <strong>{{ fmtPrice(quote.price, quote.decimals) }}</strong>
                <span class="u-mt-4">| O: {{ fmtPrice(ohlc.open, quote.decimals) }} H: {{ fmtPrice(ohlc.high, quote.decimals) }} L: {{ fmtPrice(ohlc.low, quote.decimals) }} C: {{ fmtPrice(ohlc.close, quote.decimals) }}</span>
              </div>
            </div>
            <div class="u-flex u-gap-8 u-wrap">
              <div class="tabs mini-tabs">
                <button :class="{ active: range === '1d' }" @click="range = '1d'">1D</button>
                <button :class="{ active: range === '7d' }" @click="range = '7d'">7D</button>
                <button :class="{ active: range === '30d' }" @click="range = '30d'">30D</button>
                <button :class="{ active: range === '90d' }" @click="range = '90d'">90D</button>
              </div>
              <select class="input input--sm" v-model="interval">
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="1h">1h</option>
              </select>
              <label class="inline-check"><input type="checkbox" v-model="showSma" /> SMA20</label>
            </div>
          </div>

          <div class="chart-wrap u-mt-8">
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" preserveAspectRatio="none">
              <line
                v-for="y in chartGridY"
                :key="y"
                x1="0"
                :y1="y"
                :x2="chartW"
                :y2="y"
                class="grid-line"
              />
              <polyline v-if="linePoints" :points="linePoints" class="price-line" />
              <polyline v-if="showSma && smaPoints" :points="smaPoints" class="sma-line" />
            </svg>
            <div class="chart-empty" v-if="!bars.length">No chart data</div>
          </div>

          <div class="chart-scale muted" v-if="bars.length">
            <span>{{ fmtPrice(minVal, quote?.decimals || 2) }}</span>
            <span>{{ fmtPrice(maxVal, quote?.decimals || 2) }}</span>
          </div>
        </div>

        <div class="panel u-mt-8">
          <div class="panel-head">
            <h3>Trade History</h3>
            <button class="btn btn--small" @click="loadHistory" :disabled="loading">Refresh</button>
          </div>
          <div class="table-wrap u-mt-8 terminal-history">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th class="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in history.rows" :key="`${row.createdAt}-${row.description}`">
                  <td class="muted">{{ fmtTime(row.createdAt) }}</td>
                  <td>{{ row.type === 'stock_buy' ? 'BUY' : 'SELL' }}</td>
                  <td>{{ row.meta?.symbol || parseSymbolFromDesc(row.description) }}</td>
                  <td class="num" :class="row.amount >= 0 ? 'up' : 'down'">{{ fmtMoney(row.amount) }}</td>
                </tr>
                <tr v-if="!history.rows.length"><td colspan="4" class="muted">No trade history</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <aside class="panel terminal-right">
        <h3>Order Ticket</h3>
        <div class="field u-mt-8">
          <label>Symbol</label>
          <input class="input" :value="symbol" readonly />
        </div>
        <div class="field">
          <label>Shares</label>
          <input class="input" type="number" min="1" step="1" v-model.number="shares" />
        </div>
        <div class="quick-qty u-mt-6">
          <button class="btn btn--small" @click="shares = 1">1</button>
          <button class="btn btn--small" @click="shares = 5">5</button>
          <button class="btn btn--small" @click="shares = 10">10</button>
          <button class="btn btn--small" @click="shares = 25">25</button>
        </div>
        <div class="kv u-mt-8">
          <li><span class="k">Est. Cost</span><span class="v">{{ fmtMoney(estimatedCost) }}</span></li>
          <li><span class="k">Est. Proceeds</span><span class="v">{{ fmtMoney(estimatedProceeds) }}</span></li>
          <li><span class="k">Cash</span><span class="v">{{ fmtMoney(portfolio.money || store.player?.money || 0) }}</span></li>
        </div>
        <div class="actions u-mt-8">
          <button class="btn btn--primary" @click="doBuy" :disabled="!canTrade || busy">Buy</button>
          <button class="btn btn--danger" @click="doSell" :disabled="!canTrade || busy">Sell</button>
        </div>

        <h3 class="u-mt-16">Open Positions</h3>
        <div class="table-wrap u-mt-8 terminal-positions">
          <table class="tbl">
            <thead>
              <tr>
                <th>Sym</th>
                <th class="num">Shares</th>
                <th class="num">Value</th>
                <th class="num">PnL</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in portfolio.holdings" :key="h.symbol">
                <td>{{ h.symbol }}</td>
                <td class="num">{{ fmtInt(h.shares) }}</td>
                <td class="num">{{ fmtMoney(h.value) }}</td>
                <td class="num" :class="plClass(h)">{{ fmtMoney(calcPnL(h)) }}</td>
              </tr>
              <tr v-if="!portfolio.holdings.length"><td colspan="4" class="muted">No positions</td></tr>
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '../api/client'
import { usePlayer } from '../composables/usePlayer'
import { useToast } from '../composables/useToast'
import { fmtInt, fmtMoney } from '../utils/format'

const { store, ensurePlayer } = usePlayer()
const toast = useToast()

const loading = ref(false)
const busy = ref(false)
const quoteRequestSeq = ref(0)

const list = ref([])
const symbol = ref('')
const search = ref('')
const watchOnly = ref(false)
const watchlist = ref([])

const quote = ref(null)
const range = ref('1d')
const interval = ref('5m')
const showSma = ref(true)
const shares = ref(1)

const portfolio = ref({ money: 0, holdings: [] })
const history = ref({ rows: [], total: 0 })
const analytics = ref({})

const chartW = 900
const chartH = 320

const filteredList = computed(() => {
  const q = search.value.trim().toLowerCase()
  let rows = list.value
  if (watchOnly.value) {
    const set = new Set(watchlist.value)
    rows = rows.filter((s) => set.has(s.symbol))
  }
  if (!q) return rows
  return rows.filter((s) =>
    s.symbol.toLowerCase().includes(q) || String(s.name || '').toLowerCase().includes(q)
  )
})

const historyPrices = computed(() => (quote.value?.history || []).map((p) => ({ ts: new Date(p.ts).getTime(), price: Number(p.price || 0) })))

function bucketMs(intervalValue) {
  if (intervalValue === '1m') return 60 * 1000
  if (intervalValue === '5m') return 5 * 60 * 1000
  if (intervalValue === '15m') return 15 * 60 * 1000
  return 60 * 60 * 1000
}

function aggregateBars(prices, intervalValue) {
  if (!prices.length) return []
  const size = bucketMs(intervalValue)
  const map = new Map()
  for (const p of prices) {
    const key = Math.floor(p.ts / size) * size
    const bar = map.get(key)
    if (!bar) {
      map.set(key, { ts: key, open: p.price, high: p.price, low: p.price, close: p.price })
    } else {
      bar.high = Math.max(bar.high, p.price)
      bar.low = Math.min(bar.low, p.price)
      bar.close = p.price
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts)
}

const bars = computed(() => aggregateBars(historyPrices.value, interval.value))
const closes = computed(() => bars.value.map((b) => b.close))
const minVal = computed(() => (closes.value.length ? Math.min(...closes.value) : 0))
const maxVal = computed(() => (closes.value.length ? Math.max(...closes.value) : 0))

const ohlc = computed(() => {
  if (!bars.value.length) return { open: 0, high: 0, low: 0, close: 0 }
  const first = bars.value[0]
  const last = bars.value[bars.value.length - 1]
  return {
    open: first.open,
    high: Math.max(...bars.value.map((b) => b.high)),
    low: Math.min(...bars.value.map((b) => b.low)),
    close: last.close,
  }
})

function toPolyline(values) {
  if (!values.length) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = Math.round((i / Math.max(1, values.length - 1)) * chartW)
      const y = Math.round(chartH - ((v - min) / span) * chartH)
      return `${x},${y}`
    })
    .join(' ')
}

const linePoints = computed(() => toPolyline(closes.value))

function sma(values, period) {
  if (!values.length) return []
  const out = []
  for (let i = 0; i < values.length; i += 1) {
    if (i + 1 < period) out.push(null)
    else {
      let sum = 0
      for (let j = i - period + 1; j <= i; j += 1) sum += values[j]
      out.push(sum / period)
    }
  }
  return out
}

const smaSeries = computed(() => sma(closes.value, 20))
const smaPoints = computed(() => {
  const values = smaSeries.value
  if (!values.length || !values.some((v) => v != null)) return ''
  const min = minVal.value
  const max = maxVal.value
  const span = max - min || 1
  const points = []
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] == null) continue
    const x = Math.round((i / Math.max(1, values.length - 1)) * chartW)
    const y = Math.round(chartH - ((values[i] - min) / span) * chartH)
    points.push(`${x},${y}`)
  }
  return points.join(' ')
})

const chartGridY = computed(() => [0.2, 0.4, 0.6, 0.8].map((v) => Math.round(chartH * v)))

const estimatedCost = computed(() => {
  const qty = Math.max(0, Number(shares.value || 0))
  const px = Number(quote.value?.price || 0)
  return Number((qty * px).toFixed(2))
})

const estimatedProceeds = computed(() => estimatedCost.value)
const canTrade = computed(() => !!(store.player?.user && symbol.value && Number(shares.value) > 0))

function fmtPrice(n, decimals = 2) {
  const d = Number.isInteger(decimals) ? decimals : 2
  const v = Number(n || 0)
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

function fmtTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function signedPercent(v) {
  const n = Number(v || 0)
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function parseSymbolFromDesc(desc) {
  const match = String(desc || '').match(/\b[A-Z]{2,6}\b/)
  return match ? match[0] : '-'
}

function calcPnL(h) {
  return Number((Number(h.value || 0) - Number(h.shares || 0) * Number(h.avgPrice || 0)).toFixed(2))
}

function plClass(h) {
  const v = calcPnL(h)
  return { up: v > 0, down: v < 0 }
}

function isWatched(sym) {
  return watchlist.value.includes(sym)
}

function selectSymbol(sym) {
  symbol.value = sym
}

async function loadList() {
  loading.value = true
  try {
    const { data } = await api.get('/stocks')
    list.value = data || []
    if (!symbol.value && list.value.length) symbol.value = list.value[0].symbol
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load stock list')
  } finally {
    loading.value = false
  }
}

async function loadQuote() {
  if (!symbol.value) return
  const reqId = ++quoteRequestSeq.value
  try {
    const { data } = await api.get(`/stocks/${symbol.value}?range=${range.value}`)
    if (reqId !== quoteRequestSeq.value) return
    quote.value = data || null
  } catch (e) {
    if (reqId !== quoteRequestSeq.value) return
    quote.value = null
    toast.error(e?.response?.data?.error || e?.message || 'Failed to load quote')
  }
}

async function loadPortfolio() {
  try {
    const { data } = await api.get('/stocks/portfolio')
    portfolio.value = data || { money: 0, holdings: [] }
  } catch {
    portfolio.value = { money: 0, holdings: [] }
  }
}

async function loadWatchlist() {
  try {
    const { data } = await api.get('/stocks/watchlist')
    watchlist.value = data?.symbols || []
  } catch {
    watchlist.value = []
  }
}

async function toggleWatch(sym) {
  try {
    if (isWatched(sym)) {
      await api.delete(`/stocks/watchlist/${sym}`)
      watchlist.value = watchlist.value.filter((s) => s !== sym)
    } else {
      await api.post('/stocks/watchlist', { symbol: sym })
      watchlist.value = Array.from(new Set([...watchlist.value, sym]))
    }
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Watchlist update failed')
  }
}

async function loadHistory() {
  try {
    const { data } = await api.get('/stocks/history', { params: { limit: 30, symbol: symbol.value || undefined } })
    history.value = data || { rows: [], total: 0 }
  } catch {
    history.value = { rows: [], total: 0 }
  }
}

async function loadAnalytics() {
  try {
    const { data } = await api.get('/stocks/analytics')
    analytics.value = data || {}
  } catch {
    analytics.value = {}
  }
}

async function doBuy() {
  if (!canTrade.value) return
  busy.value = true
  try {
    const { data } = await api.post('/stocks/buy', {
      symbol: symbol.value,
      shares: Math.max(1, Number(shares.value || 1)),
    })
    store.mergePartial({ money: data?.money })
    toast.ok(`Bought ${symbol.value}`)
    await Promise.all([loadPortfolio(), loadHistory(), loadAnalytics(), loadList(), loadQuote()])
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Buy failed')
  } finally {
    busy.value = false
  }
}

async function doSell() {
  if (!canTrade.value) return
  busy.value = true
  try {
    const { data } = await api.post('/stocks/sell', {
      symbol: symbol.value,
      shares: Math.max(1, Number(shares.value || 1)),
    })
    store.mergePartial({ money: data?.money })
    toast.ok(`Sold ${symbol.value}`)
    await Promise.all([loadPortfolio(), loadHistory(), loadAnalytics(), loadList(), loadQuote()])
  } catch (e) {
    toast.error(e?.response?.data?.error || e?.message || 'Sell failed')
  } finally {
    busy.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadList(), loadWatchlist(), loadPortfolio(), loadHistory(), loadAnalytics(), loadQuote()])
}

onMounted(async () => {
  await ensurePlayer()
  await Promise.all([loadList(), loadWatchlist(), loadPortfolio(), loadAnalytics()])
  await loadQuote()
  await loadHistory()
})

watch([symbol, range], async () => {
  await Promise.all([loadQuote(), loadHistory()])
})
</script>

<style scoped>
.stocks-terminal {
  display: grid;
  gap: var(--space-2);
}

.stocks-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.terminal-grid {
  display: grid;
  gap: var(--space-2);
  grid-template-columns: 300px minmax(0, 1fr) 300px;
  align-items: start;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.terminal-list,
.terminal-history,
.terminal-positions {
  max-height: none;
  overflow: visible;
}

.terminal-left .table-wrap,
.terminal-main .table-wrap,
.terminal-right .table-wrap {
  overflow-x: visible;
}

.terminal-left .tbl,
.terminal-main .tbl,
.terminal-right .tbl {
  table-layout: fixed;
}

.terminal-left .tbl td,
.terminal-left .tbl th {
  padding-left: 6px;
  padding-right: 6px;
}

.terminal-main .tbl td,
.terminal-main .tbl th,
.terminal-right .tbl td,
.terminal-right .tbl th {
  font-size: 12px;
}

.tbl tr {
  cursor: pointer;
}

.tbl tr.active {
  background: var(--accent-muted);
}

.sym {
  font-weight: 700;
}

.sym-name {
  font-size: 11px;
}

.star-btn {
  background: transparent;
  border: 0;
  color: var(--warn);
  padding: 0;
  line-height: 1;
}

.inline-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
}

.chart-wrap {
  position: relative;
  height: 320px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-alt);
}

.chart-wrap svg {
  width: 100%;
  height: 100%;
  display: block;
}

.grid-line {
  stroke: var(--border);
  stroke-width: 1;
  opacity: 0.65;
}

.price-line {
  fill: none;
  stroke: #4ab786;
  stroke-width: 2;
}

.sma-line {
  fill: none;
  stroke: #d0a350;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

.chart-scale {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-top: 4px;
}

.mini-tabs button {
  padding: 4px 8px;
  font-size: 11px;
}

.quick-qty {
  display: flex;
  gap: 6px;
}

@media (max-width: 1400px) {
  .terminal-grid {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .terminal-right {
    grid-column: 1 / -1;
  }
}

@media (max-width: 980px) {
  .terminal-grid {
    grid-template-columns: 1fr;
  }

  .chart-wrap {
    height: 260px;
  }
}
</style>
