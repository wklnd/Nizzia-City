require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../../backend/config/db');
const Player = require('../../backend/models/Player');

function parseArgs(argv) {
  const args = { amount: null, dry: false };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--dry' || token === '--dry-run') {
      args.dry = true;
      continue;
    }

    if (args.amount === null) {
      args.amount = Number(token);
      continue;
    }
  }

  return args;
}

function validateAmount(amount) {
  if (!Number.isFinite(amount) || Number.isNaN(amount)) return 'Amount must be a valid number.';
  if (amount <= 0) return 'Amount must be greater than 0.';
  return null;
}

async function main() {
  const { amount, dry } = parseArgs(process.argv);
  const validationError = validateAmount(amount);

  if (validationError) {
    console.error(validationError);
    console.error('Usage: node backend/tools/player_tools/addMoneyAllPlayers.js <amount> [--dry]');
    process.exit(1);
  }

  await connectDB();

  const totalPlayers = await Player.countDocuments({});
  console.log(`Players found: ${totalPlayers}`);

  if (dry) {
    console.log(`Dry run: would add $${amount.toLocaleString()} to all players.`);
    await mongoose.connection.close();
    return;
  }

  const res = await Player.updateMany({}, { $inc: { money: amount } });
  const modified = res.modifiedCount ?? res.nModified ?? 0;

  console.log(`Added $${amount.toLocaleString()} to all players.`);
  console.log(`Modified players: ${modified}`);

  await mongoose.connection.close();
}

main().catch(async (err) => {
  console.error('Failed to add money to players:', err?.message || err);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
