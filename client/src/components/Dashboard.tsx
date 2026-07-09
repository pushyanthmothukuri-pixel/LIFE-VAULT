import React from 'react';
import { useVault } from '../context/VaultContext';
import type { VaultData } from '../context/VaultContext';
import { calculatePasswordEntropy } from '../services/crypto';
import { Key, CreditCard, FileText, BellRing, AlertTriangle, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { vaultData, username } = useVault();

  const getDashboardStats = (data: VaultData | null) => {
    if (!data) return { totalPasswords: 0, totalCards: 0, totalDocs: 0, totalSubs: 0, healthScore: 100, weakCount: 0, reusedCount: 0 };

    const totalPasswords = data.passwords.length;
    const totalCards = data.cards.length;
    const totalDocs = data.documents.length;
    const totalSubs = data.subscriptions.length;

    // Calculate password health stats
    let weakCount = 0;
    const passwordVals = data.passwords.map(p => p.passwordValue);
    const reusedSet = new Set<string>();
    
    // Find reused passwords
    const occurrences: Record<string, number> = {};
    passwordVals.forEach(val => {
      occurrences[val] = (occurrences[val] || 0) + 1;
    });

    data.passwords.forEach(p => {
      const entropyInfo = calculatePasswordEntropy(p.passwordValue);
      if (entropyInfo.label === 'Weak') weakCount++;
      if (occurrences[p.passwordValue] > 1) {
        reusedSet.add(p.id);
      }
    });

    const reusedCount = reusedSet.size;

    // Health score calculations (starting from 100)
    let score = 100;
    if (totalPasswords > 0) {
      const weakPenalty = (weakCount / totalPasswords) * 50; // Max 50 points off
      const reusedPenalty = (reusedCount / totalPasswords) * 50; // Max 50 points off
      score = Math.max(0, Math.round(100 - (weakPenalty + reusedPenalty)));
    }

    return {
      totalPasswords,
      totalCards,
      totalDocs,
      totalSubs,
      healthScore: score,
      weakCount,
      reusedCount
    };
  };

  const stats = getDashboardStats(vaultData);

  // Calculate monthly subscription expenditure
  const calculateSubscriptionCost = () => {
    if (!vaultData || !vaultData.subscriptions.length) return 0;
    return vaultData.subscriptions.reduce((total, sub) => {
      const cost = Number(sub.cost) || 0;
      if (sub.billingCycle === 'yearly') {
        return total + (cost / 12);
      }
      return total + cost;
    }, 0);
  };

  const monthlySpend = calculateSubscriptionCost();
  const yearlySpend = monthlySpend * 12;

  // Determine health color and message
  let healthColor = 'var(--success)';
  let healthText = 'Vault Secure';
  let healthIcon = <CheckCircle size={28} color="var(--success)" />;

  if (stats.healthScore < 50) {
    healthColor = 'var(--danger)';
    healthText = 'Critical Vulnerability';
    healthIcon = <AlertTriangle size={28} color="var(--danger)" />;
  } else if (stats.healthScore < 85) {
    healthColor = 'var(--warning)';
    healthText = 'Action Recommended';
    healthIcon = <AlertTriangle size={28} color="var(--warning)" />;
  }

  // Draw custom SVG charts representation for category-wise cost breakdown
  const getCategorySpendData = () => {
    if (!vaultData) return [];
    const categories: Record<string, number> = {};
    vaultData.subscriptions.forEach(sub => {
      const cost = Number(sub.cost) || 0;
      const mCost = sub.billingCycle === 'yearly' ? cost / 12 : cost;
      const cat = sub.category || 'Other';
      categories[cat] = (categories[cat] || 0) + mCost;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  const categorySpend = getCategorySpendData();
  const maxSpend = categorySpend.length ? Math.max(...categorySpend.map(c => c.value)) : 1;

  return (
    <div className="slide-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="cyber-h1">Dashboard</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome back, <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{username}</span>. Your local vault is decrypted and synced.</p>
      </div>

      {/* Grid of Security Score + Quick Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Security Audit Score Circle */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg width="100%" height="100%" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background ring */}
              <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              {/* Progress ring */}
              <circle 
                cx="20" 
                cy="20" 
                r="15.915" 
                fill="transparent" 
                stroke={healthColor} 
                strokeWidth="3" 
                strokeDasharray={`${stats.healthScore} ${100 - stats.healthScore}`}
                strokeDashoffset="0"
                style={{ 
                  transition: 'stroke-dasharray 0.5s ease-in-out',
                  filter: `drop-shadow(0 0 4px ${healthColor})`
                }}
              />
            </svg>
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)'
            }}>
              {stats.healthScore}%
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {healthIcon}
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: healthColor }}>{healthText}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
              {stats.totalPasswords === 0 
                ? 'No passwords stored yet. Add items to audit strength.' 
                : `Auditing ${stats.totalPasswords} password records.`
              }
            </p>
            {stats.totalPasswords > 0 && (stats.weakCount > 0 || stats.reusedCount > 0) && (
              <button 
                onClick={() => setActiveTab('health')}
                className="cyber-btn cyber-btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              >
                Resolve issues
              </button>
            )}
          </div>
        </div>

        {/* Subscription Cost Widget */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Projected Expenses</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)', textShadow: '0 0 10px var(--primary-glow)' }}>
                  ${monthlySpend.toFixed(2)}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>/ mo</span>
              </div>
            </div>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <TrendingUp size={24} color="var(--primary)" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Annual Projection:</span>
            </div>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${yearlySpend.toFixed(2)} / yr</span>
          </div>
        </div>
      </div>

      {/* Main Categories Row */}
      <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Vault Directory</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Passwords Category Card */}
        <div className="glass-panel" onClick={() => setActiveTab('passwords')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(189, 0, 255, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <Key size={24} color="var(--secondary)" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Passwords</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.totalPasswords} accounts stored</p>
          </div>
        </div>

        {/* Cards Category Card */}
        <div className="glass-panel" onClick={() => setActiveTab('cards')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <CreditCard size={24} color="var(--primary)" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Bank Cards</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.totalCards} credit cards</p>
          </div>
        </div>

        {/* Documents Category Card */}
        <div className="glass-panel" onClick={() => setActiveTab('docs')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255, 0, 127, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <FileText size={24} color="var(--accent)" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Documents</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.totalDocs} encrypted files</p>
          </div>
        </div>

        {/* Subscriptions Category Card */}
        <div className="glass-panel" onClick={() => setActiveTab('subs')} style={{ padding: '20px', cursor: 'pointer', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0, 255, 136, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <BellRing size={24} color="var(--success)" />
          </div>
          <div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '600' }}>Subscriptions</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.totalSubs} active plans</p>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown */}
      {categorySpend.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '20px' }}>Monthly Spend breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categorySpend.map((cat, idx) => {
              const colors = ['var(--primary)', 'var(--secondary)', 'var(--accent)', 'var(--success)', 'var(--warning)'];
              const col = colors[idx % colors.length];
              const pct = (cat.value / maxSpend) * 100;
              return (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>${cat.value.toFixed(2)}/mo</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      background: col, 
                      width: `${pct}%`,
                      boxShadow: `0 0 10px ${col}`,
                      borderRadius: '4px',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
