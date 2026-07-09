import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import type { AuthenticatorEntry } from '../context/VaultContext';
import { ShieldCheck, Plus, Trash2, Clipboard, Check, X } from 'lucide-react';

// Base32 Decoder
function base32ToBuf(base32: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '');
  const len = clean.length;
  const buf = new Uint8Array(Math.floor((len * 5) / 8));
  
  let val = 0;
  let count = 0;
  let idx = 0;
  
  for (let i = 0; i < len; i++) {
    const c = alphabet.indexOf(clean[i]);
    if (c === -1) continue;
    val = (val << 5) | c;
    count += 5;
    if (count >= 8) {
      buf[idx++] = (val >> (count - 8)) & 255;
      count -= 8;
    }
  }
  return buf.buffer;
}

// Generate TOTP code based on RFC 6238
async function generateTOTP(secretBase32: string): Promise<string> {
  try {
    const keyBytes = base32ToBuf(secretBase32);
    if (keyBytes.byteLength === 0) return '000000';

    const counter = Math.floor(Date.now() / 1000 / 30);
    const counterBuffer = new ArrayBuffer(8);
    const view = new DataView(counterBuffer);
    view.setUint32(4, counter, false);
    view.setUint32(0, 0, false);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      counterBuffer
    );

    const hmacBytes = new Uint8Array(signature);
    const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
    const binary =
      ((hmacBytes[offset] & 0x7f) << 24) |
      ((hmacBytes[offset + 1] & 0xff) << 16) |
      ((hmacBytes[offset + 2] & 0xff) << 8) |
      (hmacBytes[offset + 3] & 0xff);

    const code = binary % 1000000;
    return String(code).padStart(6, '0');
  } catch (err) {
    console.error('TOTP derivation failure:', err);
    return '------';
  }
}

