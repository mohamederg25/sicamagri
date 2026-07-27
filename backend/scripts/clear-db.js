/**
 * Clear Database Script
 * ======================
 *
 * Drops all data from all collections without seeding new data.
 * Use this to start fresh and repopulate manually through the application UI.
 *
 * Usage: node scripts/clear-db.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Pepiniere = require('../models/Pepiniere');
const Variete = require('../models/Variete');
const Lot = require('../models/Lot');
const Semis = require('../models/Semis');
const Phytosanitaire = require('../models/Phytosanitaire');
const ProductionRule = require('../models/ProductionRule');
dotenv.config();

const clearDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('  Clearing all collections...');

    await User.deleteMany();
    await Pepiniere.deleteMany();
    await Variete.deleteMany();
    await Lot.deleteMany();
    await Semis.deleteMany();
    await ProductionRule.deleteMany();
    await Phytosanitaire.deleteMany();

    console.log('[OK] All data cleared successfully!');
    console.log('📝 You can now repopulate manually via the application UI.');
    console.log('   Or run: npm run seed  (to seed with sample data)');

    process.exit(0);
  } catch (error) {
    console.error('[NOK] Error clearing database:', error.message);
    process.exit(1);
  }
};

clearDB();
