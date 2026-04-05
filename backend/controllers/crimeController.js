const Player = require('../models/Player');
const Item = require('../models/Item');
const { CRIMES: SEARCH_FOR_CASH_CRIMES, LOCATION: SEARCH_FOR_CASH_LOCATIONS } = require('../config/crimes/searchForCash');
const { CRIMES: PICKPOCKET_CRIMES, LOCATION: PICKPOCKET_LOCATIONS } = require('../config/crimes/pickpocket.json');
const { executePickpocket } = require('../services/crime/pickpocket');
const { getTargetsForLocation } = require('../services/crime/pickpocketTargets');

const CRIMES = { ...SEARCH_FOR_CASH_CRIMES, ...PICKPOCKET_CRIMES };
const LOCATION = { ...SEARCH_FOR_CASH_LOCATIONS, ...PICKPOCKET_LOCATIONS };

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function findLocationById(id) {
	const entries = Object.values(LOCATION || {})
	return entries.find(l => l.id === id || l.id === String(id)) || null
}

async function resolvePlayer(userId) {
	if (!userId) return null
	return Player.findOne({ user: userId })
}

function getTimeBucket() {
	const hour = new Date().getHours()
	return hour >= 6 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night'
}

function getPopularity(loc) {
	const popTable = loc?.PopularityAt || {}
	const bucket = getTimeBucket()
	const popPerc = Number(popTable[bucket] || 50)
	return Math.max(0, Math.min(1, popPerc / 100))
}

function getCrimeById(crimeId) {
	return CRIMES[String(crimeId)] || null
}

function getCrimeLocations(crime) {
	const allowedIds = Array.isArray(crime?.location) ? crime.location : [crime?.location].filter(Boolean)
	return allowedIds
		.map((id) => findLocationById(id))
		.filter(Boolean)
}

function awardItemToPlayer(player, itemDoc) {
	player.inventory = player.inventory || []
	const idx = player.inventory.findIndex((e) => String(e.item) === String(itemDoc._id))
	if (idx >= 0) player.inventory[idx].qty = Number(player.inventory[idx].qty || 0) + 1
	else player.inventory.push({ item: itemDoc._id, qty: 1 })
}

function applyJailIfNeeded(player, loc) {
	const jailChance = Number(loc?.jailChance || 0)
	const jailTimeSeconds = Math.max(0, Number(loc?.jailTimeSeconds || 0))
	if (jailChance <= 0 || jailTimeSeconds <= 0) return { triggered: false, seconds: 0 }
	const triggered = Math.random() * 100 < jailChance
	if (triggered) {
		player.jailed = true
		player.jailTime = jailTimeSeconds
	}
	return { triggered, seconds: triggered ? jailTimeSeconds : 0 }
}

