import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { calculatePasswordEntropy } from '../services/crypto';
import { Shield, Key, Eye, EyeOff, Lock, User, RefreshCw, Clipboard, Check } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register, recoverAccount, error, loading, recoveryKey, clearRecoveryKey, clearError } = useVault();
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inputRecKey, setInputRecKey] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmRecKeyCopied, setConfirmRecKeyCopied] = useState(false);

  const passwordEntropy = mode === 'register' ? calculatePasswordEntropy(password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (mode === 'login') {
      try {
        await login(email, password);
      } catch (_) {}
    } else if (mode === 'register') {
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
      try {
        await register(email, password);
      } catch (_) {}
    } else if (mode === 'recover') {
      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }
      try {
        await recoverAccount(email, inputRecKey, password);
      } catch (_) {}
    }
  };

  const copyToClipboard = () => {
    if (recoveryKey) {
      navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (recoveryKey) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-panel slide-in" style={{ padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '16px', borderRadius: '50%', width: 'fit-content', margin: '0 auto 20px auto' }}>
            <Key size={40} color="var(--primary)" />
          </div>
          <h2 className="cyber-logo" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Secure Your Recovery Key</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
            This key allows you to restore your vault and reset your password if you forget it. The administrator cannot recover this key for you! Store it in a password-safe place.
          </p>

          <div style={{ 
            background: 'rgba(0, 0, 0, 0.4)', 
            border: '1px dashed var(--primary)', 
            padding: '16px', 
            borderRadius: '8px', 
            fontFamily: 'monospace', 
            fontSize: '1.2rem', 
            letterSpacing: '1px',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            <span>{recoveryKey}</span>
            <button 
              type="button" 
              onClick={copyToClipboard}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              {copiedKey ? <Check size={20} color="var(--success)" /> : <Clipboard size={20} />}
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem' }}>
            <input 
              type="checkbox" 
              checked={confirmRecKeyCopied} 
              onChange={(e) => setConfirmRecKeyCopied(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            <span style={{ color: 'var(--text-primary)' }}>I have written down or saved my Recovery Key in a safe place.</span>
          </label>

          <button 
            type="button" 
            className="cyber-btn" 
            disabled={!confirmRecKeyCopied}
            onClick={clearRecoveryKey}
            style={{ width: '100%', opacity: confirmRecKeyCopied ? 1 : 0.5, cursor: confirmRecKeyCopied ? 'pointer' : 'not-allowed' }}
          >
            Enter My Vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel slide-in" style={{ padding: '36px', width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
          <Shield size={32} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
          <h1 className="cyber-logo" style={{ fontSize: '2rem' }}>LifeVault</h1>
        </div>

        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {mode === 'login' && 'Your Digital Life, Secured'}
          {mode === 'register' && 'Create Zero-Knowledge Account'}
          {mode === 'recover' && 'Recover Encrypted Vault'}
        </p>

        {error && (
          <div style={{ background: 'rgba(255, 51, 102, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input 
                type="email" 
                className="cyber-input" 
                required 
                placeholder="your@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          {mode === 'recover' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recovery Key</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type="text" 
                  className="cyber-input" 
                  required 
                  placeholder="AAAA-BBBB-CCCC-DDDD-EEEE" 
                  value={inputRecKey}
                  onChange={(e) => setInputRecKey(e.target.value.toUpperCase())}
                  style={{ paddingLeft: '40px', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {mode === 'recover' ? 'New Master Password' : 'Master Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="cyber-input" 
                required 
                placeholder={mode === 'register' ? 'Min 8 chars, strong' : '••••••••'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'transparent', border: 'none', position: 'absolute', right: '14px', top: '15px', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'register' && password && passwordEntropy && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Security Level:</span>
                <span style={{ color: passwordEntropy.color, fontWeight: 'bold' }}>{passwordEntropy.label}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: passwordEntropy.color, 
                  width: `${Math.min(100, (passwordEntropy.entropy / 100) * 100)}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          )}

          {(mode === 'register' || mode === 'recover') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Confirm Master Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  className="cyber-input" 
                  required 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          )}

          <button type="submit" className="cyber-btn" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="pulse-glow" size={18} style={{ animation: 'spin 2s linear infinite' }} />
                Processing...
              </>
            ) : (
              <>
                <Shield size={18} />
                {mode === 'login' && 'Unlock Vault'}
                {mode === 'register' && 'Register Vault'}
                {mode === 'recover' && 'Reset & Unlock'}
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', fontSize: '0.8rem' }}>
          {mode === 'login' ? (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>
                Need a secure account?{' '}
                <button type="button" onClick={() => { setMode('register'); clearError(); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Register</button>
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Forgot your password?{' '}
                <button type="button" onClick={() => { setMode('recover'); clearError(); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}>Recover Account</button>
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>
              Back to unlock screen?{' '}
              <button type="button" onClick={() => { setMode('login'); clearError(); }} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
