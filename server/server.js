const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Database = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lifevault-dev-secret-key-987654321';
const FAKE_SALT_SECRET = 'lifevault-fake-salt-obfuscation-key';

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl.split(',').map(url => url.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' })); // Support larger payloads for encrypted documents

// Helper to derive a deterministic fake salt for non-existent users
async function getSaltForUser(username) {
  const user = await Database.getUser(username);
  if (user) {
    return user.salt;
  }
  // Generate a deterministic fake salt based on the username
  const hmac = crypto.createHmac('sha256', FAKE_SALT_SECRET);
  hmac.update(username.toLowerCase().trim());
  return hmac.digest('hex').substring(0, 32);
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

// Get user salt (used before logging in to derive the key client-side)
app.post('/api/auth/salt', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const salt = await getSaltForUser(username);
    res.json({ salt });
  } catch (error) {
    console.error('Error fetching salt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, passwordHash, salt, recoveryPayload, recoveryKeyHash } = req.body;

  if (!username || !passwordHash || !salt) {
    return res.status(400).json({ error: 'Username, authentication hash, and salt are required' });
  }

  try {
    const existing = await Database.getUser(username);
    if (existing) {
      return res.status(409).json({ error: 'Username is already registered' });
    }

    // Salt and hash the authentication hash received from client (K_auth)
    // Server never receives or knows the actual Master Password
    const dbPasswordHash = await bcrypt.hash(passwordHash, 10);
    await Database.createUser(username, dbPasswordHash, salt, recoveryPayload, recoveryKeyHash);

    const token = jwt.sign({ username: username.toLowerCase().trim() }, JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, message: 'Account registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Fetch recovery payload and encrypted vault data
app.post('/api/auth/recovery-payload', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  try {
    const user = await Database.getUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ 
      recoveryPayload: user.recoveryPayload,
      vaultData: user.vaultData
    });
  } catch (error) {
    console.error('Fetch recovery payload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password with recovery key verification
app.post('/api/auth/reset-password-with-recovery', async (req, res) => {
  const { username, recoveryKey, newPasswordHash, newSalt, newRecoveryPayload, newRecoveryKeyHash, newVaultData } = req.body;

  if (!username || !recoveryKey || !newPasswordHash || !newSalt || !newRecoveryPayload || !newRecoveryKeyHash || !newVaultData) {
    return res.status(400).json({ error: 'All fields are required (including newVaultData)' });
  }

  try {
    const user = await Database.getUser(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the incoming recoveryKey with SHA-256 (in hex) to check against stored recoveryKeyHash
    const incomingHash = crypto.createHash('sha256').update(recoveryKey).digest('hex');
    
    if (incomingHash !== user.recoveryKeyHash) {
      return res.status(401).json({ error: 'Invalid recovery key' });
    }

    // Hash the new auth hash
    const dbPasswordHash = await bcrypt.hash(newPasswordHash, 10);
    await Database.resetPassword(username, dbPasswordHash, newSalt, newRecoveryPayload, newRecoveryKeyHash, newVaultData);

    res.json({ success: true, message: 'Master password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset master password' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  const { username, passwordHash } = req.body;

  if (!username || !passwordHash) {
    return res.status(400).json({ error: 'Username and authentication hash are required' });
  }

  try {
    const user = await Database.getUser(username);
    if (!user) {
      // Run dummy hash check to mitigate timing attacks
      await bcrypt.compare('dummy_hash', '$2a$10$dummyhashplaceholdercontentsxxxxxxxxxxxxxxxxxxxxxxxx');
      return res.status(401).json({ error: 'Invalid username or master password' });
    }

    const matches = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid username or master password' });
    }

    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, message: 'Authentication successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get User Encrypted Vault
app.get('/api/vault', authenticateToken, async (req, res) => {
  try {
    const user = await Database.getUser(req.user.username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ vaultData: user.vaultData });
  } catch (error) {
    console.error('Fetch vault error:', error);
    res.status(500).json({ error: 'Failed to retrieve vault data' });
  }
});

// Sync/Save User Encrypted Vault
app.post('/api/vault', authenticateToken, async (req, res) => {
  const { vaultData } = req.body;
  if (!vaultData) {
    return res.status(400).json({ error: 'Vault data payload is required' });
  }

  try {
    await Database.updateVault(req.user.username, vaultData);
    res.json({ success: true, message: 'Vault synced successfully' });
  } catch (error) {
    console.error('Sync vault error:', error);
    res.status(500).json({ error: 'Failed to synchronize vault data' });
  }
});

// Start Server and Connect DB
async function startServer() {
  try {
    // Only connect if not testing in an environment where URI is missing
    if (process.env.MONGODB_URI) {
      await Database.connect();
    } else {
      console.warn('[Database] MONGODB_URI not found. Please check your environment configuration.');
    }
    app.listen(PORT, () => {
      console.log(`[LifeVault Server] running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
