const Player = require('../models/Player');

const ALLOWLIST_PREFIXES = [
  '/api/auth',
  '/api/jail',
  '/api/player/me',
  '/api/player/create',
];

function isAllowedPath(pathname) {
  return ALLOWLIST_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

async function jailGate(req, res, next) {
  try {
    if (!req.authUserId) return next();
    if (isAllowedPath(req.path)) return next();

    const player = await Player.findOne({ user: req.authUserId }).select('jailed jailTime');
    if (!player) return next();

    if (!player.jailed) return next();

    const jailTime = Math.max(0, Number(player.jailTime || 0));
    if (jailTime <= 0) {
      player.jailed = false;
      player.jailTime = 0;
      await player.save();
      return next();
    }

    return res.status(423).json({
      error: 'You are in jail and can only access jail facilities',
      code: 'JAILED',
      jailTime,
      allowed: ['/api/jail/status', '/api/jail/serve-time', '/api/player/me'],
    });
  } catch (e) {
    return next();
  }
}

module.exports = jailGate;
