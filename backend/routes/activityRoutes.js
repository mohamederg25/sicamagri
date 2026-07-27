const express = require('express');
const router = express.Router();
const { getActivity } = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'ingenieur', 'employe', 'visiteur'), getActivity);

module.exports = router;
