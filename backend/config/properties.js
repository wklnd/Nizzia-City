// Property catalog and upgrade data are stored in JSON files under backend/data/properties.
const PROPERTIES = require('../data/properties/properties.json');
const rawUpgrades = require('../data/properties/upgrades.json');

// Keep the existing runtime API (cost(level), bonus(level)) while moving static values to JSON.
const UPGRADES = Object.fromEntries(
  Object.entries(rawUpgrades).map(([id, upgrade]) => [
    id,
    {
      id: upgrade.id,
      name: upgrade.name,
      cost: (level) => upgrade.costPerLevel * level,
      bonus: (level) => ({ happyMax: upgrade.happyMaxPerLevel * level }),
    },
  ])
);

module.exports = { PROPERTIES, UPGRADES };
