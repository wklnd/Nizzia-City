// NPC Market Buying — dedicated cron job for NPCs to purchase items
// Runs every 10 minutes

const cron = require('node-cron');
const Player = require('../models/Player');
const Item = require('../models/Item');
const ItemMarket = require('../models/ItemMarket');

const ts = () => `[${new Date().toTimeString().slice(0, 8)}]`;

async function npcMarketBuying() {
  try {
    // Find all NPCs that are online/active
    const npcs = await Player.find({ npc: true });
    if (!npcs.length) return console.log(`${ts()} [npc-market] No NPCs found.`);

    let totalBought = 0;
    let totalSpent = 0;
    let npcsParticipating = 0;

    for (const npc of npcs) {
      const cash = Number(npc.money || 0);
      
      // Only NPCs with money participate
      if (cash < 1000) continue;

      const budget = Math.floor(cash * 0.15); // Spend up to 15% of cash
      const listings = await ItemMarket.find({
        sellerId: { $ne: String(npc._id) },
        price: { $lte: budget },
        amountAvailable: { $gt: 0 },
      })
        .sort({ price: 1 })
        .limit(10);

      if (!listings.length) continue;

      npcsParticipating++;
      let spentThisTick = 0;
      let boughtThisTick = 0;

      for (const listing of listings) {
        try {
          const item = await Item.findOne({ id: listing.itemId });
          if (!item) continue;

          // NPCs prioritize: medicine, enhancers, drugs, cache, weapons, armor
          const worthBuying = [
            'medicine',
            'enhancers',
            'drugs',
            'cache',
            'weapon',
            'armor',
            'tools',
          ].includes(item.type);

          if (!worthBuying) continue;

          const remainingBudget = budget - spentThisTick;
          if (remainingBudget < listing.price) continue;

          // Buy 1-3 of this item
          const maxQty = Math.min(listing.amountAvailable, Math.floor(remainingBudget / listing.price), 3);
          if (maxQty < 1) continue;

          const totalCost = listing.price * maxQty;
          if (Number(npc.money || 0) < totalCost) continue;

          // Deduct from NPC
          npc.money = Number(npc.money) - totalCost;

          // Add to NPC inventory
          if (!npc.inventory) npc.inventory = [];
          const invIdx = npc.inventory.findIndex((e) => String(e.item) === String(item._id));
          if (invIdx >= 0) {
            npc.inventory[invIdx].qty = Number(npc.inventory[invIdx].qty || 0) + maxQty;
          } else {
            npc.inventory.push({ item: item._id, qty: maxQty });
          }

          // Update market listing
          listing.amountAvailable -= maxQty;
          if (listing.amountAvailable <= 0) {
            await ItemMarket.deleteOne({ _id: listing._id });
          } else {
            await listing.save();
          }

          // Credit seller
          try {
            await Player.updateOne(
              { _id: listing.sellerId },
              { $inc: { money: totalCost } }
            );
          } catch (e) {
            // Seller not found — skip
          }

          spentThisTick += totalCost;
          boughtThisTick += maxQty;
          totalSpent += totalCost;
          totalBought += maxQty;
        } catch (e) {
          console.error(`Error processing market listing for NPC ${npc.name}:`, e.message);
        }
      }

      if (boughtThisTick > 0) {
        npc.markModified('inventory');
        try {
          await npc.save();
        } catch (e) {
          console.error(`Failed to save NPC ${npc.name}:`, e.message);
        }
      }
    }

    console.log(
      `${ts()} [npc-market] tick | npcs=${npcsParticipating} | bought=${totalBought}x | spent=$${totalSpent.toLocaleString()}`
    );
  } catch (e) {
    console.error(`${ts()} [npc-market] Error:`, e.message);
  }
}

module.exports = () => {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', npcMarketBuying);
  console.log(`${ts()} [npc-market] Cron job scheduled (every 10 min)`);
};
