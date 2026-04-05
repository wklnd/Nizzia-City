// TODO : Refactor to json 
// TODO: Remove magic Numbers. 
const LOCATION = {
  Subway_Station: {
    id: 'subway_station',
    name: 'Subway Station',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 50, max: 200, chance: 70 },
      { type: 'item', value: '1', chance: 0.1 }, // Xanax
      { type: 'item', value: '62', chance: 10 }, // Purse
      { type: 'item', value: '52', chance: 40 }, // Subway pass
      { type: 'item', value: '41', chance: 5 }, // ecstasy
      { type: 'item', value: '41', chance: 20 }, // Beer
      { type: 'item', value: '9', chance: 2 }, // Jacket
      { type: 'item', value: '101', chance: 2 }, // Newspaper
      { type: 'item', value: '102', chance: 20 }, // Empty Can

    ],
    narration: {
      success: 'You blend with the crowd and score a quick pocket haul.',
      minor_fail: 'A guard shifts in your direction and you step away empty-handed.',
      critical_fail: 'A commuter shouts and security roughs you up before you slip free.',
    },
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp
    jailChance: 5,
    jailTimeSeconds: 900,
    MinorFailChance: 10,
    MinorFailEvent: { type: 'failure' }, // just fail, no reward

    PopularityAt:{ morning: 40, afternoon: 40, evening: 15, night: 5 },


  },
  Trash: {
    id: 'trash',
    name: 'Trash',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 10, max: 20, chance: 70 },
      { type: 'item', value: '102', chance: 36 },
      { type: 'item', value: '51', chance: 20 },
      { type: 'item', value: '101', chance: 12 },
      { type: 'item', value: '62', chance: 3 },
    ],
    narration: {
      success: 'You dig through a pile and find usable scraps and loose bills.',
      minor_fail: 'The haul is mostly wet cardboard and bad luck.',
      critical_fail: 'A sharp edge tears into you while you scramble through debris.',
    },
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp
    jailChance: 0,
    jailTimeSeconds: 0,
    MinorFailChance: 10,
    MinorFailEvent: { type: 'failure' },
    PopularityAt:{ morning: 25, afternoon: 35, evening: 20, night: 20 },
  },
  Junkyard: {
    id: 'junkyard',
    name: 'Junkyard',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 50, max: 200, chance: 70 },
      { type: 'item', value: '102', chance: 22 },
      { type: 'item', value: '101', chance: 14 },
      { type: 'item', value: '6', chance: 40 },
      { type: 'item', value: '41', chance: 5 }, // ecstasy
    ],
    narration: {
      success: 'You pry open a stash in the scrap and score cash plus salvage.',
      minor_fail: 'You spend time digging and come up short.',
      critical_fail: 'You trip over rusted steel and take a nasty hit.',
    },
    CriticalFailChance: 5, 
    CriticalFailEvent: { type: 'injury', severity: 'minor' }, // 20% of hp
    jailChance: 0,
    jailTimeSeconds: 0,

    MinorFailChance: 10,
    MinorFailEvent: { type: 'failure' }, // just fail, no reward
    PopularityAt:{ morning: 20, afternoon: 30, evening: 25, night: 25 },
  },
  Back_Alley: {
    id: 'back_alley',
    name: 'Back Alley',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 40, max: 140, chance: 72 },
      { type: 'item', value: '102', chance: 22 },
      { type: 'item', value: '101', chance: 12 },
      { type: 'item', value: '41', chance: 3 },
      { type: 'item', value: '9', chance: 1.5 },
    ],
    narration: {
      success: 'You spot a dropped envelope near a fire escape and cash in.',
      minor_fail: 'The alley goes quiet and you decide to leave fast.',
      critical_fail: 'A lookout catches you snooping and lands a hard punch.',
    },
    CriticalFailChance: 7,
    CriticalFailEvent: { type: 'injury', severity: 'minor' },
    jailChance: 3,
    jailTimeSeconds: 600,
    MinorFailChance: 12,
    MinorFailEvent: { type: 'failure' },
    PopularityAt:{ morning: 15, afternoon: 25, evening: 30, night: 30 },
  },
  Bus_Stop: {
    id: 'bus_stop',
    name: 'Bus Stop',
    requirements: { none: true },
    loot: [
      { type: 'money', min: 20, max: 90, chance: 78 },
      { type: 'item', value: '52', chance: 35 },
      { type: 'item', value: '62', chance: 8 },
      { type: 'item', value: '102', chance: 25 },
    ],
    narration: {
      success: 'You sweep the benches and snag fare cash plus a useful pass.',
      minor_fail: 'Commuters keep moving and nothing drops your way.',
      critical_fail: 'Transit staff thinks you are stealing and drags you aside.',
    },
    CriticalFailChance: 6,
    CriticalFailEvent: { type: 'injury', severity: 'minor' },
    jailChance: 4,
    jailTimeSeconds: 720,
    MinorFailChance: 11,
    MinorFailEvent: { type: 'failure' },
    PopularityAt:{ morning: 38, afternoon: 32, evening: 22, night: 8 },
  },
};

const CRIMES = {
  search_for_cash: {
    id: 'search_for_cash',
    name: 'Search for Cash',
    // Reference by location id string to avoid circular refs
    location: ['subway_station', 'trash', 'junkyard', 'back_alley', 'bus_stop'],
    nerveCost: 2, 
    expPerSuccess: 10,
    expPerFail: 1,
  },
};

module.exports = { CRIMES, LOCATION };
