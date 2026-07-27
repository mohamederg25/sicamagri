const express = require('express');
const router = express.Router();
const { 
  getPepinieres, 
  getActivePepinieres,
  createPepiniere, 
  updatePepiniere, 
  deletePepiniere,
  assignIngenieur,
  removeIngenieur
} = require('../controllers/pepiniereController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getPepinieres);
router.get('/active', getActivePepinieres);
router.post('/', authorize('admin', 'employe'), createPepiniere);
router.put('/:id', authorize('admin', 'employe'), updatePepiniere);
router.delete('/:id', authorize('admin', 'employe'), deletePepiniere);
router.post('/:id/assign/:userId', authorize('admin', 'employe'), assignIngenieur);
router.delete('/:id/assign/:userId', authorize('admin', 'employe'), removeIngenieur);

module.exports = router;
