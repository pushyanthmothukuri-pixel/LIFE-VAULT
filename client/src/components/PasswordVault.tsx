import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import type { PasswordItem } from '../context/VaultContext';
import { calculatePasswordEntropy } from '../services/crypto';
import { Key, Search, Plus, Eye, EyeOff, Clipboard, Check, Trash2, Edit2, ExternalLink, X, Shuffle } from 'lucide-react';

export const PasswordVault: React.FC = () => {
  const { vaultData, syncVault } = useVault();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Selection & Modal States
  const [selectedItem, setSelectedItem] = useState<PasswordItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Clipboard Tooltip state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [clipboardTimeout, setClipboardTimeout] = useState<number | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [usernameField, setUsernameField] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('login');

  // Generator Widget States
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  // Toggle reveal
  const [revealPassword, setRevealPassword] = useState(false);

  const passwords = vaultData?.passwords || [];

  // Filter passwords
  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'all') return matchesSearch;
    return matchesSearch && p.category === activeCategory;
  });

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'login', label: 'Login' },
    { value: 'social', label: 'Social' },
    { value: 'work', label: 'Work' },
    { value: 'finance', label: 'Finance' },
    { value: 'other', label: 'Other' }
  ];

  // Copy helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    
    if (clipboardTimeout) clearTimeout(clipboardTimeout);
    
    const timeout = setTimeout(() => {
      setCopiedField(null);
    }, 3000);
    
    setClipboardTimeout(Number(timeout));
  };

  // Generate secure password
  const generatePassword = () => {
    let charset = '';
    if (genUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (genLower) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (genNumbers) charset += '0123456789';
    if (genSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
      alert('Please select at least one character set.');
      return;
    }

    const bytes = window.crypto.getRandomValues(new Uint8Array(genLength));
    let result = '';
    for (let i = 0; i < genLength; i++) {
      result += charset[bytes[i] % charset.length];
    }
    setPasswordValue(result);
  };

  // Open Form for Adding
  const handleOpenAdd = () => {
    setTitle('');
    setUsernameField('');
    setPasswordValue('');
    setUrl('');
    setNotes('');
    setCategory('login');
    setIsAdding(true);
    setIsEditing(false);
  };

  // Open Form for Editing
  const handleOpenEdit = (item: PasswordItem) => {
    setTitle(item.title);
    setUsernameField(item.username);
    setPasswordValue(item.passwordValue);
    setUrl(item.url);
    setNotes(item.notes);
    setCategory(item.category);
    setIsEditing(true);
    setIsAdding(false);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !usernameField || !passwordValue) {
      alert('Please fill out all required fields.');
      return;
    }

    const now = new Date().toISOString();
    let updatedPasswordsList: PasswordItem[] = [];

    if (isAdding) {
      const newItem: PasswordItem = {
        id: crypto.randomUUID(),
        title,
        username: usernameField,
        passwordValue,
        url,
        notes,
        category,
        updatedAt: now
      };
      updatedPasswordsList = [...passwords, newItem];
    } else if (isEditing && selectedItem) {
      updatedPasswordsList = passwords.map(p => 
        p.id === selectedItem.id 
          ? { ...p, title, username: usernameField, passwordValue, url, notes, category, updatedAt: now }
          : p
      );
    }

    try {
      await syncVault({ passwords: updatedPasswordsList });
      setIsAdding(false);
      setIsEditing(false);
      // Update selected item detail view
      if (isEditing && selectedItem) {
        setSelectedItem(updatedPasswordsList.find(p => p.id === selectedItem.id) || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save item');
    }
  };

  // Delete Item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this password item?')) return;
    
    const updatedList = passwords.filter(p => p.id !== id);
    try {
      await syncVault({ passwords: updatedList });
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    }
  };

  const entropy = passwordValue ? calculatePasswordEntropy(passwordValue) : null;

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Items List & Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="cyber-h1" style={{ margin: 0 }}>Passwords</h2>
          <button className="cyber-btn" onClick={handleOpenAdd} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Password
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '13px' }} />
          <input 
            type="text" 
            className="cyber-input" 
            placeholder="Search account title, username, url..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '42px' }}
          />
        </div>

        {/* Categories Tab Row */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                background: activeCategory === cat.value ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: activeCategory === cat.value ? '#000' : 'var(--text-secondary)',
                border: '1px solid ' + (activeCategory === cat.value ? 'var(--primary)' : 'var(--border-glass)'),
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Passwords list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredPasswords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No passwords found.
            </div>
          ) : (
            filteredPasswords.map(p => (
              <div 
                key={p.id}
                className={`glass-panel ${selectedItem?.id === p.id ? 'glass-panel-active' : ''}`}
                onClick={() => { setSelectedItem(p); setIsAdding(false); setIsEditing(false); }}
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(189, 0, 255, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <Key size={18} color="var(--secondary)" />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{p.title}</h4>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.username}</span>
                  </div>
                </div>
                <span style={{ 
                  fontSize: '0.65rem', 
                  textTransform: 'uppercase', 
                  border: '1px solid var(--border-glass)', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  color: 'var(--text-muted)'
                }}>
                  {p.category}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Detail View / Forms */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Detail Panel */}
        {!isAdding && !isEditing && selectedItem && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 className="cyber-h1" style={{ margin: 0 }}>{selectedItem.title}</h3>
                {selectedItem.url && (
                  <a href={selectedItem.url.startsWith('http') ? selectedItem.url : `https://${selectedItem.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', textDecoration: 'none' }}>
                    {selectedItem.url} <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="cyber-btn cyber-btn-secondary" onClick={() => handleOpenEdit(selectedItem)} style={{ padding: '8px 12px' }}>
                  <Edit2 size={14} />
                </button>
                <button className="cyber-btn cyber-btn-danger" onClick={() => handleDelete(selectedItem.id)} style={{ padding: '8px 12px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Username row */}
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Username</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{selectedItem.username}</div>
                </div>
                <button className="cyber-btn cyber-btn-secondary" onClick={() => copyToClipboard(selectedItem.username, 'user')} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
                  {copiedField === 'user' ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                </button>
              </div>

              {/* Password row */}
              <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Password</span>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '500', fontFamily: revealPassword ? 'monospace' : 'initial', letterSpacing: revealPassword ? '1px' : '0' }}>
                    {revealPassword ? selectedItem.passwordValue : '••••••••••••'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="cyber-btn cyber-btn-secondary" onClick={() => setRevealPassword(!revealPassword)} style={{ padding: '6px 10px' }}>
                    {revealPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button className="cyber-btn cyber-btn-secondary" onClick={() => copyToClipboard(selectedItem.passwordValue, 'pass')} style={{ padding: '6px 10px' }}>
                    {copiedField === 'pass' ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                  </button>
                </div>
              </div>

              {copiedField === 'pass' && (
                <div className="pulse-glow" style={{ fontSize: '0.75rem', color: 'var(--warning)', background: 'rgba(255, 183, 0, 0.1)', border: '1px solid var(--warning)', padding: '6px 10px', borderRadius: '4px', textAlign: 'center' }}>
                  Clipboard filled! For security, clear it after pasting.
                </div>
              )}

              {selectedItem.notes && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Notes</span>
                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                    {selectedItem.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add / Edit Form Panel */}
        {(isAdding || isEditing) && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsAdding(false); setIsEditing(false); }}>
              <X size={20} />
            </button>
            <h3 className="cyber-h1" style={{ fontSize: '1.2rem', marginBottom: '24px' }}>
              {isAdding ? 'Create New Entry' : 'Edit Entry'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Title *</label>
                  <input type="text" className="cyber-input" required placeholder="Google, Bank, etc." value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Category</label>
                  <select className="cyber-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                    <option value="login">Login</option>
                    <option value="social">Social</option>
                    <option value="work">Work</option>
                    <option value="finance">Finance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Username / Email *</label>
                <input type="text" className="cyber-input" required placeholder="user@gmail.com" value={usernameField} onChange={(e) => setUsernameField(e.target.value)} />
              </div>

              {/* Password & Generator widget */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Password *</label>
                  <button type="button" onClick={generatePassword} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <Shuffle size={14} /> Quick Gen
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={revealPassword ? 'text' : 'password'} 
                    className="cyber-input" 
                    required 
                    placeholder="Input or Generate" 
                    value={passwordValue} 
                    onChange={(e) => setPasswordValue(e.target.value)} 
                    style={{ paddingRight: '40px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setRevealPassword(!revealPassword)}
                    style={{ background: 'transparent', border: 'none', position: 'absolute', right: '14px', top: '14px', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {revealPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {passwordValue && entropy && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Strength:</span>
                    <span style={{ color: entropy.color, fontWeight: 'bold' }}>{entropy.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({Math.round(entropy.entropy)} bits entropy)</span>
                  </div>
                )}
              </div>

              {/* Secure Password Generator Expansion widget */}
              <div style={{ border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '10px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shuffle size={12} /> Custom Generator Settings
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Length:</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{genLength}</span>
                  </div>
                  <input 
                    type="range" 
                    min="8" 
                    max="64" 
                    value={genLength} 
                    onChange={(e) => setGenLength(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genUpper} onChange={(e) => setGenUpper(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                    <span>A-Z (Uppercase)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genLower} onChange={(e) => setGenLower(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                    <span>a-z (Lowercase)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                    <span>0-9 (Numbers)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} style={{ accentColor: 'var(--primary)' }} />
                    <span>!@#$ (Special)</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Login Website URL</label>
                <input type="text" className="cyber-input" placeholder="https://website.com" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes</label>
                <textarea className="cyber-input" placeholder="Security questions, PINs, etc." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <button type="submit" className="cyber-btn" style={{ marginTop: '10px' }}>
                {isAdding ? 'Save Entry' : 'Update Entry'}
              </button>
            </form>
          </div>
        )}

        {/* Empty Pane helper */}
        {!isAdding && !isEditing && !selectedItem && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)', padding: '40px' }}>
            <Key size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
            <span>Select a password record from the list to view its contents, or create a new password.</span>
          </div>
        )}
      </div>

    </div>
  );
};
