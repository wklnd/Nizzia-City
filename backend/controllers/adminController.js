const Player      = require('../models/Player');
const Item        = require('../models/Item');
const BankAccount = require('../models/Bank');
const Cartel      = require('../models/Cartel');
const StockPrice  = require('../models/StockPrice');
const StockEvent  = require('../models/StockEvent');
const mongoose    = require('mongoose');

const stocksCfg      = require('../config/stocks');
const playerTitles   = require('../config/playerTitles');
const { REP_LEVELS } = require('../config/cartel');

const { getLatestPrice }           = require('../services/stockService');
const { calculatePayout }          = require('../services/bankService');
const { getRepLevel, getRepInfo }  = require('../services/cartel/cartelService');

//  Shared helpers

async function getAdminPlayerFromReq(req) {
  const userId = req.authUserId;
  if (!userId) throw new Error('Unauthorized');

  // Support legacy token subjects and mixed id formats.
  let admin = await Player.findOne({ user: userId });
  if (!admin && mongoose.Types.ObjectId.isValid(String(userId))) {
    admin = await Player.findById(String(userId));
  }
  if (!admin) {
    const numericId = Number(userId);
    if (Number.isFinite(numericId)) admin = await Player.findOne({ id: numericId });
  }

  if (!admin) throw new Error('Unauthorized');

  const role = String(admin.playerRole || '').toLowerCase();
  if (!['admin', 'developer'].includes(role)) throw new Error('Forbidden');
  return admin;
}

async function requirePlayer(targetUserId) {
  const player = await Player.findOne({ user: targetUserId });
  if (!player) throw new Error('Target player not found');
  return player;
}

// Wraps a controller fn, handling the standard auth/not-found/500 error cases.
function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err.message === 'Unauthorized')           return res.status(401).json({ error: 'Unauthorized' });
      if (err.message === 'Forbidden')              return res.status(403).json({ error: 'Not authorized' });
      if (err.message.includes('not found'))        return res.status(404).json({ error: err.message });
      if (err.message.includes('does not own'))     return res.status(404).json({ error: err.message });
      console.error(`ADMIN error [${fn.name}]:`, err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

//  Item lookup (by Mongo _id or custom string id) 

async function findItem(itemId) {
  if (mongoose.Types.ObjectId.isValid(itemId)) {
    const found = await Item.findById(itemId);
    if (found) return found;
  }
  return Item.findOne({ id: String(itemId) });
}

//  Controllers 

// PATCH /api/admin/currency
// Body: { targetUserId, moneyDelta?, pointsDelta?, meritsDelta?, xmasCoinsDelta?, halloweenCoinsDelta?, easterCoinsDelta? }
const adjustCurrency = handle(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  for (const f of ['money', 'points', 'merits', 'xmasCoins', 'halloweenCoins', 'easterCoins']) {
    const delta = req.body[f + 'Delta'];
    if (typeof delta !== 'undefined') player[f] = Number(player[f] || 0) + Number(delta || 0);
  }
  await player.save();
  const { money, points, merits, xmasCoins, halloweenCoins, easterCoins } = player;
  return res.json({ money, points, merits, xmasCoins, halloweenCoins, easterCoins });
});

