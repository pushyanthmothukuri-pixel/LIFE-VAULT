import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import type { PasswordItem } from '../context/VaultContext';
import { calculatePasswordEntropy } from '../services/crypto';
import { ShieldCheck, AlertTriangle, RefreshCw, Key, ShieldAlert } from 'lucide-react';

const COMMON_COMPROMISED_PASSWORDS = [
  '123456', 'password', '123456789', '12345', '12345678', 'qwerty', '111111', '1234567',
  'dragon', 'pussy', 'letmein', 'football', 'monkey', 'charlie', 'admin', 'welcome',
  'shadow', 'solomon', 'security', 'password123', 'admin123', 'root', 'superman', 'princess',
  '123123', '654321', '987654321', 'asdfghjk', 'iloveyou', 'starwars', 'killer', 'secret'
];

export const PasswordHealth: React.FC = () => {
  const { vaultData } = useVault();
  const [isScanning, setIsScanning] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  const passwords = vaultData?.passwords || [];

  // Scan trigger animation
  const triggerScan = () => {
    setIsScanning(true);
    setAuditComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setAuditComplete(true);
    }, 1500);
  };

  useEffect(() => {
    if (passwords.length > 0 && !auditComplete) {
      triggerScan();
    }
  }, [passwords.length]);

  // Auditor calculations
  const runAudit = () => {
    const weakItems: PasswordItem[] = [];
    const reusedGroups: Record<string, PasswordItem[]> = {};
    const compromisedItems: PasswordItem[] = [];

    // Find occurrences
    const occurrences: Record<string, PasswordItem[]> = {};
    passwords.forEach(p => {
      occurrences[p.passwordValue] = occurrences[p.passwordValue] || [];
      occurrences[p.passwordValue].push(p);
    });

    passwords.forEach(p => {
      const entropyInfo = calculatePasswordEntropy(p.passwordValue);
      // Weak if entropy under 60 bits
      if (entropyInfo.entropy < 60) {
        weakItems.push(p);
      }

      // Reused if more than 1 occurrences
      if (occurrences[p.passwordValue].length > 1) {
        reusedGroups[p.passwordValue] = occurrences[p.passwordValue];
      }

      // Compromised if inside known weak list
      if (COMMON_COMPROMISED_PASSWORDS.includes(p.passwordValue.toLowerCase())) {
        compromisedItems.push(p);
      }
    });

    const reusedCount = Object.values(reusedGroups).reduce((acc, curr) => acc + curr.length, 0);

    return {
      weakItems,
      reusedGroups: Object.entries(reusedGroups),
      reusedCount,
      compromisedItems
    };
  };

  const audit = runAudit();

  const totalIssues = audit.weakItems.length + audit.reusedCount + audit.compromisedItems.length;

  return (
    <div className="slide-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 className="cyber-h1" style={{ margin: 0 }}>Password Health</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Automated scanner audits for weak, reused, and compromised passwords.</p>
        </div>
        <button 
          className="cyber-btn" 
          onClick={triggerScan} 
          disabled={isScanning || passwords.length === 0}
          style={{ padding: '8px 16px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={isScanning ? 'pulse-glow' : ''} style={{ animation: isScanning ? 'spin 1.5s linear infinite' : 'none' }} />
          {isScanning ? 'Auditing Vault...' : 'Scan Now'}
        </button>
      </div>

      {passwords.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-glass)' }}>
          <ShieldCheck size={48} color="var(--success)" style={{ opacity: 0.2, marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Passwords Stored</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Add some passwords in the passwords manager to begin security health auditing.</p>
        </div>
      ) : isScanning ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '20px' }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <div className="pulse-glow" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid var(--primary)', borderRadius: '50%', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }}></div>
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, border: '4px dashed var(--secondary)', borderRadius: '50%', animation: 'spin 3s linear infinite' }}></div>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-secondary)' }}>Scanning Encrypted Records...</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Audit Dashboard Summary */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ background: totalIssues > 0 ? 'rgba(255, 51, 102, 0.1)' : 'rgba(0, 255, 136, 0.1)', padding: '16px', borderRadius: '50%' }}>
              {totalIssues > 0 ? (
                <ShieldAlert size={36} color="var(--danger)" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 51, 102, 0.3))' }} />
              ) : (
                <ShieldCheck size={36} color="var(--success)" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.3))' }} />
              )}
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '4px' }}>
                {totalIssues > 0 ? `${totalIssues} Security Alerts Found` : 'Your Vault is Healthy!'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {totalIssues > 0 
                  ? 'We recommend updating weak and reused passwords immediately to defend against credential stuffing attacks.'
                  : 'Great job! None of your passwords are weak, reused, or compromised.'
                }
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* 1. Compromised Block */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                <ShieldAlert size={18} /> Compromised ({audit.compromisedItems.length})
              </h4>
              
              {audit.compromisedItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No compromised passwords found in leaked dictionaries.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {audit.compromisedItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 51, 102, 0.05)', border: '1px solid rgba(255, 51, 102, 0.2)', padding: '10px 14px', borderRadius: '6px' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>{item.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.username}</div>
                      </div>
                      <span style={{ fontSize: '0.65rem', background: 'var(--danger)', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Breached</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Weak Passwords Block */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                <AlertTriangle size={18} /> Weak Passwords ({audit.weakItems.length})
              </h4>
              
              {audit.weakItems.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No weak passwords (low entropy) detected.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {audit.weakItems.map(item => {
                    const ent = calculatePasswordEntropy(item.passwordValue);
                    return (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 183, 0, 0.05)', border: '1px solid rgba(255, 183, 0, 0.2)', padding: '10px 14px', borderRadius: '6px' }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>{item.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.username}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: ent.color, fontWeight: 'bold' }}>{Math.round(ent.entropy)} bits</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Reused Passwords Block */}
            <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 1' }}>
              <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                <Key size={18} /> Reused Passwords ({audit.reusedGroups.length} groups)
              </h4>
              
              {audit.reusedGroups.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recycled passwords found. Good job!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {audit.reusedGroups.map(([passwordValue, items]) => (
                    <div key={passwordValue} style={{ background: 'rgba(189, 0, 255, 0.03)', border: '1px solid rgba(189, 0, 255, 0.15)', padding: '12px 14px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Shared Password:</span>
                        <span style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{items.length} accounts</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {items.map(item => (
                          <div 
                            key={item.id} 
                            style={{ 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--border-glass)', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {item.title} ({item.username})
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
