import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, LayoutDashboard, Map, LogOut } from 'lucide-react'

const Navbar = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  buildingTypes
}) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const isMapPage = location.pathname === '/map'

  return (
    <>
    <style>{`
  @media (max-width: 767px) {
    .navbar-mobile-hide { display: none !important; }
    .navbar-city-badge { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .navbar-dropdown { right: auto !important; left: 50% !important; transform: translateX(-50%) !important; }
  }
  @media (max-width: 480px) {
    .navbar-city-badge { max-width: 70px; }
  }
`}</style>
    <nav className="navbar" style={{
      background: 'rgba(8,6,3,0.96)',
      borderBottom: '0.5px solid rgba(193,68,14,0.2)',
      display: 'flex', alignItems: 'center', gap: 0,
      padding: '0 16px', height: '50px',
      position: 'fixed', top: 0, left: 0, right: 0, overflow: 'hidden',
      zIndex: 200, backdropFilter: 'blur(12px)',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Brand */}
      <div style={{
        fontFamily: 'Amiri, serif', fontSize: '17px',
        color: '#E8B87A', display: 'flex',
        alignItems: 'center', gap: '8px',
        paddingRight: '18px',
        borderRight: '0.5px solid rgba(242,237,230,0.08)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <div style={{
          width: '7px', height: '7px', background: '#C1440E',
          borderRadius: '50%',
          animation: 'pulse 2s infinite',
        }} />
        UrbanMap
        <span style={{ opacity: 0.3, margin: '0 7px' }}>|</span>
        المغرب
      </div>

      {/* Search & Filters */}
      {isMapPage && (
        <>
          {/* Search */}
          <div className="navbar-mobile-hide" style={{
            flex: 1, maxWidth: '320px',
            marginLeft: '14px', position: 'relative',
          }}>
            <svg style={{
              position: 'absolute', left: '11px',
              top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(242,237,230,0.22)', pointerEvents: 'none',
            }} width="13" height="13" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Chercher un quartier, une adresse..."
              value={searchQuery || ''}
              onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              style={{
                width: '100%', padding: '7px 12px 7px 33px',
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(242,237,230,0.12)',
                borderRadius: '6px', color: '#F2EDE6',
                fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
                outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e =>
                e.target.style.borderColor = 'rgba(193,68,14,0.5)'
              }
              onBlur={e =>
                e.target.style.borderColor = 'rgba(242,237,230,0.12)'
              }
            />
          </div>

          {/* Filter pills */}
          <div className="navbar-mobile-hide" style={{
            display: 'flex', gap: '5px', alignItems: 'center',
            padding: '0 14px',
            borderLeft: '0.5px solid rgba(242,237,230,0.07)',
            marginLeft: '14px',
          }}>
            {/* Category Select Filter for Urbaniste */}
            {user?.role === 'urbaniste' && buildingTypes && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory && setFilterCategory(e.target.value)}
                style={{
                  padding: '5px 11px', borderRadius: '4px',
                  fontSize: '11px',
                  border: '0.5px solid rgba(242,237,230,0.1)',
                  color: 'rgba(242,237,230,0.4)',
                  background: 'rgba(255,255,255,0.05)',
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer', transition: 'all 0.2s',
                  outline: 'none',
                  marginRight: '6px',
                }}
              >
                <option value="all" style={{ background: '#080603', color: '#F2EDE6' }}>Toutes les catégories</option>
                {buildingTypes.map(b => (
                  <option key={b.value} value={b.value} style={{ background: '#080603', color: '#F2EDE6' }}>
                    {b.label}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter Pills for Admin and Urbaniste */}
            {['admin', 'urbaniste'].includes(user?.role) && [
              { value: 'all',      label: 'Tous',    color: 'transparent' },
              { value: 'en_cours', label: 'En cours', color: '#d97706' },
              { value: 'resolu',   label: 'Résolu',   color: '#16a34a' },
              { value: 'rejete',   label: 'Rejeté',   color: '#64748b' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilterStatus && setFilterStatus(f.value)}
                style={{
                  padding: '5px 12px', borderRadius: '100px',
                  fontSize: '11px',
                  border: filterStatus === f.value
                    ? '0.5px solid rgba(193,68,14,0.6)'
                    : '0.5px solid rgba(242,237,230,0.1)',
                  color: filterStatus === f.value
                    ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
                  background: filterStatus === f.value
                    ? 'rgba(193,68,14,0.12)' : 'transparent',
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {f.color && f.color !== 'transparent' && (
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: f.color }} />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Right side */}
      <div style={{
        marginLeft: 'auto', display: 'flex',
        alignItems: 'center', gap: '10px', flexShrink: 0,
      }}>
        {/* City badge */}
        <div className="navbar-city-badge" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          border: '0.5px solid rgba(193,68,14,0.35)',
          borderRadius: '4px', padding: '5px 10px',
          fontSize: '11px', color: '#E8B87A',
          background: 'rgba(193,68,14,0.08)',
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          </svg>
          {user?.city || 'Marrakech'}
        </div>

        {/* Dashboard button / Return to Map */}
        {isMapPage && ['admin', 'urbaniste', 'super_admin'].includes(user?.role) && (
          <button className="navbar-mobile-hide"
            onClick={() => {
              if (user?.role === 'admin') navigate('/admin/dashboard')
              else if (user?.role === 'urbaniste') navigate('/urbaniste/dashboard')
              else if (user?.role === 'super_admin') navigate('/super-admin/users')
            }}
            style={{
              padding: '5px 10px', borderRadius: '4px',
              fontSize: '11px',
              border: '0.5px solid rgba(242,237,230,0.1)',
              color: 'rgba(242,237,230,0.5)',
              background: 'transparent',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Dashboard
          </button>
        )}

        {!isMapPage && user?.role === 'citoyen' && (
          <button className="navbar-mobile-hide"
            onClick={() => navigate('/map')}
            style={{
              padding: '5px 10px', borderRadius: '4px',
              fontSize: '11px',
              border: '0.5px solid rgba(242,237,230,0.1)',
              color: 'rgba(242,237,230,0.5)',
              background: 'transparent',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Retour à la carte
          </button>
        )}

        {/* User avatar dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(193,68,14,0.2)',
            border: '0.5px solid rgba(193,68,14,0.4)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            fontSize: '12px', color: '#C1440E', fontWeight: 600,
          }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Menu utilisateur"
          >
            {user?.nom?.[0]?.toUpperCase() || 'U'}
          </div>

          {dropdownOpen && (
            <div className="navbar-dropdown" style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'rgba(8,6,3,0.96)',
              border: '0.5px solid rgba(193,68,14,0.25)',
              borderRadius: '8px', padding: '6px 0',
              minWidth: '150px', zIndex: 1000,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(16px)',
              display: 'flex', flexDirection: 'column',
            }}>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  navigate('/account')
                }}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: 'none', color: '#F2EDE6', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <User size={13} style={{opacity:0.6, flexShrink:0}} /> Mon compte
              </button>
              {['admin', 'urbaniste', 'super_admin'].includes(user?.role) ? (
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    if (user?.role === 'admin') navigate('/admin/dashboard')
                    else if (user?.role === 'urbaniste') navigate('/urbaniste/dashboard')
                    else if (user?.role === 'super_admin') navigate('/super-admin/users')
                  }}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: 'none', color: '#F2EDE6', fontSize: '12px',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LayoutDashboard size={13} style={{opacity:0.6, flexShrink:0}} /> Tableau de Bord
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/map')
                  }}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: 'none', color: '#F2EDE6', fontSize: '12px',
                    textAlign: 'left', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Map size={13} style={{opacity:0.6, flexShrink:0}} /> La carte
                </button>
              )}
              <div style={{ height: '0.5px', background: 'rgba(242,237,230,0.08)', margin: '4px 0' }} />
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  logout()
                }}
                style={{
                  padding: '8px 16px', background: 'transparent',
                  border: 'none', color: '#C1440E', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={13} style={{opacity:0.6, flexShrink:0}} /> Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>

    </nav>
    </>
  )
}

export default Navbar