// PATCH /api/admin/xp
// Body: { targetUserId, expDelta }
const adjustExp = handle(async (req, res) => {
  const { targetUserId, expDelta } = req.body;
  if (!targetUserId || typeof expDelta === 'undefined') return res.status(400).json({ error: 'targetUserId and expDelta are required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  player.exp = Number(player.exp || 0) + Number(expDelta || 0);
  await player.save();
  return res.json({ exp: player.exp });
});

// PATCH /api/admin/level
// Body: { targetUserId, level }
const setLevel = handle(async (req, res) => {
  const { targetUserId, level } = req.body;
  if (!targetUserId || !Number.isFinite(Number(level))) return res.status(400).json({ error: 'targetUserId and level are required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  player.level = Math.max(1, Math.floor(Number(level)));
  await player.save();
  return res.json({ level: player.level });
});

// PATCH /api/admin/resources
// Body: { targetUserId, energyDelta?, nerveDelta?, happyDelta? }
const adjustResources = handle(async (req, res) => {
  const { targetUserId, energyDelta = 0, nerveDelta = 0, happyDelta = 0 } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);

  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  if (energyDelta) {
    const s = player.energyStats;
    s.energy = clamp((s.energy ?? 0) + Number(energyDelta), s.energyMin ?? 0, s.energyMax ?? 0);
  }
  if (nerveDelta) {
    const s = player.nerveStats;
    s.nerve = clamp((s.nerve ?? 0) + Number(nerveDelta), s.nerveMin ?? 0, s.nerveMax ?? 0);
  }
  if (happyDelta) {
    const s = player.happiness;
    s.happy = clamp((s.happy ?? 0) + Number(happyDelta), s.happyMin ?? 0, s.happyMax ?? 0);
  }
  await player.save();
  return res.json({ energy: player.energyStats.energy, nerve: player.nerveStats.nerve, happy: player.happiness.happy });
});

// PATCH /api/admin/stats/battle
// Body: { targetUserId, strength?, speed?, dexterity?, defense? }
const setBattleStats = handle(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  for (const k of ['strength', 'speed', 'dexterity', 'defense']) {
    if (typeof req.body[k] !== 'undefined') {
      const v = Number(req.body[k]);
      if (Number.isFinite(v)) player.battleStats[k] = Math.max(0, v);
    }
  }
  await player.save();
  return res.json({ battleStats: player.battleStats });
});

// PATCH /api/admin/stats/work
// Body: { targetUserId, manuallabor?, intelligence?, endurance?, employeEfficiency? }
const setWorkStats = handle(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  for (const k of ['manuallabor', 'intelligence', 'endurance', 'employeEfficiency']) {
    if (typeof req.body[k] !== 'undefined') {
      const v = Number(req.body[k]);
      if (Number.isFinite(v)) player.workStats[k] = Math.max(0, v);
    }
  }
  await player.save();
  return res.json({ workStats: player.workStats });
});

// PATCH /api/admin/player/name
// Body: { targetUserId, name }
const setPlayerName = handle(async (req, res) => {
  const { targetUserId, name } = req.body;
  if (!targetUserId || !name) return res.status(400).json({ error: 'targetUserId and name are required' });
  await getAdminPlayerFromReq(req);
  const trimmed = String(name).trim();
  if (trimmed.length < 3 || trimmed.length > 32) return res.status(400).json({ error: 'Name must be 3-32 characters' });
  const player = await requirePlayer(targetUserId);
  player.name = trimmed;
  await player.save();
  return res.json({ name: player.name });
});

// PATCH /api/admin/player/status
// Body: { targetUserId, status }
const ALLOWED_STATUSES = ['Active', 'Banned', 'Suspended', 'Abandoned'];
const setPlayerStatus = handle(async (req, res) => {
  const { targetUserId, status } = req.body;
  if (!targetUserId || !status) return res.status(400).json({ error: 'targetUserId and status are required' });
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  player.playerStatus = status;
  await player.save();
  return res.json({ playerStatus: player.playerStatus });
});

// PATCH /api/admin/player/title
// Body: { targetUserId, title }
const setPlayerTitle = handle(async (req, res) => {
  const { targetUserId, title } = req.body;
  if (!targetUserId || !title) return res.status(400).json({ error: 'targetUserId and title are required' });
  if (!playerTitles.includes(title)) return res.status(400).json({ error: 'Invalid title' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  player.playerTitle = title;
  await player.save();
  return res.json({ playerTitle: player.playerTitle });
});

// PATCH /api/admin/player/role
// Body: { targetUserId, role }
const ALLOWED_ROLES = ['Player', 'Moderator', 'Admin', 'Developer'];
const setPlayerRole = handle(async (req, res) => {
  const { targetUserId, role } = req.body;
  if (!targetUserId || !role) return res.status(400).json({ error: 'targetUserId and role are required' });
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const admin = await getAdminPlayerFromReq(req);
  if (role === 'Developer' && admin.playerRole !== 'Developer') return res.status(403).json({ error: 'Only Developers can assign Developer role' });
  const player = await requirePlayer(targetUserId);
  if (player.playerRole === 'Developer' && admin.playerRole !== 'Developer') return res.status(403).json({ error: 'Cannot modify Developer role' });
  player.playerRole = role;
  await player.save();
  return res.json({ playerRole: player.playerRole });
});

// GET /api/admin/player/titles
const listPlayerTitles = handle(async (_req, res) => {
  return res.json({ titles: playerTitles });
});

// PATCH /api/admin/player/addiction
// Body: { targetUserId, value }
const setAddiction = handle(async (req, res) => {
  const { targetUserId, value } = req.body;
  if (!targetUserId || typeof value === 'undefined') return res.status(400).json({ error: 'targetUserId and value are required' });
  await getAdminPlayerFromReq(req);
  const v = Math.max(0, Math.min(99999, Number(value)));
  const player = await Player.findOneAndUpdate({ user: targetUserId }, { $set: { addiction: v } }, { new: true }).lean();
  if (!player) throw new Error('Target player not found');
  return res.json({ addiction: player.addiction ?? v });
});

// POST /api/admin/inventory/add
// Body: { targetUserId, itemId, qty? }
const inventoryAdd = handle(async (req, res) => {
  const { targetUserId, itemId, qty } = req.body;
  if (!targetUserId || !itemId) return res.status(400).json({ error: 'targetUserId and itemId are required' });
  await getAdminPlayerFromReq(req);
  const [player, item] = await Promise.all([requirePlayer(targetUserId), findItem(itemId)]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const quantity = Math.max(1, Number(qty || 1));
  const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
  if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + quantity;
  else player.inventory.push({ item: item._id, qty: quantity });
  await player.save();
  return res.json({ inventory: player.inventory });
});

// POST /api/admin/inventory/remove
// Body: { targetUserId, itemId, qty? }
const inventoryRemove = handle(async (req, res) => {
  const { targetUserId, itemId, qty } = req.body;
  if (!targetUserId || !itemId) return res.status(400).json({ error: 'targetUserId and itemId are required' });
  await getAdminPlayerFromReq(req);
  const [player, item] = await Promise.all([requirePlayer(targetUserId), findItem(itemId)]);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  const quantity = Math.max(1, Number(qty || 1));
  const idx = (player.inventory || []).findIndex(e => String(e.item) === String(item._id));
  if (idx < 0) return res.status(404).json({ error: 'Item not in inventory' });
  player.inventory[idx].qty = Math.max(0, Number(player.inventory[idx].qty || 0) - quantity);
  if (player.inventory[idx].qty <= 0) player.inventory.splice(idx, 1);
  await player.save();
  return res.json({ inventory: player.inventory });
});

// POST /api/admin/stocks/add
// Body: { targetUserId, symbol, shares?, avgPrice? }
const stocksAdd = handle(async (req, res) => {
  const { targetUserId } = req.body;
  const sym = (req.body.symbol || '').toUpperCase();
  if (!targetUserId || !sym) return res.status(400).json({ error: 'targetUserId and symbol are required' });
  if (!stocksCfg[sym]) return res.status(400).json({ error: 'Unknown symbol' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  const qty = Math.max(1, Number(req.body.shares || 0));
  const avgPrice = req.body.avgPrice ? Number(req.body.avgPrice) : Number((await getLatestPrice(sym)).price || 0);
  const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
  if (idx >= 0) {
    const h = player.portfolio[idx];
    const newShares = Number(h.shares || 0) + qty;
    h.avgPrice = newShares > 0 ? Number(((h.avgPrice * h.shares + avgPrice * qty) / newShares).toFixed(4)) : avgPrice;
    h.shares = newShares;
  } else {
    player.portfolio.push({ symbol: sym, shares: qty, avgPrice });
  }
  await player.save();
  return res.json({ portfolio: player.portfolio });
});

// POST /api/admin/stocks/remove
// Body: { targetUserId, symbol, shares }
const stocksRemove = handle(async (req, res) => {
  const { targetUserId } = req.body;
  const sym = (req.body.symbol || '').toUpperCase();
  if (!targetUserId || !sym) return res.status(400).json({ error: 'targetUserId and symbol are required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  const qty = Math.max(1, Number(req.body.shares || 0));
  const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
  if (idx < 0) return res.status(404).json({ error: 'No holdings for this symbol' });
  player.portfolio[idx].shares = Number((Number(player.portfolio[idx].shares || 0) - qty).toFixed(8));
  if (player.portfolio[idx].shares <= 0) player.portfolio.splice(idx, 1);
  await player.save();
  return res.json({ portfolio: player.portfolio });
});

// POST /api/admin/stocks/crash
// Body: { symbol? }
const stocksCrash = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const onlySymbol = (req.body?.symbol || '').toUpperCase();
  const symbols = onlySymbol && stocksCfg[onlySymbol] ? [onlySymbol] : Object.keys(stocksCfg);
  const results = [];
  for (const s of symbols) {
    const last = await getLatestPrice(s);
    const decimals = Number.isInteger(stocksCfg[s].decimals) ? stocksCfg[s].decimals : 2;
    const pct = 0.4 + Math.random() * 0.5;
    const newPrice = Math.max(Math.pow(10, -decimals), Number((last.price * (1 - pct)).toFixed(decimals)));
    await StockPrice.create({ symbol: s, price: newPrice, ts: new Date() });
    await StockEvent.create({ symbol: s, type: 'crash', baselinePrice: last.price });
    results.push({ symbol: s, from: last.price, to: newPrice, changePct: Number((-(pct * 100)).toFixed(2)) });
  }
  return res.json({ results });
});

// POST /api/admin/stocks/rocket
// Body: { symbol? }
const stocksRocket = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const onlySymbol = (req.body?.symbol || '').toUpperCase();
  const symbols = onlySymbol && stocksCfg[onlySymbol] ? [onlySymbol] : Object.keys(stocksCfg);
  const results = [];
  for (const s of symbols) {
    const last = await getLatestPrice(s);
    const decimals = Number.isInteger(stocksCfg[s].decimals) ? stocksCfg[s].decimals : 2;
    const pct = 0.4 + Math.random() * 0.9;
    const newPrice = Math.max(Math.pow(10, -decimals), Number((last.price * (1 + pct)).toFixed(decimals)));
    await StockPrice.create({ symbol: s, price: newPrice, ts: new Date() });
    results.push({ symbol: s, from: last.price, to: newPrice, changePct: Number((pct * 100).toFixed(2)) });
  }
  return res.json({ results });
});

// POST /api/admin/bank/force-withdraw
// Body: { targetUserId, accountId }
const bankForceWithdraw = handle(async (req, res) => {
  const { targetUserId, accountId } = req.body;
  if (!targetUserId || !accountId) return res.status(400).json({ error: 'targetUserId and accountId are required' });
  await getAdminPlayerFromReq(req);
  const player = await requirePlayer(targetUserId);
  const acct = await BankAccount.findOne({ _id: accountId, player: player._id });
  if (!acct) return res.status(404).json({ error: 'Account not found' });
  if (acct.isWithdrawn) return res.status(400).json({ error: 'Already withdrawn' });
  const { total, interest } = calculatePayout(acct.depositedAmount, acct.interestRate, acct.period);
  acct.isWithdrawn = true;
  await acct.save();
  player.money = Number(((player.money || 0) + total).toFixed(2));
  await player.save();
  return res.json({ money: player.money, payout: { principal: acct.depositedAmount, interest, total }, account: acct.toObject() });
});

// GET /api/admin/players/search?q=...&limit=20
const searchPlayers = handle(async (req, res) => {
  const { q, limit } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });
  await getAdminPlayerFromReq(req);
  const query = q.trim();
  const or = [{ name: { $regex: query, $options: 'i' } }];
  const n = Number(query);
  if (Number.isFinite(n)) or.push({ id: n });
  if (mongoose.Types.ObjectId.isValid(query)) { or.push({ user: query }); or.push({ _id: query }); }
  const max = Math.min(50, Math.max(1, Number(limit || 20)));
  const players = await Player.find({ $or: or }).sort({ id: 1 }).limit(max)
    .select({ name: 1, id: 1, user: 1, npc: 1, playerRole: 1 }).lean();
  return res.json({ results: players.map(p => ({
    playerId: String(p._id), userId: String(p.user), id: p.id, name: p.name, npc: !!p.npc, role: p.playerRole,
  })) });
});

// POST /api/admin/general/energy-max
// Body: { includeNPC? }
const setAllEnergyToMax = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const includeNPC = req.body?.includeNPC === true || String(req.body?.includeNPC).toLowerCase() === 'true';
  const result = await Player.updateMany(
    includeNPC ? {} : { npc: { $ne: true } },
    [{ $set: { 'energyStats.energy': '$energyStats.energyMax' } }]
  );
  return res.json({ matched: result.matchedCount ?? result.n ?? 0, modified: result.modifiedCount ?? result.nModified ?? 0 });
});

