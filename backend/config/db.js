/**
 * Database Connection
 * ====================
 *
 * Called once at server startup (server.js).
 * Requires MONGO_URI in .env (e.g., mongodb+srv://user:pass@cluster.mongodb.net/pepiniere).
 * Exits process on failure — the app cannot run without a database.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);   // Hard stop — no DB, no app
  }
};

module.exports = connectDB;
