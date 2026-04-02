const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const {
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
} = require('../controllers/stockController');

router.get('/', list);
router.get('/portfolio', requireAuth, portfolio);
router.get('/watchlist', requireAuth, watchlist);
router.post('/watchlist', requireAuth, addWatchlist);
router.delete('/watchlist/:symbol', requireAuth, removeWatchlist);
router.get('/history', requireAuth, tradeHistory);
router.get('/analytics', requireAuth, analytics);
router.get('/:symbol', quote);
router.post('/buy', requireAuth, buy);
router.post('/sell', requireAuth, sell);

module.exports = router;