// POST /api/admin/general/give-money
// Body: { amount, includeNPC? }
const giveMoneyToAll = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount)) return res.status(400).json({ error: 'amount is required' });
  const includeNPC = req.body?.includeNPC === true || String(req.body?.includeNPC).toLowerCase() === 'true';
  const result = await Player.updateMany(
    includeNPC ? {} : { npc: { $ne: true } },
    { $inc: { money: amount } }
  );
  return res.json({ matched: result.matchedCount ?? result.n ?? 0, modified: result.modifiedCount ?? result.nModified ?? 0, amountApplied: amount });
});

// GET /api/admin/player/cooldowns/:userId
const getPlayerCooldowns = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const player = await Player.findOne({ user: req.params.userId }).lean();
  if (!player) throw new Error('Target player not found');
  const cd = player.cooldowns || {};
  return res.json({ cooldowns: {
    drugCooldown:     Number(cd.drugCooldown || 0),
    medicalCooldown:  Number(cd.medicalCooldown || 0),
    boosterCooldown:  Number(cd.boosterCooldown || 0),
    alcoholCooldown:  Number(cd.alcoholCooldown || 0),
    drugs: Object.fromEntries(Object.entries(cd.drugs || {}).map(([k, v]) => [k, Number(v || 0)])),
  }});
});

