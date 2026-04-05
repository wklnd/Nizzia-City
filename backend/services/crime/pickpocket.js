const { evaluatePickpocket } = require('./pickpocketCalculator');
const { rollTarget } = require('./pickpocketTargets');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPlayerStats(player) {
  const bs = player?.battleStats || {};
  return {
    strength: Number(bs.strength || 0),
    defense: Number(bs.defense || 0),
    dexterity: Number(bs.dexterity || 0),
    speed: Number(bs.speed || 0),
  };
}

function getNarration(outcome, loc, target) {
  const table = loc?.narration || {};
  if (outcome === 'success') {
    return table.success || `You slip past ${target?.name || 'the target'} and secure the wallet.`;
  }
  if (outcome === 'critical_fail') {
    return table.critical_fail || `${target?.name || 'The target'} catches your hand and raises an alarm.`;
  }
  return table.minor_fail || `You hesitate and back away before anyone notices.`;
}

function rollPickpocketLoot(loc) {
  const awarded = { money: 0, items: [] };
  const warnings = [];

  for (const entry of (loc.loot || [])) {
    const chance = Number(entry.chance || 0);
    if (Math.random() * 100 > chance) continue;

    if (entry.type === 'money') {
      const min = Math.max(0, Number(entry.min || 0));
      const max = Math.max(min, Number(entry.max || min));
      awarded.money += randInt(min, max);
      continue;
    }

    if (entry.type === 'item') {
      const itemId = String(entry.value || '');
      if (!itemId || itemId === '0') {
        warnings.push('Skipped invalid pickpocket loot item id');
        continue;
      }
      awarded.items.push(itemId);
    }
  }

  return { awarded, warnings };
}

async function executePickpocket({ player, crime, loc }) {
  const target = rollTarget(loc.id);
  if (!target) {
    return {
      ok: false,
      error: 'No pickpocket targets are available right now',
    };
  }

  const result = evaluatePickpocket({
    playerStats: getPlayerStats(player),
    targetStats: target.stats,
    targetStatus: target.status,
    targetAggression: target.aggression,
    isPolice: !!target.isPolice,
  });

  let awardedMoney = 0;
  let awardedItems = [];
  let warnings = [];
  if (result.outcome === 'success') {
    const base = randInt(Number(target.loot.min || 0), Number(target.loot.max || 0));
    awardedMoney = Math.max(0, Math.floor(base * Number(loc.rewardMultiplier || 1)));
    const rolled = rollPickpocketLoot(loc);
    awardedMoney += Number(rolled.awarded.money || 0);
    awardedItems = rolled.awarded.items || [];
    warnings = rolled.warnings || [];
  }

  const jail = { triggered: false, seconds: 0 };
  if (result.outcome === 'critical_fail') {
    const jailChance = Number(loc.jailChance || 0);
    if (Math.random() * 100 < jailChance) {
      jail.triggered = true;
      jail.seconds = Math.max(60, Number(loc.jailTimeSeconds || 600));
    }
  }

  return {
    ok: true,
    target: {
      id: target.id,
      name: target.name,
      isPolice: !!target.isPolice,
    },
    chance: result.successChance,
    outcome: result.outcome,
    money: awardedMoney,
    items: awardedItems,
    warnings,
    jail,
    narration: getNarration(result.outcome, loc, target),
    detail: result,
  };
}

module.exports = {
  executePickpocket,
};
