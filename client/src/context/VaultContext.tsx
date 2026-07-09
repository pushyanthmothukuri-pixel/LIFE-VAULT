import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  deriveKeys,
  encryptText,
  decryptText,
  generateRandomSalt,
  generateRecoveryKey,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from '../services/crypto';
import type { EncryptedPayload } from '../services/crypto';

export interface PasswordItem {
  id: string;
  title: string;
  username: string;
  passwordValue: string;
  url: string;
  notes: string;
  category: string; // 'login', 'social', 'work', 'finance', 'other'
  updatedAt: string;
}

export interface CardItem {
  id: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  nickname: string;
  brand: string; // Visa, MasterCard, Amex, Generic
  notes: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  size: number;
  encryptedBlob: string; // Base64 ciphertext
  iv: string; // Base64 IV
  uploadedAt: string;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  cost: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  category: string;
  reminderDays: number;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship: string;
  accessGranted: boolean;
  accessKey: string; // The generated recovery key for them
  updatedAt: string;
}

export interface AuthenticatorEntry {
  id: string;
  name: string;
  issuer: string;
  secret: string; // Base32 secret seed
  updatedAt: string;
}

export interface VaultData {
  passwords: PasswordItem[];
  cards: CardItem[];
  documents: DocumentItem[];
  subscriptions: SubscriptionItem[];
  emergencyContacts: EmergencyContact[];
  authenticatorEntries: AuthenticatorEntry[];
}

interface VaultContextType {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  vaultData: VaultData | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  recoveryKey: string | null; // Set temporarily during registration or reset
  clearRecoveryKey: () => void;
  register: (username: string, masterPassword: string) => Promise<string>;
  login: (username: string, masterPassword: string) => Promise<void>;
  logout: () => void;
  syncVault: (updatedData: Partial<VaultData>) => Promise<void>;
  recoverAccount: (username: string, recoveryKey: string, masterPassword: string) => Promise<string>;
  triggerLocalVaultReset: () => void;
  encryptBinary: (buffer: ArrayBuffer) => Promise<EncryptedPayload>;
  decryptBinary: (payload: EncryptedPayload) => Promise<ArrayBuffer>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return url.endsWith('/api') ? url : `${url}/api`;
};
const API_BASE = getApiBase();

