const express = require('express');
const router = express.Router();
const {
  getSemisList,
  getSemisById,
  createSemis,
  updateSemis,
  deleteSemis,
  getAllSemis,
  getSemisSupervision,
  getExternalStats,
  transferSemis
} = require('../controllers/semisController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/external-stats', getExternalStats);
router.get('/supervision', getSemisSupervision);
router.get('/all', getAllSemis);
router.get('/', getSemisList);
router.get('/:id', getSemisById);
router.post('/', authorize('admin', 'employe', 'ingenieur'), createSemis);
router.put('/:id', authorize('admin', 'employe', 'ingenieur'), updateSemis);
router.post('/:id/transfer', authorize('admin', 'employe', 'ingenieur'), transferSemis);
router.delete('/:id', authorize('admin'), deleteSemis);

module.exports = router;
