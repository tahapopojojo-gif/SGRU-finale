import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getPendingUsers, getAllUsers, updateUser, getDashboardStats } from '../services/adminApi'
import { unwrap } from '../utils/unwrap';
import { Users, Clock, MapPin, Map } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import useResponsive from '../hooks/useResponsive';

const styles = {
  wrapper: {
    background: '#060403',
    minHeight: '100vh',
    fontFamily: 'DM Sans, sans-serif',
    color: '#F2EDE6',
  },
  container: {
    padding: '100px 40px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '30px',
  },
  title: {
    fontFamily: 'Amiri, serif',
    fontSize: '26px', fontWeight: 700,
    color: '#F2EDE6', margin: 0,
  },
  tabs: { display: 'flex', gap: '8px' },
  tabBtn: {
    padding: '8px 18px', borderRadius: '6px',
    cursor: 'pointer', fontWeight: 500,
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: 'transparent',
    color: '#C1440E',
    border: '0.5px solid #C1440E',
  },
  inactiveTab: {
    background: 'transparent',
    color: 'rgba(242,237,230,0.4)',
    border: '0.5px solid rgba(242,237,230,0.12)',
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '20px',
    border: '0.5px solid rgba(242,237,230,0.08)',
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '700px' },
  th: {
    padding: '10px 16px', textAlign: 'left',
    fontSize: '10px', fontWeight: 500,
    color: 'rgba(242,237,230,0.35)',
    textTransform: 'uppercase', letterSpacing: '0.07em',
    borderBottom: '0.5px solid rgba(242,237,230,0.07)',
  },
  td: {
    padding: '12px 16px', fontSize: '13px',
    color: 'rgba(242,237,230,0.75)',
    borderBottom: '0.5px solid rgba(242,237,230,0.05)',
  },
  approveBtn: {
    padding: '6px 14px',
    background: 'transparent',
    color: 'rgba(242,237,230,0.6)',
    border: '0.5px solid rgba(242,237,230,0.2)',
    borderRadius: '5px', cursor: 'pointer',
    fontWeight: 500, fontSize: '12px',
    marginRight: '8px', transition: 'all 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  rejectBtn: {
    padding: '6px 14px',
    background: 'transparent',
    color: 'rgba(239,68,68,0.6)',
    border: '0.5px solid rgba(239,68,68,0.3)',
    borderRadius: '5px', cursor: 'pointer',
    fontWeight: 500, fontSize: '12px',
    transition: 'all 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  saveBtn: {
    padding: '5px 12px',
    background: 'transparent',
    color: '#C1440E',
    border: '0.5px solid #C1440E',
    borderRadius: '5px', cursor: 'pointer',
    fontWeight: 500, fontSize: '11px',
    marginLeft: '8px', transition: 'all 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  cancelBtn: {
    padding: '5px 12px',
    background: 'transparent',
    color: 'rgba(242,237,230,0.35)',
    border: '0.5px solid rgba(242,237,230,0.12)',
    borderRadius: '5px', cursor: 'pointer',
    fontWeight: 500, fontSize: '11px',
    marginLeft: '6px', transition: 'all 0.2s',
    fontFamily: 'DM Sans, sans-serif',
  },
  saveBtnDisabled: {
    padding: '5px 12px',
    background: 'transparent',
    color: 'rgba(242,237,230,0.2)',
    border: '0.5px solid rgba(242,237,230,0.08)',
    borderRadius: '5px',
    fontWeight: 500, fontSize: '11px',
    marginLeft: '8px', cursor: 'not-allowed',
    fontFamily: 'DM Sans, sans-serif',
  },
  select: {
    padding: '6px 10px', borderRadius: '5px',
    border: '0.5px solid rgba(242,237,230,0.12)',
    outline: 'none', fontSize: '12px',
    background: 'rgba(255,255,255,0.04)',
    color: '#F2EDE6', fontFamily: 'DM Sans, sans-serif',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px', marginBottom: '20px',
  },
  kpiCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px', padding: '16px 20px',
    border: '0.5px solid rgba(242,237,230,0.07)',
    position: 'relative', overflow: 'hidden',
  },
  kpiTopRow: {
    display: 'flex', alignItems: 'center',
    gap: '6px', marginBottom: '8px',
  },
  kpiIcon: { width: '14px', height: '14px' },
  kpiSubtitle: {
    fontSize: '9px', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: 'rgba(242,237,230,0.3)',
  },
  kpiValue: {
    fontSize: '28px', fontWeight: 600,
    color: '#F2EDE6', letterSpacing: '-0.03em',
    lineHeight: 1, fontFamily: 'DM Sans, sans-serif',
  },
  skeleton: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px', height: '120px',
    width: '100%', marginBottom: '20px',
  },
}

