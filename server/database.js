const mongoose = require('mongoose');
const User = require('./user');

const Database = {
  async connect() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI environment variable is not defined.');
      process.exit(1);
    }
    try {
      await mongoose.connect(mongoUri);
      console.log('[Database] Connected successfully to MongoDB');
    } catch (err) {
      console.error('[Database] Connection error:', err);
      throw err;
    }
  },

  async getUser(username) {
    const cleanUsername = username.toLowerCase().trim();
    return await User.findOne({ username: cleanUsername });
  },

  async createUser(username, passwordHash, salt, recoveryPayload = null, recoveryKeyHash = null) {
    const cleanUsername = username.toLowerCase().trim();
    const existingUser = await User.findOne({ username: cleanUsername });
    if (existingUser) {
      throw new Error('User already exists');
    }
    const user = new User({
      username: cleanUsername,
      passwordHash,
      salt,
      recoveryPayload,
      recoveryKeyHash
    });
    await user.save();
    return user;
  },

  async updateVault(username, vaultData) {
    const cleanUsername = username.toLowerCase().trim();
    const result = await User.updateOne(
      { username: cleanUsername },
      { $set: { vaultData } }
    );
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    return true;
  },

  async updateRecoveryPayload(username, recoveryPayload) {
    const cleanUsername = username.toLowerCase().trim();
    const result = await User.updateOne(
      { username: cleanUsername },
      { $set: { recoveryPayload } }
    );
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    return true;
  },

  async resetPassword(username, newPasswordHash, newSalt, newRecoveryPayload, newRecoveryKeyHash, newVaultData) {
    const cleanUsername = username.toLowerCase().trim();
    const result = await User.updateOne(
      { username: cleanUsername },
      {
        $set: {
          passwordHash: newPasswordHash,
          salt: newSalt,
          recoveryPayload: newRecoveryPayload,
          recoveryKeyHash: newRecoveryKeyHash,
          vaultData: newVaultData
        }
      }
    );
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    return true;
  }
};

module.exports = Database;
