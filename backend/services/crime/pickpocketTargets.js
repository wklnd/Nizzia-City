const TARGET_POOLS = {
  downtown: [
    { id: 'office_worker', name: 'Office Worker', stats: { strength: 80, defense: 70, dexterity: 120, speed: 110 }, aggression: 0.1, status: { unfocused: true }, loot: { min: 120, max: 380 } },
    { id: 'tourist', name: 'Distracted Tourist', stats: { strength: 60, defense: 50, dexterity: 90, speed: 85 }, aggression: 0.05, status: { unfocused: true, sleepy: true }, loot: { min: 80, max: 240 } },
    { id: 'commuter', name: 'Rush Commuter', stats: { strength: 95, defense: 90, dexterity: 140, speed: 150 }, aggression: 0.2, status: {}, loot: { min: 150, max: 420 } },
  ],
  nightlife: [
    { id: 'clubgoer', name: 'Club Goer', stats: { strength: 85, defense: 75, dexterity: 95, speed: 100 }, aggression: 0.15, status: { drunk: true }, loot: { min: 180, max: 520 } },
    { id: 'bartender', name: 'Bartender', stats: { strength: 100, defense: 95, dexterity: 120, speed: 110 }, aggression: 0.25, status: {}, loot: { min: 160, max: 480 } },
    { id: 'tipsy_gambler', name: 'Tipsy Gambler', stats: { strength: 70, defense: 60, dexterity: 80, speed: 75 }, aggression: 0.12, status: { drunk: true, unfocused: true }, loot: { min: 220, max: 650 } },
  ],
  market: [
    { id: 'street_vendor', name: 'Street Vendor', stats: { strength: 75, defense: 70, dexterity: 100, speed: 90 }, aggression: 0.16, status: {}, loot: { min: 100, max: 300 } },
    { id: 'wealthy_shopper', name: 'Wealthy Shopper', stats: { strength: 90, defense: 100, dexterity: 115, speed: 95 }, aggression: 0.2, status: { unfocused: true }, loot: { min: 260, max: 760 } },
    { id: 'plainclothes_cop', name: 'Plainclothes Cop', stats: { strength: 140, defense: 135, dexterity: 150, speed: 140 }, aggression: 0.6, status: {}, isPolice: true, loot: { min: 60, max: 140 } },
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTargetsForLocation(locationId) {
  return TARGET_POOLS[String(locationId)] || [];
}

function rollTarget(locationId) {
  const pool = getTargetsForLocation(locationId);
  if (!pool.length) return null;
  return pickRandom(pool);
}

module.exports = {
  TARGET_POOLS,
  getTargetsForLocation,
  rollTarget,
};
