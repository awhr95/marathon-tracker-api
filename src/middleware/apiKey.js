const API_KEY = process.env.API_KEY;

function apiKeyGuard(req, res, next) {
  if (req.method === 'GET' && req.path === '/health') {
    return next();
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  if (providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}

module.exports = apiKeyGuard;
