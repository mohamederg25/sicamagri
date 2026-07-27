const express = require('express');
const router = express.Router();
const {
  getFournisseurs,
  getActiveFournisseurs,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur
} = require('../controllers/fournisseurController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getFournisseurs);
router.get('/actif', getActiveFournisseurs);
router.post('/', authorize('admin'), createFournisseur);
router.put('/:id', authorize('admin'), updateFournisseur);
router.delete('/:id', authorize('admin'), deleteFournisseur);

module.exports = router;