export const TwoFactorAuth: React.FC = () => {
  const { vaultData, syncVault } = useVault();
  const [entries, setEntries] = useState<AuthenticatorEntry[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(30);
  
  // Add dialog state
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [secret, setSecret] = useState('');

  // Local settings for Vault 2FA simulator
  const [vault2FAEnabled, setVault2FAEnabled] = useState<boolean>(() => {
    return localStorage.getItem('lifevault_2fa_enabled') === 'true';
  });
  const [setup2FAMode, setSetup2FAMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupSecret] = useState('LVSEC3KEY2FASIMULATOR1234');
  const [copiedSetupSecret, setCopiedSetupSecret] = useState(false);
  const [setupCodeError, setSetupCodeError] = useState('');

  const savedEntries = vaultData?.authenticatorEntries || [];

  // Update entries from context
  useEffect(() => {
    setEntries(savedEntries);
  }, [savedEntries]);

  // Sync remaining time countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeRemaining(sec);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Recalculate code values
  const refreshCodes = async () => {
    const newCodes: Record<string, string> = {};
    for (const entry of entries) {
      newCodes[entry.id] = await generateTOTP(entry.secret);
    }
    // Also include setup secret if currently enrolling
    if (setup2FAMode) {
      newCodes['setup'] = await generateTOTP(setupSecret);
    }
    setCodes(newCodes);
  };

  useEffect(() => {
    if (entries.length > 0 || setup2FAMode) {
      refreshCodes();
    }
  }, [entries, timeRemaining, setup2FAMode]);

  // Copy to clipboard with success tag
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !issuer || !secret) {
      alert('All fields are required.');
      return;
    }

    // Clean space off secret
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    
    // Quick test if secret is valid base32
    if (!/^[A-Z2-7]+=*$/.test(cleanSecret)) {
      alert('Secret contains invalid Base32 characters. Only characters A-Z and digits 2-7 are allowed.');
      return;
    }

    const newEntry: AuthenticatorEntry = {
      id: crypto.randomUUID(),
      name,
      issuer,
      secret: cleanSecret,
      updatedAt: new Date().toISOString()
    };

    const newList = [...entries, newEntry];
    try {
      await syncVault({ authenticatorEntries: newList });
      setIsAdding(false);
      setName('');
      setIssuer('');
      setSecret('');
    } catch (err: any) {
      alert(err.message || 'Failed to save MFA item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this authenticator entry?')) return;
    const newList = entries.filter(e => e.id !== id);
    try {
      await syncVault({ authenticatorEntries: newList });
    } catch (err: any) {
      alert(err.message || 'Failed to delete MFA item');
    }
  };

  // Turn on/off 2FA for Vault
  const handleVerifySetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupCodeError('');
    
    const correctCode = codes['setup'];
    if (verificationCode === correctCode) {
      localStorage.setItem('lifevault_2fa_enabled', 'true');
      setVault2FAEnabled(true);
      setSetup2FAMode(false);
      setVerificationCode('');
      alert('2FA successfully enabled for LifeVault. You will be prompted for your code on future logins.');
    } else {
      setSetupCodeError('Invalid verification code. Try again.');
    }
  };

  const handleDisable2FA = () => {
    if (confirm('Are you sure you want to disable 2FA security for this vault?')) {
      localStorage.removeItem('lifevault_2fa_enabled');
      setVault2FAEnabled(false);
    }
  };

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Rolling Code list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="cyber-h1" style={{ margin: 0 }}>Authenticator</h2>
            {/* Visual Circular countdown */}
            <div style={{ position: 'relative', width: '28px', height: '28px' }}>
              <svg width="100%" height="100%" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                <circle 
                  cx="10" 
                  cy="10" 
                  r="8" 
                  fill="transparent" 
                  stroke="var(--primary)" 
                  strokeWidth="2" 
                  strokeDasharray={`${(timeRemaining / 30) * 50} 50`}
                  style={{ 
                    transition: 'stroke-dasharray 1s linear',
                    transform: 'rotate(-90deg)',
                    transformOrigin: '50% 50%'
                  }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {timeRemaining}
              </div>
            </div>
          </div>
          <button className="cyber-btn" onClick={() => setIsAdding(true)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Entry
          </button>
        </div>

        {/* Rolling Codes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No rolling codes stored. Add accounts to generate OTP tokens.
            </div>
          ) : (
            entries.map(entry => {
              const code = codes[entry.id] || '------';
              return (
                <div key={entry.id} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>{entry.issuer}</h4>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{entry.name}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      fontSize: '1.8rem', 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: 'bold', 
                      letterSpacing: '2px',
                      color: 'var(--primary)',
                      textShadow: '0 0 10px var(--primary-glow)'
                    }}>
                      {code.slice(0, 3)} {code.slice(3)}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="cyber-btn cyber-btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleCopy(code, entry.id)}>
                        {copiedId === entry.id ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                      </button>
                      <button className="cyber-btn cyber-btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleDelete(entry.id)}>
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Vault 2FA Simulator Settings / Create Entry Form */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Setup Authenticator Item Form */}
        {isAdding && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative', marginBottom: '24px' }}>
            <button style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsAdding(false)}>
              <X size={20} />
            </button>
            <h3 className="cyber-h1" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>New Authenticator Secret</h3>
            
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Issuer *</label>
                <input type="text" className="cyber-input" required placeholder="Google, GitHub, Adobe" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Account Name / Email *</label>
                <input type="text" className="cyber-input" required placeholder="user@domain.com" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Secret Key (Base32) *</label>
                <input type="text" className="cyber-input" required placeholder="JBSWY3DPEHPK3PXP" value={secret} onChange={(e) => setSecret(e.target.value.toUpperCase())} style={{ fontFamily: 'monospace' }} />
              </div>

              <button type="submit" className="cyber-btn" style={{ marginTop: '10px' }}>
                Save Token
              </button>
            </form>
          </div>
        )}

        {/* Vault 2FA Shield Settings Panel */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 className="cyber-h1" style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="var(--primary)" /> Vault Two-Factor Auth
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Secure logins to your LifeVault by requiring a second factor. Enabling this requires inputting a code from your mobile authenticator app.
          </p>

          {vault2FAEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid var(--success)', color: 'var(--success)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck size={28} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Two-Factor Security is Enabled</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Your credentials are protected by rolling codes.</div>
                </div>
              </div>
              <button className="cyber-btn cyber-btn-danger" style={{ width: '100%' }} onClick={handleDisable2FA}>
                Disable 2FA Protection
              </button>
            </div>
          ) : !setup2FAMode ? (
            <button className="cyber-btn" style={{ width: '100%' }} onClick={() => setSetup2FAMode(true)}>
              Activate 2FA Security
            </button>
          ) : (
            <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Render Simulated QR Code */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.1)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Scan QR in Authenticator App:</span>
                {/* Visual Representation of QR Code using SVG */}
                <svg width="120" height="120" style={{ background: '#fff', padding: '6px', borderRadius: '6px' }}>
                  {/* Mock QR pixel cells */}
                  <rect x="10" y="10" width="30" height="30" fill="#000" />
                  <rect x="15" y="15" width="20" height="20" fill="#fff" />
                  <rect x="18" y="18" width="14" height="14" fill="#000" />
                  
                  <rect x="80" y="10" width="30" height="30" fill="#000" />
                  <rect x="85" y="15" width="20" height="20" fill="#fff" />
                  <rect x="88" y="18" width="14" height="14" fill="#000" />

                  <rect x="10" y="80" width="30" height="30" fill="#000" />
                  <rect x="15" y="85" width="20" height="20" fill="#fff" />
                  <rect x="18" y="88" width="14" height="14" fill="#000" />

                  {/* Random pixels */}
                  <rect x="50" y="20" width="10" height="20" fill="#000" />
                  <rect x="65" y="40" width="15" height="10" fill="#000" />
                  <rect x="45" y="60" width="10" height="10" fill="#000" />
                  <rect x="60" y="70" width="20" height="15" fill="#000" />
                  <rect x="85" y="65" width="10" height="10" fill="#000" />
                  <rect x="50" y="90" width="15" height="15" fill="#000" />
                </svg>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Manual Setup Secret</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
                    <span>{setupSecret}</span>
                    <button 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                      onClick={() => {
                        navigator.clipboard.writeText(setupSecret);
                        setCopiedSetupSecret(true);
                        setTimeout(() => setCopiedSetupSecret(false), 2000);
                      }}
                    >
                      {copiedSetupSecret ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verify OTP field */}
              <form onSubmit={handleVerifySetup2FA} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {setupCodeError && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', background: 'rgba(255, 51, 102, 0.05)', padding: '6px', border: '1px solid var(--danger)', borderRadius: '4px' }}>
                    {setupCodeError}
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    className="cyber-input" 
                    maxLength={6} 
                    required 
                    placeholder="000 000" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\s+/g, ''))}
                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', fontFamily: 'var(--font-display)' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="cyber-btn" style={{ flex: 1 }}>Verify & Enable</button>
                  <button type="button" className="cyber-btn cyber-btn-secondary" onClick={() => setSetup2FAMode(false)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