const initialVaultData: VaultData = {
  passwords: [],
  cards: [],
  documents: [],
  subscriptions: [],
  emergencyContacts: [],
  authenticatorEntries: []
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  // In-memory master key. NEVER saved to localStorage/sessionStorage.
  const masterKeyRef = useRef<CryptoKey | null>(null);
  const autoLockTimerRef = useRef<any>(null);

  const clearRecoveryKey = () => setRecoveryKey(null);
  const clearError = () => setError(null);

  // Auto lock inactivity tracker: 15 minutes of inactivity triggers lock
  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  const resetAutoLockTimer = () => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    if (isAuthenticated) {
      autoLockTimerRef.current = setTimeout(() => {
        logout();
        setError('Vault locked due to inactivity.');
      }, INACTIVITY_LIMIT);
    }
  };

  useEffect(() => {
    const handleActivity = () => resetAutoLockTimer();
    
    if (isAuthenticated) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('click', handleActivity);
      resetAutoLockTimer();
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [isAuthenticated]);

  // Attempt login using token stored in session storage (requires master key to decrypt, so it only validates token freshness, but user still needs to input master password to unlock data. To make dev friendly, we prompt master password on fresh visits)
  useEffect(() => {
    const savedToken = localStorage.getItem('lifevault_token');
    const savedUser = localStorage.getItem('lifevault_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsername(savedUser);
    }
  }, []);

  const logout = () => {
    setIsAuthenticated(false);
    setToken(null);
    setUsername(null);
    setVaultData(null);
    setRecoveryKey(null);
    masterKeyRef.current = null;
    localStorage.removeItem('lifevault_token');
    localStorage.removeItem('lifevault_user');
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
  };

  // Register a new account
  const register = async (userEmail: string, masterPassword: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      const salt = generateRandomSalt();

      // Derive K_enc and K_auth
      const keys = await deriveKeys(masterPassword, salt);

      // Generate a new Recovery Key
      const genRecKey = generateRecoveryKey();

      // Derive recovery encryption key K_rec = SHA-256(recoveryKey)
      const encoder = new TextEncoder();
      const recBytes = encoder.encode(genRecKey);
      const recHashBuffer = await window.crypto.subtle.digest('SHA-256', recBytes);
      const K_rec = await window.crypto.subtle.importKey(
        'raw',
        recHashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Export raw K_enc bytes to encrypt with K_rec
      const rawEncKeyBytes = await window.crypto.subtle.exportKey('raw', keys.encKey);
      const rawEncKeyBase64 = arrayBufferToBase64(rawEncKeyBytes);
      const recoveryPayload = await encryptText(rawEncKeyBase64, K_rec);

      // Create a recovery key hash for verification on server
      const recoveryKeyHashBuffer = await window.crypto.subtle.digest('SHA-256', recBytes);
      const recoveryKeyHashHex = Array.from(new Uint8Array(recoveryKeyHashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanEmail,
          passwordHash: keys.authHash,
          salt,
          recoveryPayload,
          recoveryKeyHash: recoveryKeyHashHex
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register account');
      }

      const data = await res.json();
      
      // Store in memory
      masterKeyRef.current = keys.encKey;
      setToken(data.token);
      setUsername(cleanEmail);
      setIsAuthenticated(true);
      setVaultData(initialVaultData);
      setRecoveryKey(genRecKey);

      localStorage.setItem('lifevault_token', data.token);
      localStorage.setItem('lifevault_user', cleanEmail);

      // Initialize empty vault on server
      await syncVaultHelper(initialVaultData, keys.encKey, data.token);

      return genRecKey;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Log in to existing account
  const login = async (userEmail: string, masterPassword: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      
      // 1. Get Salt from server
      const saltRes = await fetch(`${API_BASE}/auth/salt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanEmail })
      });
      if (!saltRes.ok) throw new Error('Failed to retrieve authentication parameters');
      const { salt } = await saltRes.json();

      // 2. Derive key & auth hash client-side
      const keys = await deriveKeys(masterPassword, salt);

      // 3. Login to server
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanEmail,
          passwordHash: keys.authHash
        })
      });

      if (!loginRes.ok) {
        const errData = await loginRes.json();
        throw new Error(errData.error || 'Invalid credentials');
      }

      const authData = await loginRes.json();

      // 4. Retrieve encrypted vault data
      const vaultRes = await fetch(`${API_BASE}/vault`, {
        headers: { 'Authorization': `Bearer ${authData.token}` }
      });
      if (!vaultRes.ok) throw new Error('Failed to retrieve vault data');
      const { vaultData: encVaultPayload } = await vaultRes.json();

      // Store key in memory and session tokens
      masterKeyRef.current = keys.encKey;
      setToken(authData.token);
      setUsername(cleanEmail);
      setIsAuthenticated(true);
      
      localStorage.setItem('lifevault_token', authData.token);
      localStorage.setItem('lifevault_user', cleanEmail);

      // 5. Decrypt vault data
      if (encVaultPayload) {
        try {
          const decryptedJson = await decryptText(encVaultPayload, keys.encKey);
          setVaultData(JSON.parse(decryptedJson));
        } catch (decErr) {
          console.error('Decryption failed, initializing empty vault:', decErr);
          setVaultData(initialVaultData);
        }
      } else {
        setVaultData(initialVaultData);
      }

    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper to run raw sync with specific key and token
  const syncVaultHelper = async (dataToSync: VaultData, encKey: CryptoKey, currentToken: string) => {
    const plaintextJson = JSON.stringify(dataToSync);
    const encryptedPayload = await encryptText(plaintextJson, encKey);

    const syncRes = await fetch(`${API_BASE}/vault`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ vaultData: encryptedPayload })
    });

    if (!syncRes.ok) {
      throw new Error('Failed to synchronize vault with cloud');
    }
  };

  // Sync / Save Vault Changes
  const syncVault = async (updatedFields: Partial<VaultData>): Promise<void> => {
    if (!isAuthenticated || !token || !masterKeyRef.current || !vaultData) {
      throw new Error('Vault is locked or session expired');
    }
    setLoading(true);
    setError(null);
    try {
      const mergedData = { ...vaultData, ...updatedFields };
      await syncVaultHelper(mergedData, masterKeyRef.current, token);
      setVaultData(mergedData);
    } catch (err: any) {
      setError(err.message || 'Failed to sync vault');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Recover Account using Recovery Key
  const recoverAccount = async (userEmail: string, inputRecoveryKey: string, masterPassword: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = userEmail.toLowerCase().trim();
      const cleanRecKey = inputRecoveryKey.toUpperCase().trim();

      // 1. Fetch recovery payloads
      const fetchPayloadRes = await fetch(`${API_BASE}/auth/recovery-payload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanEmail })
      });
      if (!fetchPayloadRes.ok) {
        const errData = await fetchPayloadRes.json();
        throw new Error(errData.error || 'Account not found');
      }

      const { recoveryPayload, vaultData: encVault } = await fetchPayloadRes.json();
      if (!recoveryPayload) {
        throw new Error('No recovery key is registered for this account');
      }

      // 2. Derive recovery encryption key K_rec = SHA-256(recoveryKey)
      const encoder = new TextEncoder();
      const recBytes = encoder.encode(cleanRecKey);
      const recHashBuffer = await window.crypto.subtle.digest('SHA-256', recBytes);
      const K_rec = await window.crypto.subtle.importKey(
        'raw',
        recHashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // 3. Decrypt old Master Key
      let oldEncKey: CryptoKey;
      try {
        const rawKeyBase64 = await decryptText(recoveryPayload, K_rec);
        const rawKeyBytes = new Uint8Array(base64ToArrayBuffer(rawKeyBase64));
        oldEncKey = await window.crypto.subtle.importKey(
          'raw',
          rawKeyBytes,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (_) {
        throw new Error('Invalid recovery key');
      }

      // 4. Decrypt old Vault JSON
      let oldDecryptedVault = initialVaultData;
      if (encVault) {
        try {
          const jsonText = await decryptText(encVault, oldEncKey);
          oldDecryptedVault = JSON.parse(jsonText);
        } catch (_) {
          console.warn('Failed to decrypt old vault data, defaulting to empty');
        }
      }

      // 5. Generate new credentials
      const newSalt = generateRandomSalt();
      const newKeys = await deriveKeys(masterPassword, newSalt);

      // 6. Generate a new Recovery Key
      const newRecKey = generateRecoveryKey();
      const newRecBytes = encoder.encode(newRecKey);
      const newRecHashBuffer = await window.crypto.subtle.digest('SHA-256', newRecBytes);
      const newK_rec = await window.crypto.subtle.importKey(
        'raw',
        newRecHashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Export new master key encrypted with new recovery key
      const newRawKeyBytes = await window.crypto.subtle.exportKey('raw', newKeys.encKey);
      const newRawKeyBase64 = arrayBufferToBase64(newRawKeyBytes);
      const newRecoveryPayload = await encryptText(newRawKeyBase64, newK_rec);

      const newRecoveryKeyHashBuffer = await window.crypto.subtle.digest('SHA-256', newRecBytes);
      const newRecoveryKeyHashHex = Array.from(new Uint8Array(newRecoveryKeyHashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Re-encrypt the old vault with the new master key
      const newVaultPayload = await encryptText(JSON.stringify(oldDecryptedVault), newKeys.encKey);

      // Send to server
      const resetRes = await fetch(`${API_BASE}/auth/reset-password-with-recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanEmail,
          recoveryKey: cleanRecKey,
          newPasswordHash: newKeys.authHash,
          newSalt,
          newRecoveryPayload,
          newRecoveryKeyHash: newRecoveryKeyHashHex,
          newVaultData: newVaultPayload
        })
      });

      if (!resetRes.ok) {
        const errData = await resetRes.json();
        throw new Error(errData.error || 'Failed to update credentials on server');
      }

      // Complete login locally with new credentials
      masterKeyRef.current = newKeys.encKey;
      setVaultData(oldDecryptedVault);
      setRecoveryKey(newRecKey);
      
      // Request standard token by logging in automatically
      await login(cleanEmail, masterPassword);

      return newRecKey;
    } catch (err: any) {
      setError(err.message || 'Recovery failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Triggers local locking/state reset
  const triggerLocalVaultReset = () => {
    logout();
  };

  const encryptBinary = async (buffer: ArrayBuffer): Promise<EncryptedPayload> => {
    if (!masterKeyRef.current) throw new Error('Vault is locked');
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKeyRef.current,
      buffer
    );
    return {
      iv: arrayBufferToBase64(iv.buffer),
      ciphertext: arrayBufferToBase64(encrypted)
    };
  };

  const decryptBinary = async (payload: EncryptedPayload): Promise<ArrayBuffer> => {
    if (!masterKeyRef.current) throw new Error('Vault is locked');
    const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
    const ciphertext = base64ToArrayBuffer(payload.ciphertext);
    return await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      masterKeyRef.current,
      ciphertext
    );
  };

  return (
    <VaultContext.Provider
      value={{
        isAuthenticated,
        token,
        username,
        vaultData,
        loading,
        error,
        clearError,
        recoveryKey,
        clearRecoveryKey,
        register,
        login,
        logout,
        syncVault,
        recoverAccount,
        triggerLocalVaultReset,
        encryptBinary,
        decryptBinary
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
