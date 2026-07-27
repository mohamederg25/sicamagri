const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const activityLogger = require('../services/activityLogger');

/** GET /api/users — list all users */
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').lean();
  sendSuccess(res, users, 'Liste des utilisateurs');
});

/** GET /api/users/ingenieurs — list ingenieur users (for pepiniere assignment) */
exports.getIngenieurs = asyncHandler(async (req, res) => {
  const ingenieurs = await User.find({ role: 'ingenieur' }).select('nom email').lean();
  sendSuccess(res, ingenieurs, 'Liste des ingénieurs');
});

/** GET /api/users/:id — get a single user */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new AppError('Utilisateur non trouvé', 404);
  sendSuccess(res, user);
});

/** POST /api/users — create a new user */
exports.createUser = asyncHandler(async (req, res) => {
  const { nom, email, password, role } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) throw new AppError('Cet email est déjà utilisé', 409);

  const user = await User.create({ nom, email, password, role: role || 'visiteur' });
  const sanitized = await User.findById(user._id).select('-password');

  activityLogger.log({
    action: 'create', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Utilisateur ${user.nom} (${user.email}) créé avec le rôle ${user.role}`,
    userId: req.user._id,
  });

  sendCreated(res, sanitized, 'Utilisateur créé avec succès');
});

/** PUT /api/users/:id — update user profile */
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  if (req.body.nom) user.nom = req.body.nom;
  if (req.body.email) user.email = req.body.email;
  if (req.body.role) user.role = req.body.role;
  await user.save();

  const sanitized = await User.findById(user._id).select('-password');

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Utilisateur ${user.nom} mis à jour`,
    userId: req.user._id,
  });

  sendSuccess(res, sanitized, 'Utilisateur mis à jour');
});

/** PUT /api/users/:id/password — update user password */
exports.updateUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  user.password = req.body.password;
  await user.save();

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Mot de passe de ${user.nom} mis à jour`,
    userId: req.user._id,
  });

  sendMessage(res, 'Mot de passe mis à jour avec succès');
});

/** PUT /api/users/:id/role — update user role only */
exports.updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: req.body.role },
    { new: true }
  ).select('-password');
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Rôle de ${user.nom} mis à jour : ${req.body.role}`,
    userId: req.user._id,
  });

  sendSuccess(res, user, 'Rôle mis à jour');
});

/** DELETE /api/users/:id — delete a user */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  activityLogger.log({
    action: 'delete', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Utilisateur ${user.nom} (${user.email}) supprimé`,
    userId: req.user._id,
  });

  sendMessage(res, 'Utilisateur supprimé');
});
