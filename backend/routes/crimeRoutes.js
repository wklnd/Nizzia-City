const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const { searchForCash, pickpocket, getPickpocketTargets, getLocations } = require('../controllers/crimeController');

router.post('/search-for-cash', requireAuth, searchForCash);
router.post('/pickpocket', requireAuth, pickpocket);
router.get('/pickpocket/targets', requireAuth, getPickpocketTargets);
router.get('/locations', requireAuth, getLocations);

module.exports = router;
