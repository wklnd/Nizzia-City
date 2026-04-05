const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUser');
const Player = require('../models/Player');

router.get('/status', requireAuth, async (req, res) => {
  try {
    const player = await Player.findOne({ user: req.authUserId }).select('jailed jailTime');
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const jailTime = Math.max(0, Number(player.jailTime || 0));
    const jailed = !!player.jailed && jailTime > 0;

    if (player.jailed && jailTime <= 0) {
      player.jailed = false;
      player.jailTime = 0;
      await player.save();
    }

    return res.json({ jailed, jailTime });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

router.post('/serve-time', requireAuth, async (req, res) => {
  try {
    const player = await Player.findOne({ user: req.authUserId }).select('jailed jailTime');
    if (!player) return res.status(404).json({ error: 'Player not found' });

    if (!player.jailed || Number(player.jailTime || 0) <= 0) {
      player.jailed = false;
      player.jailTime = 0;
      await player.save();
      return res.json({ jailed: false, jailTime: 0, released: true });
    }

    const tick = 60;
    const next = Math.max(0, Number(player.jailTime || 0) - tick);
    player.jailTime = next;
    if (next <= 0) {
      player.jailed = false;
    }
    await player.save();

    return res.json({
      jailed: !!player.jailed,
      jailTime: Number(player.jailTime || 0),
      released: !player.jailed,
      tick,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
