const express = require('express');
const router = express.Router();
const { getLots, createLot, getLotById, getHistory, markReady, markHarvest, markDelivery, addNote } = require('../controllers/lotController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getLots);
router.get('/history', authorize('admin', 'ingenieur', 'employe', 'visiteur'), getHistory);
router.get('/:id', getLotById);
router.post('/', authorize('admin', 'ingenieur'), createLot);
router.put('/:id/mark-ready', authorize('admin', 'ingenieur'), markReady);
router.put('/:id/mark-harvest', authorize('admin', 'ingenieur'), markHarvest);
router.put('/:id/mark-delivery', authorize('admin', 'ingenieur'), markDelivery);
router.put('/:id/add-note', authorize('admin', 'ingenieur'), addNote);

module.exports = router;
