const router = require('express').Router();
const ctrl = require('../controllers/sessions');

router.get('/', ctrl.list);
router.get('/streak', ctrl.streak);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