// POST /api/crime/search-for-cash { locationId }
async function searchForCash(req, res) {
	try {
		const userId = req.authUserId
		const { locationId } = req.body || {}
		const player = await resolvePlayer(userId)
		if (!player) return res.status(404).json({ error: 'Player not found' })

		// Use config for this crime
		const crime = CRIMES.search_for_cash
		const allowedLocs = Array.isArray(crime.location) ? crime.location : [crime.location].filter(Boolean)
		const nerveCost = Number(crime.nerveCost || 1)
		const nerve = Number(player.nerveStats?.nerve || 0)
		if (nerve < nerveCost) return res.status(400).json({ error: 'Not enough nerve' })

		// Resolve location: require selection and validate against config list
		if (!locationId) return res.status(400).json({ error: 'locationId is required' })
		if (allowedLocs.length && !allowedLocs.includes(locationId)) return res.status(400).json({ error: 'Invalid location for this crime' })
		const locId = locationId
		const loc = findLocationById(locId)
		if (!loc) return res.status(400).json({ error: 'Invalid location' })

			// No cooldown enforcement for crimes

			// Determine outcome from location-specific chances, adjusted by popularity
			const popularity = getPopularity(loc)
			const critBase = Number(loc.CriticalFailChance || 0)
			const minorBase = Number(loc.MinorFailChance || 0)
			// Reduce fail chances up to 50% at max popularity
			const failFactor = 1 - 0.5 * popularity
			const critChance = Math.max(0, critBase * failFactor)
			const minorChance = Math.max(0, minorBase * failFactor)
			const rollOutcome = Math.random() * 100
			let outcome = 'success'
			if (rollOutcome < critChance) outcome = 'critical_fail'
			else if (rollOutcome < (critChance + minorChance)) outcome = 'minor_fail'

			const awarded = { money: 0, items: [] }
			const warnings = []
				if (outcome === 'success') {
				// Roll loot: independent chances per entry; aggregate
						for (const entry of (loc.loot || [])) {
							// Boost loot chances based on popularity (0.5x .. 1.5x)
							const base = Number(entry.chance || 0)
							const lootFactor = 0.5 + popularity // 0.5..1.5
							const effChance = Math.max(0, Math.min(100, base * lootFactor))
							const roll = Math.random() * 100
							if (roll <= effChance) {
						if (entry.type === 'money') {
							const min = Math.max(0, Number(entry.min || 0))
							const max = Math.max(min, Number(entry.max || min))
							const amt = randInt(min, max)
							awarded.money += amt
						} else if (entry.type === 'item') {
							const itemId = String(entry.value)
							if (itemId === '0') continue
							const doc = await Item.findOne({ id: itemId })
							if (doc) {
								awardItemToPlayer(player, doc)
								awarded.items.push(itemId)
							} else {
								warnings.push(`Item ${itemId} not found`)
							}
						}
					}
				}
			}

		// Apply gains and costs
				if (outcome === 'success') {
				player.$locals._txMeta = { type: 'crime', description: `Crime payout` };
				player.money = Number((Number(player.money || 0) + Number(awarded.money || 0)).toFixed(2))
			}
		if (player.nerveStats) player.nerveStats.nerve = Math.max(0, Number(nerve - nerveCost))

				// No cooldown recorded

			// Update counters and XP
			player.crimesCommitted = Number(player.crimesCommitted || 0) + 1
			let xpGained = 0
			if (outcome === 'success') {
				player.crimesSuccessful = Number(player.crimesSuccessful || 0) + 1
					// XP reward on success
					xpGained = Number(crime.expPerSuccess || 5)
				player.crimeExp = Number(player.crimeExp || 0) + xpGained
				player.exp = Number(player.exp || 0) + xpGained
				// Track per-crime XP
				const cid = CRIMES.search_for_cash.id
				if (!player.crimesXpList) player.crimesXpList = []
				const rec = player.crimesXpList.find((r) => r.crimeId === cid)
				if (rec) rec.exp = Number(rec.exp || 0) + xpGained
				else player.crimesXpList.push({ crimeId: cid, exp: xpGained })
			} else if (outcome === 'minor_fail') {
				player.crimesFails = Number(player.crimesFails || 0) + 1
					const failXp = Number(crime.expPerFail || 0)
					if (failXp > 0) { player.crimeExp = Number(player.crimeExp || 0) + failXp; player.exp = Number(player.exp || 0) + failXp }
			} else if (outcome === 'critical_fail') {
				player.crimesCriticalFails = Number(player.crimesCriticalFails || 0) + 1
					const failXp = Number(crime.expPerFail || 0)
					if (failXp > 0) { player.crimeExp = Number(player.crimeExp || 0) + failXp; player.exp = Number(player.exp || 0) + failXp }
					// Apply critical fail event if configured (e.g., injury)
					const ev = loc.CriticalFailEvent || null
					if (ev && ev.type === 'injury') {
						const current = Number(player.health || 0)
						const damage = Math.max(1, Math.floor(current * 0.2)) // 20% current HP
						player.health = Math.max(0, current - damage)
					}
			}

			const jail = outcome === 'critical_fail' ? applyJailIfNeeded(player, loc) : { triggered: false, seconds: 0 }

		await player.save()

				const response = {
				ok: true,
				location: loc.id,
				awarded,
				warnings,
				narration: loc?.narration?.[outcome] || '',
				jail,
					outcome,
					xpGained,
				money: player.money,
				nerve: player.nerveStats?.nerve || 0,
				jailed: !!player.jailed,
				jailTime: Number(player.jailTime || 0),
			}
		return res.json(response)
	} catch (e) {
		return res.status(500).json({ error: e.message })
	}
}

