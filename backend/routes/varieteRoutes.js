const express = require('express');
const router = express.Router();
const { 
  getVarietes, 
  getActiveVarietes,
  createVariete, 
  updateVariete, 
  deleteVariete 
} = require('../controllers/varieteController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getVarietes);
router.get('/active', getActiveVarietes);
router.post('/', authorize('admin'), createVariete);
router.put('/:id', authorize('admin'), updateVariete);
router.delete('/:id', authorize('admin'), deleteVariete);

module.exports = router;
