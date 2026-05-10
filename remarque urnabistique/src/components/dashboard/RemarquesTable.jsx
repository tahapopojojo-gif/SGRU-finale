import React from 'react'

const styles = {
  tableWrapper: { background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #f1f5f9' },
  tableTitle: { fontSize: '18px', fontWeight: '800', margin: 0, color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc' },
  td: { padding: '16px 24px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  statusBadge: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block' },
  actionBtn: { padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: '0.2s' },
  filters: { display: 'flex', gap: '10px' },
  filterSelect: { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }
}

const STATUS_STYLES = {
  urgent: { bg: '#fef2f2', color: '#dc2626', label: 'Urgent' },
  active: { bg: '#fffbeb', color: '#d97706', label: 'Actif' },
  planning: { bg: '#f0fdf4', color: '#16a34a', label: 'Planifié' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
  rejected: { bg: '#f1f5f9', color: '#64748b', label: 'Rejeté' },
}

export default function RemarquesTable({ remarques, onSelectRemark, filterCategory, setFilterCategory, filterPeriod, setFilterPeriod, buildingTypes }) {
  return (
    <div style={styles.tableWrapper}>
      <div style={styles.tableHeader}>
        <h3 style={styles.tableTitle}>Liste des Remarques</h3>
        
        {/* Filtres de la table */}
        <div style={styles.filters}>
            <select style={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory && setFilterCategory(e.target.value)}>
                <option value="all">Toutes Catégories</option>
                {buildingTypes && buildingTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
            <select style={styles.filterSelect} value={filterPeriod} onChange={e => setFilterPeriod && setFilterPeriod(e.target.value)}>
                <option value="all">Toute Période</option>
                <option value="30days">30 Derniers Jours</option>
            </select>
        </div>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Projet / Titre</th>
            <th style={styles.th}>Ville</th>
            <th style={styles.th}>Catégorie</th>
            <th style={styles.th}>Statut</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {remarques.map(r => (
            <tr key={r.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ ...styles.td, fontWeight: '600', color: '#0f172a' }}>{r.name || 'Projet citoyen'}</td>
              <td style={styles.td}>{r.city}</td>
              <td style={styles.td}>{r.building_type}</td>
              <td style={styles.td}>
                <span style={{ ...styles.statusBadge, background: STATUS_STYLES[r.status]?.bg, color: STATUS_STYLES[r.status]?.color }}>
                  {STATUS_STYLES[r.status]?.label}
                </span>
              </td>
              <td style={styles.td}>
                <button style={styles.actionBtn} onClick={() => onSelectRemark(r)}>
                  Analyser →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
