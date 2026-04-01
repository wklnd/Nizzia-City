// NPC Player Creator
// Usage:
//   node npcPlayerCreator.js -250   # creates 250 NPCs
//   node npcPlayerCreator.js 250    # also supported
//   node npcPlayerCreator.js 250 --dry
//   node npcPlayerCreator.js 250 --quiet
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../../backend/config/db');
const User = require('../../backend/models/User');
const Player = require('../../backend/models/Player');
const Counter = require('../../backend/models/Counter');

function RandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Name generation ---

const words = [
  // animals / creatures
  'wolf', 'fox', 'lynx', 'viper', 'raven', 'hawk', 'bear', 'shark', 'cobra', 'crow',
  'puma', 'wasp', 'moth', 'pike', 'kite', 'mole', 'toad', 'wren', 'orca', 'stag',
  // adjectives / states
  'frost', 'ash', 'dusk', 'void', 'grim', 'bleak', 'mute', 'numb', 'still', 'cold',
  'slick', 'lean', 'raw', 'pale', 'dim', 'haze', 'blur', 'faded', 'hollow', 'lost',
  // verbs / roles
  'lurk', 'drift', 'grind', 'idle', 'frag', 'snipe', 'rush', 'bait', 'roam', 'scout',
  'carry', 'camp', 'push', 'pull', 'rage', 'farm', 'gank', 'stack', 'feed', 'climb',
  // misc / flavor
  'nano', 'byte', 'glitch', 'lag', 'ping', 'node', 'root', 'kernel', 'patch', 'null',
  'trace', 'flag', 'grip', 'edge', 'flank', 'smoke', 'flash', 'zone', 'clip', 'burst',
];

const leetMap = { a: '4', e: '3', i: '1', o: '0', s: '5' };

function pick(arr) {
    return arr[RandomInt(0, arr.length - 1)];
}

function maybeLeet(word) {
    if (Math.random() > 0.30) return word;
    const chars = word.split('');
    const eligible = chars
        .map((c, i) => (leetMap[c] ? i : -1))
        .filter(i => i !== -1);
    if (!eligible.length) return word;
    const idx = eligible[RandomInt(0, eligible.length - 1)];
    chars[idx] = leetMap[chars[idx]];
    return chars.join('');
}

function randomName() {
    const roll = Math.random();

    if (roll < 0.35) {
        // single word, maybe leet, maybe trailing number
        const word = maybeLeet(pick(words));
        const num = Math.random() < 0.5 ? String(RandomInt(1, 999)) : '';
        return `${word}${num}`;
    }

    if (roll < 0.70) {
        // two words joined or underscored
        const a = maybeLeet(pick(words));
        const b = maybeLeet(pick(words));
        const sep = Math.random() < 0.5 ? '_' : '';
        const num = Math.random() < 0.3 ? String(RandomInt(1, 99)) : '';
        return `${a}${sep}${b}${num}`;
    }

    // two words + number, occasionally underscored
    const a = maybeLeet(pick(words));
    const b = maybeLeet(pick(words));
    const sep = Math.random() < 0.4 ? '_' : '';
    return `${a}${sep}${b}${RandomInt(10, 9999)}`;
}

function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function getNextPlayerId() {
    const result = await Counter.findOneAndUpdate(
        { name: 'player' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return result.seq;
}

function parseArgs(argv) {
    let count = 10;
    let dry = false;
    let quiet = false;

    for (let i = 2; i < argv.length; i++) {
        const token = String(argv[i]).trim();
        if (!token) continue;
        if (token === '--dry' || token === '--dry-run') {
            dry = true;
            continue;
        }
        if (token === '--quiet' || token === '--quite' || token === '-q') {
            quiet = true;
            continue;
        }

        const m = token.match(/^-?(\d+)$/);
        if (m) {
            count = Math.max(1, parseInt(m[1], 10));
        }
    }

    return { count, dry, quiet };
}

function buildNpcDraft() {
    const name = randomName();
    const email = `npc_${slugify(name)}_${RandomInt(1000, 9999)}@npc.local`;
    const passwordPlain = `npc-${RandomInt(100000, 999999)}`;
    return { name, email, passwordPlain };
}

async function createNpc() {
    const name = randomName();
    const email = `npc_${slugify(name)}_${RandomInt(1000, 9999)}@npc.local`;
    const passwordPlain = `npc-${RandomInt(100000, 999999)}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordPlain, salt);

    // Create User
    const user = new User({ name, email, password: passwordHash });
    await user.save();

    // Create Player
    const id = await getNextPlayerId();
    const genders = ['Male', 'Female', 'Enby'];
    const player = new Player({
        user: user._id,
        name,
        id,
        gender: genders[RandomInt(0, genders.length - 1)],
        npc: true,
        age: 0,
        level: RandomInt(1, 100),
        exp: -1,
        money: RandomInt(100000, 900000),
        points: RandomInt(0, 50),
        energyStats: { energy: 100, energyMax: 100, energyMaxCap: 150, energyMin: 0 },
        nerveStats: { nerve: 20, nerveMax: 20, nerveMaxCap: 125, nerveMin: 0 },
        happiness: { happy: 100, happyMax: 150, happyMaxCap: 99999, happyMin: 0 },
        battleStats: {
            strength: RandomInt(10, 50000),
            speed: RandomInt(10, 50000),
            dexterity: RandomInt(10, 50000),
            defense: RandomInt(10, 50000),
        },
        workStats: {
            manuallabor: RandomInt(0, 50000),
            intelligence: RandomInt(0, 50000),
            endurance: RandomInt(0, 50000),
            employeEfficiency: RandomInt(0, 50000),
        },
        addiction: 0,
    });
    await player.save();

    return { user, player, passwordPlain };
}

(async function main() {
    const { count, dry, quiet } = parseArgs(process.argv);
    let hadFatal = false;
    let failed = 0;
    let created = 0;

    try {
        await connectDB();

        if (dry && !quiet) {
            console.log(`[DRY RUN] Simulating creation of ${count} NPCs (no data will be written).`);
        }

        for (let i = 0; i < count; i++) {
            try {
                if (dry) {
                    const draft = buildNpcDraft();
                    created++;
                    if (!quiet) {
                        console.log(`[DRY] would create NPC: ${draft.name} email=${draft.email} pass=${draft.passwordPlain}`);
                    }
                } else {
                    const res = await createNpc();
                    created++;
                    if (!quiet) {
                        console.log(`✓ NPC created: ${res.player.name} (id=${res.player.id}) email=${res.user.email} pass=${res.passwordPlain}`);
                    }
                }
            } catch (e) {
                failed++;
                console.error('Failed to create NPC:', e.message);
            }
        }

        if (dry) {
            if (!hadFatal && failed === 0) {
                console.log(`[DRY RUN SUCCESS] Simulated ${created}/${count} NPCs. No data was written.`);
            } else {
                console.error(`[DRY RUN FAIL] Simulated ${created}/${count} NPCs, failed=${failed}.`);
            }
        } else if (!hadFatal && failed === 0) {
            console.log(`[SUCCESS] Created ${created}/${count} NPCs.`);
        } else {
            console.error(`[FAIL] Created ${created}/${count} NPCs, failed=${failed}.`);
        }
    } catch (err) {
        hadFatal = true;
        console.error('Fatal:', err);
        if (dry) {
            console.error('[DRY RUN FAIL] Fatal error prevented dry-run completion.');
        } else {
            console.error('[FAIL] Fatal error prevented NPC creation.');
        }
    } finally {
        try {
            await mongoose.connection.close();
        } catch {}
        process.exit(hadFatal || failed > 0 ? 1 : 0);
    }
})();