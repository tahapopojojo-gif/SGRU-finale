import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const styles = {
  navbar: { 
    position: 'fixed', 
    top: '10px', 
    left: '50%', 
    transform: 'translateX(-50%)', 
    zIndex: 1100, 
    background: '#1a1a2e', 
    padding: '12px 24px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '20px', 
    borderRadius: '40px', 
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', 
    width: '94%', 
    justifyContent: 'space-between',
    color: '#fff'
  },
  navTitleWrapper: { display: 'flex', alignItems: 'center', gap: '10px' },
  navTitle: { fontWeight: '900', fontSize: '20px', color: '#fff', letterSpacing: '-0.8px', margin: 0 },
  navCenter: { display: 'flex', alignItems: 'center', gap: '15px' },
  searchWrapper: { position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', padding: '0 15px', width: '300px' },
  searchIcon: { fontSize: '14px', marginRight: '8px', color: '#94a3b8' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', padding: '8px 0', fontSize: '13px', width: '100%', color: '#fff' },
  filters: { display: 'flex', gap: '6px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '30px' },
  filterBtn: { padding: '6px 14px', border: 'none', borderRadius: '20px', background: 'transparent', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', transition: 'all 0.2s' },
  filterBtnActive: { background: '#0f3460', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  userName: { fontSize: '13px', fontWeight: '600', color: '#e2e8f0' },
  logoutBtn: { padding: '8px 18px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', transition: 'opacity 0.2s' },
  dashboardBtn: { padding: '8px 16px', background: '#fff', color: '#0f3460', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'urgent', label: '🔴 Urgent' },
  { value: 'active', label: '🟡 Actif' },
  { value: 'planning', label: '🟢 Planifié' },
]

export default function Navbar({ 
  searchQuery, setSearchQuery, handleSearch, 
  filterStatus, setFilterStatus, 
  filterCategory, setFilterCategory, buildingTypes 
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const isMapPage = location.pathname === '/map'

  return (
    <nav style={styles.navbar}>
      <div style={styles.navTitleWrapper}>
          <span style={{ fontSize: '24px' }}>🇲🇦</span>
          <h1 style={styles.navTitle}>UrbanMap Maroc</h1>
      </div>
      
      {isMapPage && (
        <div style={styles.navCenter}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input 
              style={styles.searchInput} 
              placeholder="Chercher une adresse..." 
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          
          <div style={styles.filters}>
            {user?.role === 'urbaniste' && buildingTypes && (
              <select 
                style={{...styles.filterBtn, background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none'}} 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">Toutes les catégories</option>
                {buildingTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            )}
            
            {['admin', 'urbaniste'].includes(user?.role) && STATUS_OPTIONS.map(opt => (
              <button key={opt.value} 
                style={{ ...styles.filterBtn, ...(filterStatus === opt.value ? styles.filterBtnActive : {}) }}
                onClick={() => setFilterStatus && setFilterStatus(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.navRight}>
        {isMapPage && ['admin', 'urbaniste'].includes(user?.role) && (
          <button 
            onClick={() => navigate(user.role === 'admin' ? '/admin/dashboard' : '/urbaniste/dashboard')} 
            style={styles.dashboardBtn}
          >
            📊 Tableau de bord
          </button>
        )}
        {!isMapPage && (
          <button onClick={() => navigate('/map')} style={styles.dashboardBtn}>
            🗺️ Retour à la carte
          </button>
        )}
        <span style={styles.userName}>👤 {user?.nom}</span>
        <button style={styles.logoutBtn} onClick={logout}>Déconnexion</button>
      </div>
    </nav>
  )
}
