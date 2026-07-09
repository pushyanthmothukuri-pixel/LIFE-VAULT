// Web Crypto API Zero-Knowledge Helpers

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

// Convert ArrayBuffer to Base64 String
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Convert Base64 String to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a 512-bit key using PBKDF2 with SHA-256
// First 256 bits are used for vault encryption (AES-GCM-256)
// Second 256 bits are converted to hex to serve as the server-side authentication key
export interface DerivedKeys {
  encKey: CryptoKey;
  authHash: string;
}

export async function deriveKeys(password: string, saltHex: string): Promise<DerivedKeys> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Convert hex salt to Uint8Array
  const saltBytes = new Uint8Array(
    saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Import raw password as key material
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 512 bits (64 bytes)
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    512
  );

  const derivedBytes = new Uint8Array(derivedBits);
  const encBytes = derivedBytes.slice(0, 32);
  const authBytes = derivedBytes.slice(32, 64);

  // Import the encryption key bytes into a CryptoKey for AES-GCM
  const encKey = await window.crypto.subtle.importKey(
    'raw',
    encBytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Convert auth key bytes to hex string for login authentication
  const authHash = Array.from(authBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { encKey, authHash };
}

// Generate a random 16-byte salt as hex string
export function generateRandomSalt(): string {
  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate a random 24-character recovery key (alphanumeric, grouped by hyphens)
export function generateRecoveryKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = window.crypto.getRandomValues(new Uint8Array(20));
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  // Group as AAAA-BBBB-CCCC-DDDD-EEEE
  return result.match(/.{1,4}/g)!.join('-');
}

// Encrypt plain text using AES-256-GCM
export async function encryptText(plaintext: string, key: CryptoKey): Promise<EncryptedPayload> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    dataBytes
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encryptedBuffer)
  };
}

// Decrypt ciphertext using AES-256-GCM
export async function decryptText(payload: EncryptedPayload, key: CryptoKey): Promise<string> {
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// Password Strength Entropy Calculator
// Returns entropy in bits and a descriptive score
export function calculatePasswordEntropy(password: string): { entropy: number; label: 'Weak' | 'Medium' | 'Strong' | 'Excellent'; color: string } {
  if (!password) return { entropy: 0, label: 'Weak', color: '#ff4d4d' };
  
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33; // Approx special char count

  if (poolSize === 0) poolSize = 1;

  const entropy = password.length * Math.log2(poolSize);

  if (entropy < 40) return { entropy, label: 'Weak', color: '#ff4d4d' }; // Red
  if (entropy < 60) return { entropy, label: 'Medium', color: '#ffa64d' }; // Orange
  if (entropy < 80) return { entropy, label: 'Strong', color: '#33cc33' }; // Green
  return { entropy, label: 'Excellent', color: '#00ffff' }; // Cyan/Neon Blue
}
