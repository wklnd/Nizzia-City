// NPC personality archetypes.
// Static data lives in personalities.json — this file loads it and exports
// everything, plus the two runtime helper functions.
 
const { PERSONALITIES, DISTRIBUTION } = require('../data/npcPersonalities.json'); // /home/oscarwiklund/Nizzia-City-Rewrite/backend/config/npcPersonalities.js
 
/** Pick a random personality based on distribution weights */
function rollPersonality() {
  const entries = Object.entries(DISTRIBUTION);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return 'allrounder';
}
 
/** Check if an NPC should participate in an activity this tick */
function shouldAct(personality, activity) {
  const p = PERSONALITIES[personality] || PERSONALITIES.allrounder;
  const weight = p.weights[activity] || 0.25;
  return Math.random() < weight;
}
 
module.exports = { PERSONALITIES, DISTRIBUTION, rollPersonality, shouldAct };
 