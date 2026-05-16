import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPendingUsers, getAllUsers, updateUser } from '../services/adminApi'
import { unwrap } from '../utils/unwrap';

const styles = {
  wrapper: { background: '#f8fafc', minHeight: '100vh', paddingBottom: '50px' },
  container: { padding: '100px 40px 20px', maxWidth: '1200px', margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0 },
  tabs: { display: 'flex', gap: '15px' },
  tabBtn: { padding: '10px 20px', border: '1px solid #0f3460', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' },
  activeTab: { background: '#0f3460', color: '#fff' },
  inactiveTab: { background: '#fff', color: '#0f3460' },
  card: { background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' },
  td: { padding: '12px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  approveBtn: { padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginRight: '10px' },
  rejectBtn: { padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  select: { padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }
}

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'all'
  const [users, setUsers] = useState([])

  const fetchData = async () => {
    if (activeTab === 'pending') {
      const res = await getPendingUsers()
      setUsers(unwrap(res)) 
    } else {
      const res = await getAllUsers()
      setUsers(unwrap(res)) 
    }
  }

  useEffect(() => { fetchData() }, [activeTab])

  const handleStatusUpdate = async (id, newStatus) => {
    await updateUser(id, { statut: newStatus })
    fetchData()
  }

  const handleRoleUpdate = async (id, newRole) => {
    await updateUser(id, { role: newRole })
    fetchData()
  }

  return (
    <div style={styles.wrapper}>
      <Navbar />
      
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>Super Administration</h2>
          <div style={styles.tabs}>
            <button 
                onClick={() => setActiveTab('pending')}
                style={{ ...styles.tabBtn, ...(activeTab === 'pending' ? styles.activeTab : styles.inactiveTab) }}
            >
              En attente ({activeTab === 'pending' ? users.length : '?'})
            </button>
            <button 
                onClick={() => setActiveTab('all')}
                style={{ ...styles.tabBtn, ...(activeTab === 'all' ? styles.activeTab : styles.inactiveTab) }}
            >
              Tous les utilisateurs
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Département / Ville</th>
                <th style={styles.th}>Rôle Demandé</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{...styles.td, fontWeight: '600'}}>{u.nom}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    {u.company_name && `${u.company_name} / `}
                    {u.city ? u.city.charAt(0).toUpperCase() + u.city.slice(1) : '-'}
                  </td>
                  <td style={styles.td}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: '#eff6ff', color: '#3b82f6' }}>
                          {u.role?.toUpperCase() || 'CITOYEN'}
                      </span>
                  </td>
                  <td style={styles.td}>
                      <span style={{ 
                          padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', 
                          background: u.statut === 'active' ? '#dcfce7' : u.statut === 'rejected' ? '#fee2e2' : '#fef3c7', 
                          color: u.statut === 'active' ? '#16a34a' : u.statut === 'rejected' ? '#dc2626' : '#d97706' 
                      }}>
                          {u.statut?.toUpperCase() || 'ACTIVE'}
                      </span>
                  </td>
                  <td style={styles.td}>
                    {activeTab === 'pending' ? (
                        <>
                            <button style={styles.approveBtn} onClick={() => handleStatusUpdate(u.id, 'active')}>Activer</button>
                            <button style={styles.rejectBtn} onClick={() => handleStatusUpdate(u.id, 'rejected')}>Refuser</button>
                        </>
                    ) : (
                        <div style={{display: 'flex', gap: '10px'}}>
                            <select 
                                style={styles.select} 
                                value={u.role} 
                                onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                            >
                                <option value="citoyen">Citoyen</option>
                                <option value="urbaniste">Urbaniste</option>
                                <option value="admin">Admin</option>
                            </select>
                            <select 
                                style={styles.select} 
                                value={u.statut} 
                                onChange={(e) => handleStatusUpdate(u.id, e.target.value)}
                            >
                                <option value="active">Actif</option>
                                <option value="pending">En attente</option>
                                <option value="rejected">Désactivé</option>
                            </select>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                  <tr><td colSpan="6" style={{...styles.td, textAlign: 'center', color: '#94a3b8', padding: '40px'}}>Aucun utilisateur trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
