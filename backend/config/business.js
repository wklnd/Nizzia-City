const businessData = require('../data/business.json');

const BUSINESSES = businessData.businesses;
const UPGRADE_TIERS = businessData.upgradeTiers;
const STAFF_SALARY = businessData.staff.salary;
const STAFF_INCOME_BOOST = businessData.staff.incomeBoost;
const MULTI_BIZ_RAID_PENALTY = businessData.risk.multiBizRaidPenalty;
const RAID_INCOME_LOSS = businessData.risk.raidIncomeLoss;
const RAID_SHUTDOWN_TICKS = businessData.risk.raidShutdownTicks;
const INCOME_INTERVAL_HOURS = businessData.timing.incomeIntervalHours;
const MAX_PENDING_HOURS = businessData.timing.maxPendingHours;

module.exports = {
  BUSINESSES,
  UPGRADE_TIERS,
  STAFF_SALARY,
  STAFF_INCOME_BOOST,
  MULTI_BIZ_RAID_PENALTY,
  RAID_INCOME_LOSS,
  RAID_SHUTDOWN_TICKS,
  INCOME_INTERVAL_HOURS,
  MAX_PENDING_HOURS,
};