// POST /api/admin/player/cooldowns/set
// Body: { targetUserId, category, seconds }
const COOLDOWN_PATHS = {
  drug:     'cooldowns.drugCooldown',
  medical:  'cooldowns.medicalCooldown',
  booster:  'cooldowns.boosterCooldown',
  alcohol:  'cooldowns.alcoholCooldown',
};
const setPlayerCooldown = handle(async (req, res) => {
  const { targetUserId, category } = req.body;
  if (!targetUserId || !category) return res.status(400).json({ error: 'targetUserId and category are required' });
  const path = COOLDOWN_PATHS[category];
  if (!path) return res.status(400).json({ error: 'Invalid category' });
  await getAdminPlayerFromReq(req);
  const seconds = Math.max(0, Number(req.body.seconds || 0));
  const player = await Player.findOneAndUpdate({ user: targetUserId }, { $set: { [path]: seconds } }, { new: true }).lean();
  if (!player) throw new Error('Target player not found');
  return res.json({ ok: true, [category + 'Cooldown']: seconds });
});

// POST /api/admin/player/cooldowns/clear
// Body: { targetUserId, scope? }
const clearPlayerCooldown = handle(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const scope = req.body.scope || 'all';
  const update = {};
  if (scope === 'all' || scope === 'drug')     update['cooldowns.drugCooldown'] = 0;
  if (scope === 'all' || scope === 'medical')  update['cooldowns.medicalCooldown'] = 0;
  if (scope === 'all' || scope === 'booster')  update['cooldowns.boosterCooldown'] = 0;
  if (scope === 'all' || scope === 'alcohol')  update['cooldowns.alcoholCooldown'] = 0;
  if (scope === 'all' || scope === 'perDrug')  update['cooldowns.drugs'] = {};
  const player = await Player.findOneAndUpdate({ user: targetUserId }, { $set: update }, { new: true }).lean();
  if (!player) throw new Error('Target player not found');
  return res.json({ ok: true, cleared: scope });
});

