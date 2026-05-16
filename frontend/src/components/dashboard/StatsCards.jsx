import React from 'react'

const styles = {
  statCard: { background: '#fff', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' },
  statEmoji: { fontSize: '32px', margin: 0 },
  statValue: { fontSize: '32px', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-1px' },
  statLabel: { fontSize: '14px', color: '#64748b', fontWeight: '600', margin: 0 },
  statSub: { fontSize: '12px', color: '#94a3b8', margin: 0 }
}

export function StatCard({ emoji, label, value, sub, color }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `4px solid ${color}` }}>
      <p style={styles.statEmoji}>{emoji}</p>
      <p style={styles.statValue}>{value}</p>
      <p style={styles.statLabel}>{label}</p>
      {sub && <p style={styles.statSub}>{sub}</p>}
    </div>
  )
}

export default function StatsCards({ stats }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
            ))}
        </div>
    )
}
