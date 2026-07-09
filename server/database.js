const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

// Initialize database file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2), 'utf8');
}

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file, resetting database:', err);
    return { users: {} };
  }
}

function writeDB(data) {
  const tempPath = DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('Error writing to database:', err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    throw err;
  }
}

const Database = {
  getUser(username) {
    const db = readDB();
    const cleanUsername = username.toLowerCase().trim();
    return db.users[cleanUsername] || null;
  },

  createUser(username, passwordHash, salt, recoveryPayload = null, recoveryKeyHash = null) {
    const db = readDB();
    const cleanUsername = username.toLowerCase().trim();
    if (db.users[cleanUsername]) {
      throw new Error('User already exists');
    }
    db.users[cleanUsername] = {
      username: cleanUsername,
      passwordHash,
      salt,
      vaultData: null,
      recoveryPayload,
      recoveryKeyHash,
      createdAt: new Date().toISOString()
    };
    writeDB(db);
    return db.users[cleanUsername];
  },

  updateVault(username, vaultData) {
    const db = readDB();
    const cleanUsername = username.toLowerCase().trim();
    if (!db.users[cleanUsername]) {
      throw new Error('User not found');
    }
    db.users[cleanUsername].vaultData = vaultData;
    db.users[cleanUsername].updatedAt = new Date().toISOString();
    writeDB(db);
    return true;
  },

  updateRecoveryPayload(username, recoveryPayload) {
    const db = readDB();
    const cleanUsername = username.toLowerCase().trim();
    if (!db.users[cleanUsername]) {
      throw new Error('User not found');
    }
    db.users[cleanUsername].recoveryPayload = recoveryPayload;
    db.users[cleanUsername].updatedAt = new Date().toISOString();
    writeDB(db);
    return true;
  },

  resetPassword(username, newPasswordHash, newSalt, newRecoveryPayload, newRecoveryKeyHash, newVaultData) {
    const db = readDB();
    const cleanUsername = username.toLowerCase().trim();
    if (!db.users[cleanUsername]) {
      throw new Error('User not found');
    }
    db.users[cleanUsername].passwordHash = newPasswordHash;
    db.users[cleanUsername].salt = newSalt;
    db.users[cleanUsername].recoveryPayload = newRecoveryPayload;
    db.users[cleanUsername].recoveryKeyHash = newRecoveryKeyHash;
    db.users[cleanUsername].vaultData = newVaultData;
    db.users[cleanUsername].updatedAt = new Date().toISOString();
    writeDB(db);
    return true;
  }
};

module.exports = Database;