// POST /api/admin/cooldowns/reset-all
// Body: { includeNPC? }
const resetAllCooldowns = handle(async (req, res) => {
  await getAdminPlayerFromReq(req);
  const includeNPC = req.body?.includeNPC === true || String(req.body?.includeNPC).toLowerCase() === 'true';
  const result = await Player.updateMany(
    includeNPC ? {} : { npc: { $ne: true } },
    { $set: { 'cooldowns.medicalCooldown': 0, 'cooldowns.drugCooldown': 0, 'cooldowns.boosterCooldown': 0, 'cooldowns.alcoholCooldown': 0, 'cooldowns.drugs': {} } }
  );
  return res.json({ matched: result.matchedCount ?? result.n ?? 0, modified: result.modifiedCount ?? result.nModified ?? 0 });
});

// PATCH /api/admin/cartel/rep
// Body: { targetUserId, reputation?, repLevel? }
const setCartelRep = handle(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: 'targetUserId is required' });
  await getAdminPlayerFromReq(req);
  const cartel = await Cartel.findOne({ ownerId: targetUserId });
  if (!cartel) throw new Error('Target player does not own a cartel');
  let newRep = cartel.reputation;
  if (typeof req.body.repLevel !== 'undefined') {
    const lvl = Math.max(0, Math.min(REP_LEVELS.length - 1, Number(req.body.repLevel)));
    newRep = REP_LEVELS[lvl].xpRequired;
  }
  if (typeof req.body.reputation !== 'undefined') newRep = Math.max(0, Number(req.body.reputation));
  cartel.reputation = Number.isFinite(newRep) ? newRep : cartel.reputation;
  cartel.repLevel = getRepLevel(cartel.reputation);
  await cartel.save();
  const info = getRepInfo(cartel.reputation);
  return res.json({ cartelName: cartel.name, reputation: cartel.reputation, repLevel: cartel.repLevel, rankName: info.name });
});

