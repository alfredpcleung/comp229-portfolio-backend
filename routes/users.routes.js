const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', authMiddleware, ctrl.updateById);
router.delete('/:id', authMiddleware, ctrl.removeById);
router.delete('/', authMiddleware, ctrl.removeAll);

module.exports = router;
module.exports = router;