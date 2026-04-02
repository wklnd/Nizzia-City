const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const stocksCfg = require('../config/stocks');
const { listStocks, getLatestPrice, getHistory } = require('../services/stockService');

const STOCK_TX_TYPES = ['stock_buy', 'stock_sell'];

function toSymbol(value) {
  return String(value || '').trim().toUpperCase();
}

function isKnownSymbol(symbol) {
  return !!stocksCfg[symbol];
}

async function list(req, res) {
  try { res.json(await listStocks()); }
  catch (e) { res.status(500).json({ error: e.message }); }
}

async function quote(req, res) {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!stocksCfg[symbol]) return res.status(404).json({ error: 'Unknown symbol' });
    const last = await getLatestPrice(symbol);
    const history = await getHistory(symbol, req.query.range || '1d');
    res.json({ symbol, name: stocksCfg[symbol].name, price: last.price, history, decimals: Number.isInteger(stocksCfg[symbol].decimals) ? stocksCfg[symbol].decimals : 2 });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function portfolio(req, res) {
  try {
    const userId = req.authUserId;
    const player = await Player.findOne({ user: userId }).lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const holdings = player.portfolio || [];
    const enriched = [];
    for (const h of holdings) {
      const last = await getLatestPrice(h.symbol);
      const value = Number((h.shares * last.price).toFixed(2));
      enriched.push({ ...h, currentPrice: last.price, value });
    }
    res.json({ money: player.money, holdings: enriched });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function buy(req, res) {
  try {
    const userId = req.authUserId;
    const { symbol, shares } = req.body;
    const qty = Math.max(1, Number(shares || 0));
    const sym = toSymbol(symbol);
    if (!stocksCfg[sym]) return res.status(400).json({ error: 'Unknown symbol' });
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const last = await getLatestPrice(sym);
    const cost = Number((qty * last.price).toFixed(2));
    if ((player.money || 0) < cost) return res.status(400).json({ error: 'Not enough money' });
    player.$locals._txMeta = {
      type: 'stock_buy',
      description: `Bought ${qty} ${sym} shares`,
      extra: { symbol: sym, shares: qty, price: last.price },
    };
    player.money = Number((player.money - cost).toFixed(2));
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx >= 0) {
      const h = player.portfolio[idx];
      const newShares = Number(h.shares || 0) + qty;
      const newAvg = newShares > 0 ? Number(((h.avgPrice*h.shares + cost)/newShares).toFixed(4)) : last.price;
      h.shares = newShares; h.avgPrice = newAvg;
    } else {
      player.portfolio.push({ symbol: sym, shares: qty, avgPrice: last.price });
    }
    await player.save();
    return res.json({ money: player.money, holding: player.portfolio.find(h => h.symbol === sym) });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function sell(req, res) {
  try {
    const userId = req.authUserId;
    const { symbol, shares } = req.body;
    const qty = Math.max(1, Number(shares || 0));
    const sym = toSymbol(symbol);
    const player = await Player.findOne({ user: userId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const idx = (player.portfolio || []).findIndex(h => h.symbol === sym);
    if (idx < 0) return res.status(400).json({ error: 'No holdings for this symbol' });
    const h = player.portfolio[idx];
    if ((h.shares || 0) < qty) return res.status(400).json({ error: 'Not enough shares' });
    const last = await getLatestPrice(sym);
    const proceeds = Number((qty * last.price).toFixed(2));
    h.shares = Number((h.shares - qty).toFixed(8));
    if (h.shares <= 0) player.portfolio.splice(idx, 1);
    player.$locals._txMeta = {
      type: 'stock_sell',
      description: `Sold ${qty} ${sym} shares`,
      extra: { symbol: sym, shares: qty, price: last.price },
    };
    player.money = Number(((player.money || 0) + proceeds).toFixed(2));
    await player.save();
    return res.json({ money: player.money, proceeds, remaining: h.shares || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

async function watchlist(req, res) {
  try {
    const player = await Player.findOne({ user: req.authUserId }).lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const symbols = Array.from(new Set((player.stockWatchlist || []).map(toSymbol))).filter(isKnownSymbol);
    if (!symbols.length) return res.json({ symbols: [], items: [] });

    const market = await listStocks();
    const items = market.filter((s) => symbols.includes(s.symbol));
    res.json({ symbols, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function addWatchlist(req, res) {
  try {
    const sym = toSymbol(req.body?.symbol);
    if (!isKnownSymbol(sym)) return res.status(400).json({ error: 'Unknown symbol' });

    const player = await Player.findOne({ user: req.authUserId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const current = Array.from(new Set((player.stockWatchlist || []).map(toSymbol))).filter(Boolean);
    if (current.includes(sym)) return res.json({ symbols: current, added: false });
    if (current.length >= 30) return res.status(400).json({ error: 'Watchlist limit reached (30)' });

    current.push(sym);
    player.stockWatchlist = current;
    await player.save();
    res.json({ symbols: current, added: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function removeWatchlist(req, res) {
  try {
    const raw = req.body?.symbol || req.params?.symbol;
    const sym = toSymbol(raw);
    if (!sym) return res.status(400).json({ error: 'Symbol is required' });

    const player = await Player.findOne({ user: req.authUserId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const next = (player.stockWatchlist || []).map(toSymbol).filter((s) => s && s !== sym);
    player.stockWatchlist = Array.from(new Set(next));
    await player.save();
    res.json({ symbols: player.stockWatchlist, removed: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function tradeHistory(req, res) {
  try {
    const player = await Player.findOne({ user: req.authUserId }).select('_id').lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const symbol = toSymbol(req.query.symbol);

    const query = { player: player._id, type: { $in: STOCK_TX_TYPES } };
    if (symbol) {
      query.$or = [
        { 'meta.symbol': symbol },
        { description: { $regex: `\\b${symbol}\\b`, $options: 'i' } },
      ];
    }

    const [total, rows] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('type amount balanceAfter description meta createdAt')
        .lean(),
    ]);

    res.json({
      page,
      limit,
      total,
      rows,
      hasMore: page * limit < total,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function analytics(req, res) {
  try {
    const player = await Player.findOne({ user: req.authUserId }).lean();
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const holdings = player.portfolio || [];
    let marketValue = 0;
    let costBasis = 0;
    for (const h of holdings) {
      const last = await getLatestPrice(h.symbol);
      marketValue += Number(h.shares || 0) * Number(last.price || 0);
      costBasis += Number(h.shares || 0) * Number(h.avgPrice || 0);
    }

    const txAgg = await Transaction.aggregate([
      { $match: { player: player._id, type: { $in: STOCK_TX_TYPES } } },
      {
        $group: {
          _id: '$type',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let buyAmountAbs = 0;
    let sellAmount = 0;
    let buys = 0;
    let sells = 0;
    for (const row of txAgg) {
      if (row._id === 'stock_buy') {
        buyAmountAbs = Math.abs(Number(row.amount || 0));
        buys = Number(row.count || 0);
      } else if (row._id === 'stock_sell') {
        sellAmount = Number(row.amount || 0);
        sells = Number(row.count || 0);
      }
    }

    const unrealizedPnL = Number((marketValue - costBasis).toFixed(2));
    const invested = Number(costBasis.toFixed(2));
    const netCashflow = Number((sellAmount - buyAmountAbs).toFixed(2));

    res.json({
      money: Number(player.money || 0),
      invested,
      marketValue: Number(marketValue.toFixed(2)),
      unrealizedPnL,
      netCashflow,
      trades: { buys, sells, total: buys + sells },
      watchlistCount: (player.stockWatchlist || []).length,
      holdingsCount: holdings.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  list,
  quote,
  portfolio,
  buy,
  sell,
  watchlist,
  addWatchlist,
  removeWatchlist,
  tradeHistory,
  analytics,
};
