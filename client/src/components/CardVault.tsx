import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import type { CardItem } from '../context/VaultContext';
import { CreditCard, Plus, Eye, EyeOff, Clipboard, Check, Trash2, Edit2, X } from 'lucide-react';

export const CardVault: React.FC = () => {
  const { vaultData, syncVault } = useVault();
  const [selectedItem, setSelectedItem] = useState<CardItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Hover or toggle flip state for 3D card visualization
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealDetails, setRevealDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form Fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('01');
  const [expiryYear, setExpiryYear] = useState('2026');
  const [cvv, setCvv] = useState('');
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');

  const cards = vaultData?.cards || [];

  // Brand detector helper
  const detectCardBrand = (num: string): string => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(cleanNum)) return 'MasterCard';
    if (/^3[47]/.test(cleanNum)) return 'Amex';
    return 'Generic';
  };

  const getBrandClass = (brand: string): string => {
    if (brand === 'Visa') return 'brand-visa';
    if (brand === 'MasterCard') return 'brand-mastercard';
    if (brand === 'Amex') return 'brand-amex';
    return 'brand-default';
  };

  // Format Card Number with Spaces
  const formatCardNumberDisplay = (num: string): string => {
    const clean = num.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join(' ') || num;
  };

  const maskCardNumber = (num: string): string => {
    const clean = num.replace(/\s+/g, '');
    if (clean.length < 12) return '•••• •••• •••• ••••';
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
  };

  // Clipboard copy
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''));
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open forms
  const handleOpenAdd = () => {
    setCardholderName('');
    setCardNumber('');
    setExpiryMonth('01');
    setExpiryYear('2026');
    setCvv('');
    setNickname('');
    setNotes('');
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (item: CardItem) => {
    setCardholderName(item.cardholderName);
    setCardNumber(item.cardNumber);
    setExpiryMonth(item.expiryMonth);
    setExpiryYear(item.expiryYear);
    setCvv(item.cvv);
    setNickname(item.nickname);
    setNotes(item.notes);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardholderName || !cardNumber || !cvv) {
      alert('Please fill out all required fields.');
      return;
    }

    const brand = detectCardBrand(cardNumber);
    const now = new Date().toISOString();
    let updatedCardsList: CardItem[] = [];

    if (isAdding) {
      const newItem: CardItem = {
        id: crypto.randomUUID(),
        cardholderName,
        cardNumber: cardNumber.replace(/\D/g, ''),
        expiryMonth,
        expiryYear,
        cvv,
        nickname: nickname || brand + ' Card',
        brand,
        notes,
        updatedAt: now
      };
      updatedCardsList = [...cards, newItem];
    } else if (isEditing && selectedItem) {
      updatedCardsList = cards.map(c => 
        c.id === selectedItem.id
          ? { 
              ...c, 
              cardholderName, 
              cardNumber: cardNumber.replace(/\D/g, ''), 
              expiryMonth, 
              expiryYear, 
              cvv, 
              nickname: nickname || brand + ' Card', 
              brand, 
              notes, 
              updatedAt: now 
            }
          : c
      );
    }

    try {
      await syncVault({ cards: updatedCardsList });
      setIsAdding(false);
      setIsEditing(false);
      if (isEditing && selectedItem) {
        setSelectedItem(updatedCardsList.find(c => c.id === selectedItem.id) || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save card');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit card record?')) return;
    const updatedList = cards.filter(c => c.id !== id);
    try {
      await syncVault({ cards: updatedList });
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete card');
    }
  };

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="cyber-h1" style={{ margin: 0 }}>Cards</h2>
          <button className="cyber-btn" onClick={handleOpenAdd} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Card
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No cards stored yet.
            </div>
          ) : (
            cards.map(c => (
              <div 
                key={c.id}
                className={`glass-panel ${selectedItem?.id === c.id ? 'glass-panel-active' : ''}`}
                onClick={() => { setSelectedItem(c); setIsAdding(false); setIsEditing(false); setIsFlipped(false); }}
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <CreditCard size={18} color="var(--primary)" />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{c.nickname}</h4>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {c.brand} (ending in {c.cardNumber.slice(-4)})
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.expiryMonth}/{c.expiryYear.slice(-2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: 3D Visualization / Add Form */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Detail Panel */}
        {!isAdding && !isEditing && selectedItem && (
          <div className="glass-panel slide-in" style={{ padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            
            {/* Visual Credit Card Component */}
            <div 
              className={`card-perspective ${isFlipped ? 'flipped' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="card-inner">
                {/* Card Front */}
                <div className={`credit-card-front ${getBrandClass(selectedItem.brand)}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>
                      {selectedItem.nickname}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 'bold' }}>
                      {selectedItem.brand}
                    </div>
                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', letterSpacing: '2px', wordSpacing: '4px', textAlign: 'center', margin: '20px 0' }}>
                    {revealDetails ? formatCardNumberDisplay(selectedItem.cardNumber) : maskCardNumber(selectedItem.cardNumber)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.7 }}>Cardholder</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.5px' }}>{selectedItem.cardholderName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', opacity: 0.7 }}>Expires</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{selectedItem.expiryMonth}/{selectedItem.expiryYear.slice(-2)}</div>
                    </div>
                  </div>
                </div>

                {/* Card Back */}
                <div className={`credit-card-back ${getBrandClass(selectedItem.brand)}`}>
                  <div className="card-magnetic-strip"></div>
                  <div>
                    <div style={{ fontSize: '0.5rem', color: '#fff', textTransform: 'uppercase', marginLeft: '24px', marginBottom: '2px' }}>Authorized Signature</div>
                    <div className="card-signature-area">
                      <span style={{ fontSize: '0.85rem' }}>{revealDetails ? selectedItem.cvv : '•••'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.55rem', opacity: 0.6, padding: '0 24px', textAlign: 'center' }}>
                    Secure Vault Data. Do not share key credentials with third parties.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              * Click the card to flip it and reveal details.
            </div>

            {/* Quick Actions & Copiers */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', gap: '12px' }}>
                <button className="cyber-btn cyber-btn-secondary" style={{ flex: 1 }} onClick={() => setRevealDetails(!revealDetails)}>
                  {revealDetails ? <EyeOff size={16} /> : <Eye size={16} />}
                  {revealDetails ? 'Hide Numbers' : 'Show Numbers'}
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="cyber-btn cyber-btn-secondary" onClick={() => handleOpenEdit(selectedItem)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button className="cyber-btn cyber-btn-danger" onClick={() => handleDelete(selectedItem.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              {/* Number copier */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Card Number</span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {revealDetails ? formatCardNumberDisplay(selectedItem.cardNumber) : maskCardNumber(selectedItem.cardNumber)}
                  </div>
                </div>
                <button className="cyber-btn cyber-btn-secondary" style={{ padding: '6px 10px' }} onClick={() => copyToClipboard(selectedItem.cardNumber, 'card')}>
                  {copiedField === 'card' ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                </button>
              </div>

              {/* CVV & expiry row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CVV / CVC</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {revealDetails ? selectedItem.cvv : '•••'}
                    </div>
                  </div>
                  <button className="cyber-btn cyber-btn-secondary" style={{ padding: '6px 10px' }} onClick={() => copyToClipboard(selectedItem.cvv, 'cvv')}>
                    {copiedField === 'cvv' ? <Check size={14} color="var(--success)" /> : <Clipboard size={14} />}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expiry Date</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {selectedItem.expiryMonth} / {selectedItem.expiryYear}
                    </div>
                  </div>
                </div>
              </div>

              {selectedItem.notes && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Card Notes</span>
                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {selectedItem.notes}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Add/Edit Form Panel */}
        {(isAdding || isEditing) && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            <button style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setIsAdding(false); setIsEditing(false); }}>
              <X size={20} />
            </button>
            <h3 className="cyber-h1" style={{ fontSize: '1.2rem', marginBottom: '24px' }}>
              {isAdding ? 'Register Bank Card' : 'Edit Bank Card'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cardholder Name *</label>
                <input type="text" className="cyber-input" required placeholder="JOHN DOE" value={cardholderName} onChange={(e) => setCardholderName(e.target.value.toUpperCase())} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Card Number *</label>
                <input 
                  type="text" 
                  className="cyber-input" 
                  required 
                  maxLength={19}
                  placeholder="4000 1234 5678 9010" 
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(formatCardNumberDisplay(e.target.value))} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expiry Month</label>
                  <select className="cyber-input" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Expiry Year</label>
                  <select className="cyber-input" value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                    {Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() + i)).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>CVV *</label>
                  <input type="text" className="cyber-input" required maxLength={4} placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Card Nickname</label>
                <input type="text" className="cyber-input" placeholder="e.g. Personal Visa, Business" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes</label>
                <textarea className="cyber-input" placeholder="Billing address, bank support line, etc." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: '60px' }} />
              </div>

              <button type="submit" className="cyber-btn" style={{ marginTop: '10px' }}>
                {isAdding ? 'Register Card' : 'Update Card'}
              </button>
            </form>
          </div>
        )}

        {/* Empty Pane helper */}
        {!isAdding && !isEditing && !selectedItem && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)', padding: '40px' }}>
            <CreditCard size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
            <span>Select a bank card from the list to preview details, edit or register a new card.</span>
          </div>
        )}

      </div>
    </div>
  );
};
