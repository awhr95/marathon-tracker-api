const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/sessions', require('./sessions'));
router.use('/milestones', require('./milestones'));

module.exports = router;
