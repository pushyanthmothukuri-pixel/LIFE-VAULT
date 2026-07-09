const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  salt: {
    type: String,
    required: true
  },
  vaultData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  recoveryPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  recoveryKeyHash: {
    type: String,
    default: null
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

module.exports = mongoose.model('User', UserSchema);