const STATUT_LABELS = { active: 'Actif', pending: 'En attente', rejected: 'Désactivé' }

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState('pending')
  const [users, setUsers] = useState([])
  const [platformStats, setPlatformStats] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [pendingChanges, setPendingChanges] = useState({})
  const [savingId, setSavingId] = useState(null)
  const USERS_PER_PAGE = 8
  const [currentPage, setCurrentPage] = useState(1)

  const { isMobile } = useResponsive();

  const container = {
    ...styles.container,
    padding: isMobile ? '80px 16px 20px' : '100px 40px 20px',
  };

  const kpiGrid = {
    ...styles.kpiGrid,
    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
  };

  const headerRow = {
    ...styles.headerRow,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? '12px' : '0',
  };

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
    { role: 'Citoyens', count: roleBreakdown.citoyen, fill: 'rgba(242,237,230,0.5)' },
    { role: 'Admins', count: roleBreakdown.admin, fill: '#C1440E' },
    { role: 'Urbanistes', count: roleBreakdown.urbaniste, fill: '#E8B87A' },
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
      icon: Users, color: '#C1440E',
      value: platformStats?.total_users,
      subtitle: 'inscrits sur la plateforme',
    },
    {
      icon: Clock, color: '#E8B87A',
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
      icon: Map, color: 'rgba(242,237,230,0.3)',
      value: platformStats?.total_zones,
      subtitle: 'zones définies',
    },
  ]

  return (
      <div style={styles.wrapper}>
        <Navbar />
        <style>{`
          .tab-btn-inactive:hover {
            border-color: rgba(242,237,230,0.3) !important;
            color: rgba(242,237,230,0.8) !important;
          }
          .super-admin-btn:focus-visible {
            outline: none !important;
          }
          .dark-select {
            background: #0f0c09 !important;
            color: #F2EDE6 !important;
            border: 0.5px solid rgba(242,237,230,0.12) !important;
            color-scheme: dark;
          }
          .dark-select option {
            background: #0f0c09 !important;
            color: #F2EDE6 !important;
          }
          .dark-select:focus {
            outline: none !important;
            border-color: rgba(193,68,14,0.5) !important;
          }
        `}</style>

      <div style={container}>
        <div style={headerRow}>
          <h2 style={styles.title}>Super Administration</h2>
          <div style={styles.tabs}>
            <button
                onClick={() => { setActiveTab('pending'); setPendingChanges({}); setCurrentPage(1) }}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'pending' ? styles.activeTab : styles.inactiveTab),
                  fontSize: isMobile ? '11px' : '12px',
                  padding: isMobile ? '8px 12px' : '8px 18px',
                }}
                className={(activeTab !== 'pending' ? 'tab-btn-inactive ' : '') + 'super-admin-btn'}
            >
              En attente ({activeTab === 'pending' ? users.length : '?'})
            </button>
            <button
                onClick={() => { setActiveTab('all'); setPendingChanges({}); setCurrentPage(1) }}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'all' ? styles.activeTab : styles.inactiveTab),
                  fontSize: isMobile ? '11px' : '12px',
                  padding: isMobile ? '8px 12px' : '8px 18px',
                }}
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
            <div style={kpiGrid}>
              {kpiCards.map((card, i) => (
                <div key={i} style={styles.kpiCard}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: '1.5px', background: card.color,
                  }} />
                  <div style={styles.kpiTopRow}>
                    <card.icon style={{ ...styles.kpiIcon, color: card.color }} />
                    <span style={styles.kpiSubtitle}>{card.subtitle}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={styles.kpiValue}>{card.value ?? '-'}</span>
                    {card.pulse && (
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: '#C1440E', display: 'inline-block',
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...styles.card, marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: 'rgba(242,237,230,0.3)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Répartition des rôles
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,237,230,0.06)" />
                  <XAxis dataKey="role" tick={{ fill: 'rgba(242,237,230,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide={true} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(8,6,3,0.96)',
                      border: '0.5px solid rgba(242,237,230,0.1)',
                      borderRadius: '6px',
                      color: '#F2EDE6',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#F2EDE6' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
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

        <div style={{ ...styles.card, padding: '0', overflowX: 'auto' }}>
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
              {users
                .slice((currentPage - 1) * USERS_PER_PAGE,
                        currentPage * USERS_PER_PAGE)
                .map(u => {
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
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px',
                        fontSize: '10px', fontWeight: 500,
                        letterSpacing: '0.05em',
                        background: 'transparent',
                        border: '0.5px solid rgba(242,237,230,0.15)',
                        color: 'rgba(242,237,230,0.5)',
                      }}>
                          {u.role?.toUpperCase() || 'CITOYEN'}
                      </span>
                  </td>
                  <td style={styles.td}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px',
                        fontSize: '10px', fontWeight: 500,
                        letterSpacing: '0.05em',
                        background: u.statut === 'active'
                          ? 'rgba(242,237,230,0.06)'
                          : u.statut === 'rejected'
                          ? 'rgba(239,68,68,0.08)'
                          : 'rgba(245,158,11,0.08)',
                        border: u.statut === 'active'
                          ? '0.5px solid rgba(242,237,230,0.15)'
                          : u.statut === 'rejected'
                          ? '0.5px solid rgba(239,68,68,0.3)'
                          : '0.5px solid rgba(245,158,11,0.3)',
                        color: u.statut === 'active'
                          ? 'rgba(242,237,230,0.55)'
                          : u.statut === 'rejected'
                          ? 'rgba(239,68,68,0.7)'
                          : 'rgba(245,158,11,0.7)',
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
                                className="dark-select"
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

          {Math.ceil(users.length / USERS_PER_PAGE) > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '0.5px solid rgba(242,237,230,0.06)',
            }}>
              <span style={{
                fontSize: '11px',
                color: 'rgba(242,237,230,0.25)',
              }}>
                {(currentPage - 1) * USERS_PER_PAGE + 1}–
                {Math.min(currentPage * USERS_PER_PAGE, users.length)}
                {' '}sur {users.length}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '4px', fontSize: '14px',
                    border: '0.5px solid rgba(242,237,230,0.1)',
                    background: 'transparent',
                    color: 'rgba(242,237,230,0.4)',
                    cursor: currentPage === 1
                      ? 'not-allowed' : 'pointer',
                  }}
                >‹</button>
                <span style={{
                  fontSize: '11px',
                  color: 'rgba(242,237,230,0.4)',
                  padding: '0 8px', lineHeight: '28px',
                }}>
                  {currentPage}/{Math.ceil(users.length / USERS_PER_PAGE)}
                </span>
                <button
                  disabled={currentPage ===
                    Math.ceil(users.length / USERS_PER_PAGE)}
                  onClick={() => setCurrentPage(p => p + 1)}
                  style={{
                    width: '28px', height: '28px',
                    borderRadius: '4px', fontSize: '14px',
                    border: '0.5px solid rgba(242,237,230,0.1)',
                    background: 'transparent',
                    color: 'rgba(242,237,230,0.4)',
                    cursor: currentPage ===
                      Math.ceil(users.length / USERS_PER_PAGE)
                      ? 'not-allowed' : 'pointer',
                  }}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
