import React, { useState } from 'react';
import { useVault } from './context/VaultContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { PasswordVault } from './components/PasswordVault';
import { CardVault } from './components/CardVault';
import { DocumentVault } from './components/DocumentVault';
import { SubscriptionTracker } from './components/SubscriptionTracker';
import { PasswordHealth } from './components/PasswordHealth';
import { TwoFactorAuth } from './components/TwoFactorAuth';
import { EmergencyAccess } from './components/EmergencyAccess';

import { 
  Shield, 
  LayoutDashboard, 
  Key, 
  CreditCard, 
  FileText, 
  BellRing, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  LogOut, 
  DownloadCloud, 
  UploadCloud
} from 'lucide-react';

const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};
const API_BASE = getBaseUrl();

export const App: React.FC = () => {
  const { 
    isAuthenticated, 
    username, 
    token, 
    logout, 
    triggerLocalVaultReset 
  } = useVault();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [importing, setImporting] = useState(false);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Export encrypted JSON database payload
  const handleExportBackup = async () => {
    try {
      setSyncStatus('syncing');
      const res = await fetch(`${API_BASE}/api/vault`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const { vaultData } = await res.json();
      
      if (!vaultData) {
        alert("Your vault is empty. Add some credentials before exporting a backup.");
        setSyncStatus('synced');
        return;
      }

      const backupObj = {
        app: 'LifeVault',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        username: username,
        encryptedPayload: vaultData // Contains iv and ciphertext of the whole database
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lifevault_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      alert("Failed to export backup.");
    }
  };

  // Import encrypted JSON database payload
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setImporting(true);
    setSyncStatus('syncing');

    try {
      const text = await file.text();
      const backupObj = JSON.parse(text);

      if (backupObj.app !== 'LifeVault' || !backupObj.encryptedPayload) {
        throw new Error("Invalid file format. Please upload a valid LifeVault backup JSON.");
      }

      // Propose restoration to user
      if (!confirm("Restoring a backup will overwrite your current vault. Do you want to proceed?")) {
        setImporting(false);
        setSyncStatus('synced');
        return;
      }

      // Try uploading the encrypted payload directly to the server
      const syncRes = await fetch(`${API_BASE}/api/vault`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vaultData: backupObj.encryptedPayload })
      });

      if (!syncRes.ok) {
        throw new Error("Failed to restore backup database on server.");
      }

      setSyncStatus('synced');
      setImporting(false);
      alert("Backup payload synchronized to cloud! Please log in again to decrypt and verify the imported records.");
      
      // Lock vault to force a refresh decryption using their key
      triggerLocalVaultReset();

    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setImporting(false);
      alert(err.message || "Failed to import backup file.");
    }
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="glass-panel" style={{ 
        height: '100vh', 
        borderRadius: 0, 
        borderLeft: 'none', 
        borderTop: 'none', 
        borderBottom: 'none',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        padding: '24px' 
      }}>
        <div>
          {/* Logo Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
            <Shield size={24} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 6px var(--primary-glow))' }} />
            <h1 className="cyber-logo" style={{ fontSize: '1.3rem', margin: 0 }}>LifeVault</h1>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'dashboard' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                color: activeTab === 'dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'dashboard' ? 'rgba(0, 229, 255, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('passwords')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'passwords' ? 'rgba(189, 0, 255, 0.08)' : 'transparent',
                color: activeTab === 'passwords' ? 'var(--secondary)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'passwords' ? 'rgba(189, 0, 255, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <Key size={18} /> Passwords
            </button>
            <button 
              onClick={() => setActiveTab('cards')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'cards' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                color: activeTab === 'cards' ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'cards' ? 'rgba(0, 229, 255, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <CreditCard size={18} /> Bank Cards
            </button>
            <button 
              onClick={() => setActiveTab('docs')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'docs' ? 'rgba(255, 0, 127, 0.08)' : 'transparent',
                color: activeTab === 'docs' ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'docs' ? 'rgba(255, 0, 127, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <FileText size={18} /> Documents
            </button>
            <button 
              onClick={() => setActiveTab('subs')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'subs' ? 'rgba(0, 255, 136, 0.08)' : 'transparent',
                color: activeTab === 'subs' ? 'var(--success)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'subs' ? 'rgba(0, 255, 136, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <BellRing size={18} /> Subscriptions
            </button>
            <button 
              onClick={() => setActiveTab('health')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'health' ? 'rgba(255, 183, 0, 0.08)' : 'transparent',
                color: activeTab === 'health' ? 'var(--warning)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'health' ? 'rgba(255, 183, 0, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={18} /> Vault Health
            </button>
            <button 
              onClick={() => setActiveTab('mfa')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'mfa' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                color: activeTab === 'mfa' ? 'var(--primary)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'mfa' ? 'rgba(0, 229, 255, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={18} /> Authenticator
            </button>
            <button 
              onClick={() => setActiveTab('emerg')} 
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px 16px', borderRadius: '8px',
                background: activeTab === 'emerg' ? 'rgba(0, 255, 136, 0.08)' : 'transparent',
                color: activeTab === 'emerg' ? 'var(--success)' : 'var(--text-secondary)',
                border: '1px solid ' + (activeTab === 'emerg' ? 'rgba(0, 255, 136, 0.15)' : 'transparent'),
                cursor: 'pointer', textAlign: 'left', fontWeight: '500', transition: 'all 0.2s'
              }}
            >
              <UserCheck size={18} /> Legacy Trustee
            </button>
          </nav>
        </div>

        {/* User profile / manual lock */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: '#000' }}>
              {username?.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{username}</div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Master Key Loaded</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button className="cyber-btn cyber-btn-secondary" onClick={triggerLocalVaultReset} style={{ padding: '8px', fontSize: '0.75rem', gap: '4px' }}>
              <Lock size={12} /> Lock
            </button>
            <button className="cyber-btn cyber-btn-danger" onClick={logout} style={{ padding: '8px', fontSize: '0.75rem', gap: '4px' }}>
              <LogOut size={12} /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header bar */}
        <header style={{ 
          padding: '16px 40px', 
          borderBottom: '1px solid var(--border-glass)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Synced indicator status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="pulse-glow" style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: syncStatus === 'synced' ? 'var(--success)' : syncStatus === 'syncing' ? 'var(--warning)' : 'var(--danger)'
            }} />
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
              {syncStatus === 'synced' && 'Cloud Sync: Active'}
              {syncStatus === 'syncing' && 'Cloud Sync: Syncing...'}
              {syncStatus === 'error' && 'Cloud Sync: Disconnected'}
            </span>
          </div>

          {/* Backup Import/Export widgets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Import Backup */}
            <label className="cyber-btn cyber-btn-secondary" style={{ padding: '8px 14px', fontSize: '0.75rem', cursor: 'pointer', margin: 0 }}>
              <UploadCloud size={14} /> Import Backup
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                style={{ display: 'none' }} 
                disabled={importing}
              />
            </label>

            {/* Export Backup */}
            <button className="cyber-btn cyber-btn-secondary" onClick={handleExportBackup} style={{ padding: '8px 14px', fontSize: '0.75rem' }}>
              <DownloadCloud size={14} /> Export Backup
            </button>
          </div>
        </header>

        {/* Viewport page contents */}
        <section style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'passwords' && <PasswordVault />}
          {activeTab === 'cards' && <CardVault />}
          {activeTab === 'docs' && <DocumentVault />}
          {activeTab === 'subs' && <SubscriptionTracker />}
          {activeTab === 'health' && <PasswordHealth />}
          {activeTab === 'mfa' && <TwoFactorAuth />}
          {activeTab === 'emerg' && <EmergencyAccess />}
        </section>
      </main>

    </div>
  );
};
export default App;
