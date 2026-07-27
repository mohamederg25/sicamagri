const express = require('express');
const router = express.Router();
const {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
} = require('../controllers/productionRuleController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Read endpoints — accessible to all authenticated users
router.get('/', getRules);
router.get('/:id', getRuleById);

// Write endpoints — admin only (rules should be carefully managed)
router.post('/', authorize('admin', 'employe'), createRule);
router.put('/:id', authorize('admin', 'employe'), updateRule);
router.delete('/:id', authorize('admin', 'employe'), deleteRule);

module.exports = router;
