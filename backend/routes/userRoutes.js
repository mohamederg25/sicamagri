const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  getIngenieurs,
  createUser, 
  updateUser, 
  updateUserPassword,
  updateUserRole, 
  deleteUser 
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Ingenieurs list — accessible to admin and employe (for pepiniere assignment)
router.get('/ingenieurs', authorize('admin', 'employe'), getIngenieurs);

// All other user management — admin only
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', updateUserPassword);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

module.exports = router;
