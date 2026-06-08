import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPendingUsers, getAllUsers, updateUser, getDashboardStats } from '../services/adminApi'
import { unwrap } from '../utils/unwrap';
import { Users, Clock, MapPin, Map } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const styles = {
  wrapper: { background: '#060403', backgroundImage: 'none', minHeight: '100vh' },
  container: { padding: '100px 40px 20px', maxWidth: '1200px', margin: '0 auto', background: '#060403' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#F2EDE6', margin: 0 },
  tabs: { display: 'flex', gap: '15px' },
  tabBtn: { padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  activeTab: { background: '#C1440E', color: 'white', border: 'none' },
  inactiveTab: { background: 'transparent', color: '#94a3b8', border: '1px solid #334155' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155' },
  td: { padding: '12px 20px', fontSize: '14px', color: '#cbd5e1', borderBottom: '1px solid #334155' },
  approveBtn: { padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginRight: '10px' },
  rejectBtn: { padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  saveBtn: { padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', marginLeft: '8px' },
  cancelBtn: { padding: '6px 14px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', marginLeft: '6px' },
  saveBtnDisabled: { padding: '6px 14px', background: '#475569', color: '#94a3b8', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '12px', marginLeft: '8px', cursor: 'not-allowed' },
  select: { padding: '6px 10px', borderRadius: '8px', border: '1px solid #475569', outline: 'none', fontSize: '13px', background: '#1e293b', color: '#F2EDE6' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
  kpiCard: { background: '#1e293b', borderRadius: '12px', padding: '20px 24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' },
  kpiTopRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  kpiIcon: { width: '18px', height: '18px' },
  kpiSubtitle: { fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: '32px', fontWeight: 700, color: '#F2EDE6' },
  skeleton: { background: '#1e293b', borderRadius: '12px', height: '120px', width: '100%', marginBottom: '24px' },
}

const STATUT_LABELS = { active: 'Actif', pending: 'En attente', rejected: 'Désactivé' }

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [users, setUsers] = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [pendingChanges, setPendingChanges] = useState({})
  const [savingId, setSavingId] = useState(null)

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

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          getDashboardStats(),
          getAllUsers(),
        ])
        const statsData = statsRes?.data || statsRes
        setPlatformStats(statsData)
        const usersData = unwrap(usersRes)
        setAllUsers(usersData)
      } catch (err) {
        console.error('Failed to fetch overview data', err)
      }
    }
    fetchOverview()
  }, [])

  const roleBreakdown = {
    citoyen: allUsers.filter(u => u.role === 'citoyen').length,
    admin: allUsers.filter(u => u.role === 'admin').length,
    urbaniste: allUsers.filter(u => u.role === 'urbaniste').length,
    super_admin: allUsers.filter(u => u.role === 'super_admin').length,
  }

  const barData = [
    { role: 'Citoyens', count: roleBreakdown.citoyen, fill: '#3b82f6' },
    { role: 'Admins', count: roleBreakdown.admin, fill: '#C1440E' },
    { role: 'Urbanistes', count: roleBreakdown.urbaniste, fill: '#10b981' },
    { role: 'Super Admins', count: roleBreakdown.super_admin, fill: '#f97316' },
  ]

  const handleStatusUpdate = async (id, newStatus) => {
    setSavingId(id)
    try {
      await updateUser(id, { statut: newStatus })
      const updated = pendingChanges
      delete updated[id]
      setPendingChanges({ ...updated })
      await fetchData()
    } finally {
      setSavingId(null)
    }
  }

  const requestStatusChange = (id, newStatut) => {
    const user = users.find(u => u.id === id)
    if (!user) return
    const oldLabel = STATUT_LABELS[user.statut] || user.statut
    const newLabel = STATUT_LABELS[newStatut] || newStatut
    if (!window.confirm(`Voulez-vous vraiment changer le statut de ${user.nom} de « ${oldLabel} » à « ${newLabel} » ?`)) return
    handleStatusUpdate(id, newStatut)
  }

  const kpiCards = [
    {
      icon: Users, color: '#3b82f6',
      value: platformStats?.total_users,
      subtitle: 'inscrits sur la plateforme',
    },
    {
      icon: Clock, color: '#f97316',
      value: platformStats?.pending_users,
      subtitle: 'comptes à valider',
      pulse: (platformStats?.pending_users ?? 0) > 0,
    },
    {
      icon: MapPin, color: '#C1440E',
      value: platformStats?.total_remarques,
      subtitle: 'signalements citoyens',
    },
    {
      icon: Map, color: '#10b981',
      value: platformStats?.total_zones,
      subtitle: 'zones définies',
    },
  ]

  return (
      <div style={styles.wrapper}>
        <Navbar />
        <style>{`
          .tab-btn-inactive:hover {
            background: #1e293b !important;
            color: #F2EDE6 !important;
          }
          .super-admin-btn:focus-visible {
            outline: none !important;
          }
        `}</style>

      <div style={styles.container}>
        <div style={styles.headerRow}>
          <h2 style={styles.title}>Super Administration</h2>
          <div style={styles.tabs}>
            <button
                onClick={() => { setActiveTab('pending'); setPendingChanges({}) }}
                style={{ ...styles.tabBtn, ...(activeTab === 'pending' ? styles.activeTab : styles.inactiveTab) }}
                className={(activeTab !== 'pending' ? 'tab-btn-inactive ' : '') + 'super-admin-btn'}
            >
              En attente ({activeTab === 'pending' ? users.length : '?'})
            </button>
            <button
                onClick={() => { setActiveTab('all'); setPendingChanges({}) }}
                style={{ ...styles.tabBtn, ...(activeTab === 'all' ? styles.activeTab : styles.inactiveTab) }}
                className={(activeTab !== 'all' ? 'tab-btn-inactive ' : '') + 'super-admin-btn'}
            >
              Tous les utilisateurs
            </button>
          </div>
        </div>

        {!platformStats ? (
          <div style={styles.skeleton} />
        ) : (
          <>
            <div style={styles.kpiGrid}>
              {kpiCards.map((card, i) => (
                <div key={i} style={styles.kpiCard}>
                  <div style={styles.kpiTopRow}>
                    <card.icon style={{ ...styles.kpiIcon, color: card.color }} />
                    <span style={{ ...styles.kpiSubtitle, color: '#94a3b8' }}>{card.subtitle}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.kpiValue}>{card.value ?? '-'}</span>
                    {card.pulse && (
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: '#f97316', display: 'inline-block',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Répartition des rôles
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="role" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis hide={true} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#F2EDE6' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        <div style={{ ...styles.card, padding: '0', overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nom</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Département / Ville</th>
                <th style={styles.th}>Rôle</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const pendingStatut = pendingChanges[u.id]
                const hasChange = pendingStatut !== undefined && pendingStatut !== u.statut
                return (
                <tr key={u.id}>
                  <td style={{...styles.td, fontWeight: '600'}}>{u.nom}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    {u.company_name && `${u.company_name} / `}
                    {u.city ? u.city.charAt(0).toUpperCase() + u.city.slice(1) : '-'}
                  </td>
                  <td style={styles.td}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', background: '#1e293b', color: '#60a5fa' }}>
                          {u.role?.toUpperCase() || 'CITOYEN'}
                      </span>
                  </td>
                  <td style={styles.td}>
                      <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                          background: u.statut === 'active' ? '#064e3b' : u.statut === 'rejected' ? '#7f1d1d' : '#713f12',
                          color: u.statut === 'active' ? '#34d399' : u.statut === 'rejected' ? '#f87171' : '#fbbf24'
                      }}>
                          {u.statut?.toUpperCase() || 'ACTIVE'}
                      </span>
                  </td>
                  <td style={styles.td}>
                    {activeTab === 'pending' ? (
                        <>
                            <button style={styles.approveBtn} onClick={() => requestStatusChange(u.id, 'active')}>Activer</button>
                            <button style={styles.rejectBtn} onClick={() => requestStatusChange(u.id, 'rejected')}>Refuser</button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <select
                                style={styles.select}
                                value={pendingChanges[u.id] ?? u.statut}
                                onChange={(e) => setPendingChanges({ ...pendingChanges, [u.id]: e.target.value })}
                            >
                                <option value="active">Actif</option>
                                <option value="pending">En attente</option>
                                <option value="rejected">Désactivé</option>
                            </select>
                            {hasChange && (
                              <>
                                <button
                                  style={savingId === u.id ? styles.saveBtnDisabled : styles.saveBtn}
                                  disabled={savingId === u.id}
                                  onClick={() => requestStatusChange(u.id, pendingStatut)}
                                >
                                  {savingId === u.id ? '...' : 'Sauvegarder'}
                                </button>
                                <button
                                  style={styles.cancelBtn}
                                  onClick={() => {
                                    const updated = { ...pendingChanges }
                                    delete updated[u.id]
                                    setPendingChanges(updated)
                                  }}
                                >
                                  Annuler
                                </button>
                              </>
                            )}
                        </div>
                    )}
                  </td>
                </tr>
              )})}
              {users.length === 0 && (
                  <tr><td colSpan="6" style={{ color: '#94a3b8', padding: '32px', textAlign: 'center', fontSize: '14px' }}>Aucun utilisateur trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
