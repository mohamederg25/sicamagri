/**
 * User Model — Authentication & Authorization
 * ============================================
 *
 * Four roles with increasing access:
 *
 *   admin      — Full CRUD on all entities, user management
 *   ingenieur  — Assigned to specific pepinieres, manages lots and semis
 *   employe    — Operational view: semis, pepinieres (no lots/phytosanitaire editing)
 *   visiteur   — Read-only access to most features
 *
 * Auth flow:
 *   1. Login → server validates credentials
 *   2. Server creates JWT, stores in httpOnly cookie
 *   3. Every subsequent request includes the cookie automatically
 *   4. protect middleware (middleware/auth.js) verifies JWT
 *   5. authorize middleware checks role permissions
 *
 * Security:
 *   - Passwords hashed with bcrypt (salt rounds: 10)
 *   - Pre-save hook auto-hashes on password change
 *   - JWT stored in httpOnly cookie (not accessible via JavaScript)
 *   - Password excluded from API responses (.select('-password'))
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ['admin', 'ingenieur', 'employe', 'visiteur'],
    default: 'visiteur'
  },
  preferences: {
    classicMode: { type: Boolean, default: false }
  }
}, { timestamps: true });

/** Hash password before saving (only if modified) */
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/** Compare entered password with stored hash */
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//  Indexes 
// email already has unique: true (creates an index automatically)
userSchema.index({ role: 1 });    // Role-based filtering
userSchema.index({ nom: 1 });     // Sorting by name

module.exports = mongoose.model('User', userSchema);
