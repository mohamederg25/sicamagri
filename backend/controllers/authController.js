const User = require('../models/User');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, sendMessage, AppError } = require('../utils/response');
const activityLogger = require('../services/activityLogger');

/**
 * Generate a JWT token and set it as an httpOnly cookie.
 * The cookie is secure in production, sameSite lax to allow navigation.
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

/** POST /api/auth/register — create a new user account */
exports.register = asyncHandler(async (req, res) => {
  const { nom, email, password, role } = req.body;
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError('L\'utilisateur existe déjà', 400);
  }
  const user = await User.create({ nom, email, password, role });
  if (user) {
    generateToken(res, user._id);
    sendCreated(res, { _id: user._id, nom: user.nom, email: user.email, role: user.role, preferences: user.preferences });
  }
});

/** POST /api/auth/login — authenticate and receive a cookie */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);
    sendSuccess(res, { _id: user._id, nom: user.nom, email: user.email, role: user.role, preferences: user.preferences });
  } else {
    throw new AppError('Email ou mot de passe invalide', 401);
  }
});

/** POST /api/auth/logout — clear the auth cookie */
exports.logout = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  sendMessage(res, 'Déconnecté');
};

/** GET /api/auth/me — return the current authenticated user */
exports.getMe = (req, res) => {
  sendSuccess(res, req.user);
};

/** PUT /api/auth/update-profile — current user updates their name */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { nom } = req.body;
  if (!nom || nom.trim().length === 0) {
    throw new AppError('Le nom ne peut pas être vide', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { nom: nom.trim() },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Profil mis à jour : ${user.nom}`,
    userId: req.user._id,
  });

  sendSuccess(res, { _id: user._id, nom: user.nom, email: user.email, role: user.role, preferences: user.preferences });
});

/** PUT /api/auth/preferences — current user updates their preferences */
exports.updatePreferences = asyncHandler(async (req, res) => {
  const { classicMode } = req.body;

  if (typeof classicMode !== 'boolean') {
    throw new AppError('classicMode doit être un booléen', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { 'preferences.classicMode': classicMode },
    { new: true, runValidators: true }
  );
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Préférences mises à jour : classicMode=${classicMode}`,
    userId: req.user._id,
  });

  sendSuccess(res, { _id: user._id, nom: user.nom, email: user.email, role: user.role, preferences: user.preferences });
});

/** PUT /api/auth/change-password — current user changes their own password */
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new AppError('Mot de passe actuel incorrect', 400);

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('Le nouveau mot de passe doit contenir au moins 6 caractères', 400);
  }

  user.password = newPassword;
  await user.save();

  activityLogger.log({
    action: 'update', entityType: 'user',
    entityId: user._id, entityCode: user.nom,
    details: `Mot de passe changé par ${user.nom}`,
    userId: req.user._id,
  });

  sendMessage(res, 'Mot de passe mis à jour avec succès');
});