// POST /api/admin/database/purge
// Body: { confirm: "DROP" }
const purgeDatabase = handle(async (req, res) => {
  const admin = await getAdminPlayerFromReq(req);
  if (admin.playerRole !== 'Developer') return res.status(403).json({ error: 'Only Developers can purge database' });
  if (String(req.body?.confirm || '') !== 'DROP') return res.status(400).json({ error: 'Confirmation required: set confirm to "DROP"' });
  const conn = mongoose.connection;
  if (!conn?.db) return res.status(500).json({ error: 'No DB connection' });
  const dbName = conn.db.databaseName;
  await conn.dropDatabase();
  return res.json({ ok: true, dropped: dbName });
});

//  Exports 

module.exports = {
  adjustCurrency,
  adjustExp,
  setLevel,
  adjustResources,
  setBattleStats,
  setWorkStats,
  setPlayerName,
  setPlayerStatus,
  setPlayerTitle,
  setPlayerRole,
  listPlayerTitles,
  setAddiction,
  inventoryAdd,
  inventoryRemove,
  stocksAdd,
  stocksRemove,
  stocksCrash,
  stocksRocket,
  bankForceWithdraw,
  searchPlayers,
  setAllEnergyToMax,
  giveMoneyToAll,
  getPlayerCooldowns,
  setPlayerCooldown,
  clearPlayerCooldown,
  resetAllCooldowns,
  setCartelRep,
  purgeDatabase,
};