// POST /api/crime/pickpocket { locationId }
async function pickpocket(req, res) {
	try {
		const userId = req.authUserId
		const { locationId } = req.body || {}
		const player = await resolvePlayer(userId)
		if (!player) return res.status(404).json({ error: 'Player not found' })

		const crime = CRIMES.pickpocket
		if (!crime) return res.status(500).json({ error: 'Pickpocket crime is not configured' })
		const allowedLocs = Array.isArray(crime.location) ? crime.location : [crime.location].filter(Boolean)
		if (!locationId) return res.status(400).json({ error: 'locationId is required' })
		if (allowedLocs.length && !allowedLocs.includes(locationId)) return res.status(400).json({ error: 'Invalid location for this crime' })

		const loc = findLocationById(locationId)
		if (!loc) return res.status(400).json({ error: 'Invalid location' })

		const nerveCost = Number(crime.nerveCost || 1)
		const nerve = Number(player.nerveStats?.nerve || 0)
		if (nerve < nerveCost) return res.status(400).json({ error: 'Not enough nerve' })

		const result = await executePickpocket({ player, crime, loc })
		if (!result.ok) return res.status(400).json({ error: result.error || 'Pickpocket failed' })

		if (player.nerveStats) player.nerveStats.nerve = Math.max(0, nerve - nerveCost)
		player.crimesCommitted = Number(player.crimesCommitted || 0) + 1
		const awardedItems = []
		const warnings = [...(result.warnings || [])]

		let xpGained = 0
		if (result.outcome === 'success') {
			xpGained = Number(crime.expPerSuccess || 0)
			player.crimesSuccessful = Number(player.crimesSuccessful || 0) + 1
			if (result.money > 0) {
				player.$locals._txMeta = { type: 'crime', description: 'Pickpocket payout' }
				player.money = Number((Number(player.money || 0) + Number(result.money || 0)).toFixed(2))
			}
			for (const itemId of (result.items || [])) {
				const doc = await Item.findOne({ id: String(itemId) })
				if (!doc) {
					warnings.push(`Item ${itemId} not found`)
					continue
				}
				awardItemToPlayer(player, doc)
				awardedItems.push(String(itemId))
			}
		} else if (result.outcome === 'minor_fail') {
			xpGained = Number(crime.expPerFail || 0)
			player.crimesFails = Number(player.crimesFails || 0) + 1
		} else {
			xpGained = Number(crime.expPerFail || 0)
			player.crimesCriticalFails = Number(player.crimesCriticalFails || 0) + 1
			const dmg = Math.max(1, Number(result?.detail?.caughtDamage || 1))
			player.health = Math.max(0, Number(player.health || 0) - dmg)
			if (result.jail?.triggered) {
				player.jailed = true
				player.jailTime = Number(result.jail.seconds || 0)
			}
		}

		if (xpGained > 0) {
			player.crimeExp = Number(player.crimeExp || 0) + xpGained
			player.exp = Number(player.exp || 0) + xpGained
		}

		const cid = crime.id
		if (!player.crimesXpList) player.crimesXpList = []
		const rec = player.crimesXpList.find((r) => r.crimeId === cid)
		if (rec) rec.exp = Number(rec.exp || 0) + xpGained
		else player.crimesXpList.push({ crimeId: cid, exp: xpGained })

		await player.save()

		return res.json({
			ok: true,
			location: loc.id,
			target: result.target,
			chance: result.chance,
			awarded: { money: result.money, items: awardedItems },
			warnings,
			narration: result.narration,
			jail: result.jail,
			outcome: result.outcome,
			xpGained,
			money: player.money,
			nerve: player.nerveStats?.nerve || 0,
			jailed: !!player.jailed,
			jailTime: Number(player.jailTime || 0),
		})
	} catch (e) {
		return res.status(500).json({ error: e.message })
	}
}

async function getPickpocketTargets(req, res) {
	try {
		const locationId = String(req.query.locationId || '')
		if (!locationId) return res.status(400).json({ error: 'locationId is required' })
		const list = getTargetsForLocation(locationId).map((t) => ({
			id: t.id,
			name: t.name,
			risk: t.isPolice ? 'high' : (Number(t.aggression || 0) >= 0.25 ? 'medium' : 'low'),
			isPolice: !!t.isPolice,
		}))
		return res.json({ targets: list })
	} catch (e) {
		return res.status(500).json({ error: e.message })
	}
}

		async function getLocations(req, res) {
			try {
				const crimeId = String(req.query.crimeId || 'search_for_cash')
				const crime = getCrimeById(crimeId)
				if (!crime) return res.status(404).json({ error: 'Crime not found' })
				const list = getCrimeLocations(crime)
					.filter(Boolean)
					.map((l) => {
						const popularity = getPopularity(l)
						return { id: l.id, name: l.name, popularity, crimeId }
					})
				res.json({ locations: list })
			} catch (e) {
				res.status(500).json({ error: e.message })
			}
		}

		module.exports = { searchForCash, pickpocket, getPickpocketTargets, getLocations }
