function num(v) {
    return Number(v || 0);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function applyStatusPenalty(targetValue, targetStatus = {}) {
    let value = targetValue;
    if (targetStatus.drunk) value *= 0.7;
    if (targetStatus.sleepy) value *= 0.9;
    if (targetStatus.unfocused) value *= 0.9;
    if (targetStatus.old) value *= 0.95;
    if (targetStatus.sick) value *= 0.9;
    return value;
}

function evaluatePickpocket({
    playerStats = {},
    targetStats = {},
    targetStatus = {},
    targetAggression = 0,
    isPolice = false,
}) {
    const playerDex = num(playerStats.dexterity);
    const playerSpeed = num(playerStats.speed);
    const targetDex = num(targetStats.dexterity);
    const targetSpeed = num(targetStats.speed);
    const targetStrength = num(targetStats.strength);
    const targetDefense = num(targetStats.defense);

    const playerTotal = playerDex * 0.5 + playerSpeed * 0.5;
    const rawTargetTotal = targetDex * 0.5 + targetSpeed * 0.5;
    const targetTotal = applyStatusPenalty(rawTargetTotal, targetStatus);

    const denom = Math.max(1, playerTotal + targetTotal);
    const baseChance = playerTotal / denom;
    const noise = Math.random() * 0.1 - 0.05; // -5%..+5%
    const successChance = clamp(baseChance + noise, 0.02, 0.98);

    let outcome = 'minor_fail';
    if (successChance >= 0.8) {
        outcome = 'success';
    } else if (successChance < 0.5) {
        outcome = 'critical_fail';
    }

    const aggression = clamp(num(targetAggression), 0, 1);
    const caughtDamage = Math.floor((targetStrength * 0.4 + targetDefense * 0.3 + targetSpeed * 0.3) * aggression);

    return {
        baseChance,
        successChance,
        outcome,
        isPolice,
        aggression,
        caughtDamage,
    };
}

module.exports = {
    evaluatePickpocket,
};

