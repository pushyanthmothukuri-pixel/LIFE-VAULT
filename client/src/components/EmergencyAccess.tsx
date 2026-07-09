import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import type { EmergencyContact } from '../context/VaultContext';
import { generateRecoveryKey } from '../services/crypto';
import { UserCheck, Plus, Trash2, ShieldAlert, Clipboard, Check, X, ShieldCheck, AlertCircle } from 'lucide-react';

export const EmergencyAccess: React.FC = () => {
  const { vaultData, syncVault } = useVault();
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Spouse');

  // Simulation states
  const [simActiveRequest, setSimActiveRequest] = useState<string | null>(null); // Contact email currently requesting
  const [simCountdown, setSimCountdown] = useState<number>(0);
  const [simStatus, setSimStatus] = useState<'idle' | 'countdown' | 'completed' | 'revoked'>('idle');
  const [inputEmergKey, setInputEmergKey] = useState('');
  const [simDecryptedData, setSimDecryptedData] = useState<any>(null);

  // Key sharing display states
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const contacts = vaultData?.emergencyContacts || [];

  // Countdown timer effect for simulation
  useEffect(() => {
    let timer: any;
    if (simStatus === 'countdown' && simCountdown > 0) {
      timer = setTimeout(() => {
        setSimCountdown(prev => prev - 1);
      }, 1000);
    } else if (simStatus === 'countdown' && simCountdown === 0) {
      setSimStatus('completed');
    }
    return () => clearTimeout(timer);
  }, [simStatus, simCountdown]);

  // Copy helper
  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRelationship('Spouse');
    setGeneratedKey(null);
    setIsAdding(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      alert('Name and Email are required.');
      return;
    }

    // Generate Emergency Recovery Key (wrapped crypto setup)
    const rawEmergencyKey = 'EMERG-' + generateRecoveryKey();

    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase().trim(),
      phone,
      relationship,
      accessGranted: false,
      accessKey: rawEmergencyKey,
      updatedAt: new Date().toISOString()
    };

    const newList = [...contacts, newContact];
    try {
      await syncVault({ emergencyContacts: newList });
      setGeneratedKey(rawEmergencyKey); // Store locally to display once
      setIsAdding(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save emergency contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this emergency contact?')) return;
    const newList = contacts.filter(c => c.id !== id);
    try {
      await syncVault({ emergencyContacts: newList });
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete contact');
    }
  };

  // Start simulated emergency request
  const startSimulation = (contactEmail: string) => {
    setSimActiveRequest(contactEmail);
    setSimCountdown(15); // Simulated security delay: 15 seconds (representing 7 days)
    setSimStatus('countdown');
    setSimDecryptedData(null);
    setInputEmergKey('');
  };

  // Revoke simulation request
  const revokeSimulationRequest = () => {
    setSimStatus('revoked');
    setSimActiveRequest(null);
    setSimCountdown(0);
    alert('Access request immediately revoked! Security keys recycled. Emergency contact block updated.');
  };

  // Simulated login using the emergency key
  const verifyEmergencyAccess = async () => {
    const activeContact = contacts.find(c => c.email === simActiveRequest);
    if (!activeContact) return;

    if (inputEmergKey.trim() === activeContact.accessKey) {
      // Successfully simulated decryption! Show mock data
      setSimDecryptedData({
        passwordsCount: vaultData?.passwords.length || 0,
        cardsCount: vaultData?.cards.length || 0,
        documentsCount: vaultData?.documents.length || 0,
        message: 'DEC_SUCCESS: Vault decrypted under legacy guidelines.'
      });
    } else {
      alert('Authentication failure: Invalid emergency recovery key.');
    }
  };

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Contacts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="cyber-h1" style={{ margin: 0 }}>Legacy Contacts</h2>
          <button className="cyber-btn" onClick={handleOpenAdd} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Contact
          </button>
        </div>

        {/* Display generated key on setup */}
        {generatedKey && (
          <div className="glass-panel pulse-glow" style={{ padding: '20px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid var(--primary)', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setGeneratedKey(null)}>
              <X size={16} />
            </button>
            <h4 style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase' }}>Legacy Key Generated</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Give this key to your contact. In an emergency, they can use it to request access.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#000', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'monospace', color: 'var(--primary)' }}>
              <span>{generatedKey}</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={copyToClipboard}>
                {copiedKey ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
              </button>
            </div>
          </div>
        )}

        {/* Contact List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {contacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No emergency contacts registered. Setup a digital legacy trustee.
            </div>
          ) : (
            contacts.map(c => (
              <div 
                key={c.id}
                className={`glass-panel ${selectedContact?.id === c.id ? 'glass-panel-active' : ''}`}
                onClick={() => { setSelectedContact(c); setGeneratedKey(null); }}
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <UserCheck size={18} color="var(--success)" />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>{c.name}</h4>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{c.relationship} | {c.email}</span>
                  </div>
                </div>
                <button 
                  className="cyber-btn cyber-btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                  onClick={(e) => { e.stopPropagation(); startSimulation(c.email); }}
                >
                  Simulate Request
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Contact Detail View & Simulation Workspace */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Contact details */}
        {!isAdding && selectedContact && simStatus === 'idle' && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 className="cyber-h1" style={{ margin: 0, fontSize: '1.2rem' }}>{selectedContact.name}</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Trustee Status: Active</span>
              </div>
              <button className="cyber-btn cyber-btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleDelete(selectedContact.id)}>
                <Trash2 size={14} /> Remove Contact
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedContact.email}</span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Relationship</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedContact.relationship}</span>
                </div>
              </div>
              
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Security Delay Interval</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} color="var(--warning)" /> 7 Days (Verifiable lock period before vault opening)
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '10px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Simulation Console</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Trigger a simulated event where this contact requests access. You will see how the security lock delay prevents unauthorized extraction.
                </p>
                <button className="cyber-btn" style={{ width: '100%' }} onClick={() => startSimulation(selectedContact.email)}>
                  Simulate Access Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simulation Console workspace */}
        {simStatus !== 'idle' && (
          <div className="glass-panel slide-in" style={{ padding: '30px', border: '1px solid ' + (simStatus === 'completed' ? 'var(--success)' : 'var(--danger)') }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: simStatus === 'completed' ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <ShieldAlert size={18} /> EMERGENCY SIMULATION MODE
              </h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setSimStatus('idle')}>
                <X size={18} />
              </button>
            </div>

            {/* Countdown phase */}
            {simStatus === 'countdown' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255, 51, 102, 0.1)', padding: '12px 20px', borderRadius: '6px', border: '1px solid var(--danger)', width: '100%' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Access Request Initiated by {simActiveRequest}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Vault will unlock unless revoked within delay.</div>
                </div>

                <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: 'var(--accent)', textShadow: '0 0 10px var(--accent-glow)', fontWeight: 'bold' }}>
                  {simCountdown}s
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>(Simulated 7-day cooldown timer)</span>

                <button 
                  className="cyber-btn cyber-btn-danger" 
                  style={{ width: '100%', fontSize: '0.9rem', height: '45px' }}
                  onClick={revokeSimulationRequest}
                >
                  Revoke & Cancel Request
                </button>
              </div>
            )}

            {/* Completed Cooldown phase */}
            {simStatus === 'completed' && !simDecryptedData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid var(--success)', fontSize: '0.85rem', color: 'var(--success)' }}>
                  Security delay expired. Trustee is authorized to unlock vault.
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Enter Emergency Recovery Key</label>
                  <input 
                    type="text" 
                    className="cyber-input" 
                    placeholder="EMERG-AAAA-BBBB..." 
                    value={inputEmergKey} 
                    onChange={(e) => setInputEmergKey(e.target.value.toUpperCase())}
                    style={{ fontFamily: 'monospace', textAlign: 'center', letterSpacing: '1px' }}
                  />
                </div>

                <button className="cyber-btn" onClick={verifyEmergencyAccess} style={{ width: '100%' }}>
                  Decrypt Vault Database
                </button>
              </div>
            )}

            {/* Decrypted Vault visualization */}
            {simDecryptedData && (
              <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'rgba(0, 255, 136, 0.05)', border: '1px solid var(--success)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldCheck size={28} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.90rem', color: 'var(--text-primary)' }}>LEGACY ACCESS GRANTED</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Vault successfully decrypted client-side.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--primary)', margin: 0, textTransform: 'uppercase' }}>Extracted Credentials Summary</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                    <div>Passwords: {simDecryptedData.passwordsCount} accounts</div>
                    <div>Bank Cards: {simDecryptedData.cardsCount} cards</div>
                    <div>Documents: {simDecryptedData.documentsCount} files</div>
                  </div>
                </div>

                <button className="cyber-btn cyber-btn-secondary" onClick={() => setSimStatus('idle')} style={{ width: '100%' }}>
                  Close Simulation Workspace
                </button>
              </div>
            )}

            {simStatus === 'revoked' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
                <X size={40} color="var(--danger)" style={{ background: 'rgba(255, 51, 102, 0.1)', padding: '10px', borderRadius: '50%' }} />
                <div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Request Cancelled</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>The access sequence was aborted. Zero-knowledge lock remains secure.</p>
                </div>
                <button className="cyber-btn cyber-btn-secondary" onClick={() => setSimStatus('idle')} style={{ width: '100%' }}>
                  Back to Trustees list
                </button>
              </div>
            )}

          </div>
        )}

        {/* Add trustee form */}
        {isAdding && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsAdding(false)}>
              <X size={20} />
            </button>
            <h3 className="cyber-h1" style={{ fontSize: '1.1rem', marginBottom: '24px' }}>New Trustee</h3>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Trustee Name *</label>
                <input type="text" className="cyber-input" required placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Trustee Email Address *</label>
                <input type="email" className="cyber-input" required placeholder="contact@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Phone Number</label>
                  <input type="text" className="cyber-input" placeholder="+1 (555) 019-2834" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Relationship</label>
                  <select className="cyber-input" value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Lawyer">Lawyer</option>
                    <option value="Friend">Friend</option>
                  </select>
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '12px', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
                <span>Creating a contact generates a unique, one-time emergency legacy key. This contact has a 7-day verification threshold before they can decrypt database copies in emergencies.</span>
              </div>

              <button type="submit" className="cyber-btn" style={{ marginTop: '10px' }}>
                Register Contact & Generate Key
              </button>
            </form>
          </div>
        )}

        {/* Empty Pane helper */}
        {!isAdding && !selectedContact && simStatus === 'idle' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)', padding: '40px' }}>
            <UserCheck size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
            <span>Select a Legacy contact from the list or register a new trustee to manage digital legacy access.</span>
          </div>
        )}

      </div>

    </div>
  );
};
