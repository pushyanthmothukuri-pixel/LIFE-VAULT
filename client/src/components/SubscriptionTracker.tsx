import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import type { SubscriptionItem } from '../context/VaultContext';
import { BellRing, Plus, Edit2, Trash2, X, DollarSign, Calendar, AlertCircle } from 'lucide-react';

export const SubscriptionTracker: React.FC = () => {
  const { vaultData, syncVault } = useVault();
  const [selectedItem, setSelectedItem] = useState<SubscriptionItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [cost, setCost] = useState('9.99');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [nextBillingDate, setNextBillingDate] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [reminderDays, setReminderDays] = useState('3');

  const subscriptions = vaultData?.subscriptions || [];

  // Match provider colors for sleek styling
  const getProviderStyle = (provName: string) => {
    const term = provName.toLowerCase();
    if (term.includes('netflix')) return { color: '#e50914', bg: 'rgba(229, 9, 20, 0.1)' };
    if (term.includes('spotify')) return { color: '#1db954', bg: 'rgba(29, 185, 84, 0.1)' };
    if (term.includes('github') || term.includes('git')) return { color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.1)' };
    if (term.includes('aws') || term.includes('amazon')) return { color: '#ff9900', bg: 'rgba(255, 153, 0, 0.1)' };
    if (term.includes('youtube')) return { color: '#ff0000', bg: 'rgba(255, 0, 0, 0.1)' };
    if (term.includes('adobe')) return { color: '#ff007f', bg: 'rgba(255, 0, 127, 0.1)' };
    if (term.includes('microsoft') || term.includes('office')) return { color: '#00a4ef', bg: 'rgba(0, 164, 239, 0.1)' };
    if (term.includes('disney')) return { color: '#0063e5', bg: 'rgba(0, 99, 229, 0.1)' };
    
    // Default
    return { color: 'var(--primary)', bg: 'rgba(0, 229, 255, 0.1)' };
  };

  // Sort subscriptions by renewal date
  const sortedSubscriptions = [...subscriptions].sort((a, b) => {
    return new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime();
  });

  // Check if a subscription is renewing soon
  const isRenewingSoon = (dateStr: string, warnDays: number): boolean => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const renewal = new Date(dateStr);
    renewal.setHours(0,0,0,0);
    
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 && diffDays <= warnDays;
  };

  // Cost summaries
  const monthlyProjected = subscriptions.reduce((total, sub) => {
    const cVal = Number(sub.cost) || 0;
    return total + (sub.billingCycle === 'yearly' ? cVal / 12 : cVal);
  }, 0);

  const yearlyProjected = monthlyProjected * 12;

  // Open Forms
  const handleOpenAdd = () => {
    setName('');
    setCost('9.99');
    setBillingCycle('monthly');
    setNextBillingDate(new Date().toISOString().split('T')[0]);
    setCategory('Entertainment');
    setReminderDays('3');
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (item: SubscriptionItem) => {
    setName(item.name);
    setCost(String(item.cost));
    setBillingCycle(item.billingCycle);
    setNextBillingDate(item.nextBillingDate);
    setCategory(item.category);
    setReminderDays(String(item.reminderDays));
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cost || !nextBillingDate) {
      alert('Please fill out all required fields.');
      return;
    }

    const now = new Date().toISOString();
    let updatedList: SubscriptionItem[] = [];

    if (isAdding) {
      const newItem: SubscriptionItem = {
        id: crypto.randomUUID(),
        name,
        cost: Number(cost),
        billingCycle,
        nextBillingDate,
        category,
        reminderDays: Number(reminderDays),
        updatedAt: now
      };
      updatedList = [...subscriptions, newItem];
    } else if (isEditing && selectedItem) {
      updatedList = subscriptions.map(s => 
        s.id === selectedItem.id
          ? { 
              ...s, 
              name, 
              cost: Number(cost), 
              billingCycle, 
              nextBillingDate, 
              category, 
              reminderDays: Number(reminderDays), 
              updatedAt: now 
            }
          : s
      );
    }

    try {
      await syncVault({ subscriptions: updatedList });
      setIsAdding(false);
      setIsEditing(false);
      if (isEditing && selectedItem) {
        setSelectedItem(updatedList.find(s => s.id === selectedItem.id) || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save subscription');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    const updatedList = subscriptions.filter(s => s.id !== id);
    try {
      await syncVault({ subscriptions: updatedList });
      setSelectedItem(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete subscription');
    }
  };

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Metrics & Subscription Schedule */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="cyber-h1" style={{ margin: 0 }}>Subscriptions</h2>
          <button className="cyber-btn" onClick={handleOpenAdd} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            <Plus size={16} /> Add Subscription
          </button>
        </div>

        {/* Expenses Overview widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monthly Cost</span>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)', fontSize: '1.4rem', marginTop: '4px' }}>
              ${monthlyProjected.toFixed(2)}
            </h3>
          </div>
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Annual Cost</span>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--secondary)', fontSize: '1.4rem', marginTop: '4px' }}>
              ${yearlyProjected.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Schedule List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedSubscriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No subscriptions registered.
            </div>
          ) : (
            sortedSubscriptions.map(sub => {
              const brandStyle = getProviderStyle(sub.name);
              const soon = isRenewingSoon(sub.nextBillingDate, sub.reminderDays);

              return (
                <div 
                  key={sub.id}
                  className={`glass-panel ${selectedItem?.id === sub.id ? 'glass-panel-active' : ''}`}
                  onClick={() => { setSelectedItem(sub); setIsAdding(false); setIsEditing(false); }}
                  style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ background: brandStyle.bg, padding: '10px', borderRadius: '8px' }}>
                      <BellRing size={18} color={brandStyle.color} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>{sub.name}</h4>
                        {soon && (
                          <span style={{ background: 'rgba(255, 51, 102, 0.1)', color: 'var(--danger)', fontSize: '0.65rem', border: '1px solid var(--danger)', padding: '1px 4px', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <AlertCircle size={10} /> Renewing Soon
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        ${sub.cost.toFixed(2)} / {sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} color="var(--text-muted)" />
                      {new Date(sub.nextBillingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Category: {sub.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Detail Viewer / Form */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {/* Detail Panel */}
        {!isAdding && !isEditing && selectedItem && (
          <div className="glass-panel slide-in" style={{ padding: '30px', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ background: getProviderStyle(selectedItem.name).bg, padding: '12px', borderRadius: '10px' }}>
                  <BellRing size={24} color={getProviderStyle(selectedItem.name).color} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.2rem' }}>{selectedItem.name}</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{selectedItem.category}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="cyber-btn cyber-btn-secondary" style={{ padding: '8px 12px' }} onClick={() => handleOpenEdit(selectedItem)}>
                  <Edit2 size={14} />
                </button>
                <button className="cyber-btn cyber-btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleDelete(selectedItem.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Cost Box */}
              <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subscription Price</span>
                  <div style={{ fontSize: '1.4rem', color: 'var(--primary)', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
                    ${selectedItem.cost.toFixed(2)}
                  </div>
                </div>
                <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', border: '1px solid var(--border-glass)', padding: '4px 10px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                  {selectedItem.billingCycle}
                </span>
              </div>

              {/* Renewal details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Next Bill Date</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                    <Calendar size={14} color="var(--primary)" />
                    {new Date(selectedItem.nextBillingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border-glass)', padding: '12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Renewal Alert</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {selectedItem.reminderDays} days before renewal
                  </span>
                </div>
              </div>
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
              {isAdding ? 'Register Subscription' : 'Edit Subscription'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Service Name *</label>
                <input type="text" className="cyber-input" required placeholder="e.g. Netflix, AWS, Spotify" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cost *</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '15px' }} />
                    <input type="number" step="0.01" className="cyber-input" required placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} style={{ paddingLeft: '32px' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Billing Cycle</label>
                  <select className="cyber-input" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value as any)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Next Billing Date *</label>
                  <input type="date" className="cyber-input" required value={nextBillingDate} onChange={(e) => setNextBillingDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Alert Me Before (Days)</label>
                  <input type="number" className="cyber-input" min="0" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Category</label>
                <select className="cyber-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--text-primary)' }}>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities (Cloud/Server)</option>
                  <option value="Software">Software Tools</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button type="submit" className="cyber-btn" style={{ marginTop: '10px' }}>
                {isAdding ? 'Register Plan' : 'Update Plan'}
              </button>
            </form>
          </div>
        )}

        {/* Empty Pane helper */}
        {!isAdding && !isEditing && !selectedItem && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)', padding: '40px' }}>
            <BellRing size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
            <span>Select a subscription plan from the list to preview details, edit or register a new alert.</span>
          </div>
        )}

      </div>
    </div>
  );
};
