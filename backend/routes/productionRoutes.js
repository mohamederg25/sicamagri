const express = require('express');
const router = express.Router();
const { getRecords } = require('../controllers/productionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'ingenieur', 'employe', 'visiteur'), getRecords);

module.exports = router;
