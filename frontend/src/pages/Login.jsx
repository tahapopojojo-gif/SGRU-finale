import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Compass, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [activeRole, setActiveRole] = useState('citoyen')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const user = await login(email, password)
            const userRole = user.role;
            if (userRole === 'super_admin') navigate('/super-admin/users');
            else if (userRole === 'admin') navigate('/admin/dashboard');
            else if (userRole === 'urbaniste') navigate('/urbaniste/dashboard');
            else navigate('/map');
        } catch (err) {
            console.error('Login error:', err)
            let msg = 'Email ou mot de passe incorrect'
            if (err.response?.data?.message) {
                msg = err.response.data.message
            } else if (err.message === 'Network Error') {
                msg = 'Impossible de contacter le serveur (Vérifiez si Laravel est lancé).'
            }
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            fontFamily: 'DM Sans, sans-serif',
            background: '#0E0B08',
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: '1fr 480px',
            position: 'relative',
            overflow: 'hidden',
        }}>

            {/* ── LEFT: Ambient Map Panel ── */}
            <div style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#080604',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '48px',
            }}>
                {/* Zellige overlay */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.04,
                    pointerEvents: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F2EDE6' stroke-width='0.5'%3E%3Cpolygon points='30,2 58,16 58,44 30,58 2,44 2,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3Cline x1='30' y1='2' x2='30' y2='10'/%3E%3Cline x1='58' y1='16' x2='50' y2='20'/%3E%3Cline x1='58' y1='44' x2='50' y2='40'/%3E%3Cline x1='30' y1='58' x2='30' y2='50'/%3E%3Cline x1='2' y1='44' x2='10' y2='40'/%3E%3Cline x1='2' y1='16' x2='10' y2='20'/%3E%3C/g%3E%3C/svg%3E")`,
                }} />

                {/* Gradient vignette */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(8,6,4,0.3) 0%, transparent 50%, rgba(8,6,4,0.6) 100%)',
                }} />

                {/* Background SVG map */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    viewBox="0 0 700 900" xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid slice">
                    <rect width="700" height="900" fill="#060403"/>
                    {/* Street grid */}
                    <g stroke="#120E09" strokeWidth="0.8" opacity="0.8">
                        <line x1="0" y1="100" x2="700" y2="100"/>
                        <line x1="0" y1="200" x2="700" y2="200"/>
                        <line x1="0" y1="300" x2="700" y2="300"/>
                        <line x1="0" y1="400" x2="700" y2="400"/>
                        <line x1="0" y1="500" x2="700" y2="500"/>
                        <line x1="0" y1="600" x2="700" y2="600"/>
                        <line x1="0" y1="700" x2="700" y2="700"/>
                        <line x1="0" y1="800" x2="700" y2="800"/>
                        <line x1="100" y1="0" x2="100" y2="900"/>
                        <line x1="200" y1="0" x2="200" y2="900"/>
                        <line x1="300" y1="0" x2="300" y2="900"/>
                        <line x1="400" y1="0" x2="400" y2="900"/>
                        <line x1="500" y1="0" x2="500" y2="900"/>
                        <line x1="600" y1="0" x2="600" y2="900"/>
                        <line x1="0" y1="0" x2="700" y2="700" opacity="0.4"/>
                        <line x1="0" y1="200" x2="500" y2="700" opacity="0.3"/>
                        <line x1="200" y1="0" x2="700" y2="500" opacity="0.3"/>
                    </g>
                    {/* Zone polygons */}
                    <polygon points="120,180 280,150 320,300 140,330"
                        fill="rgba(193,68,14,0.18)" stroke="#C1440E" strokeWidth="1.5" opacity="0.9"/>
                    <polygon points="300,160 460,140 500,280 320,310"
                        fill="rgba(26,82,118,0.18)" stroke="#1A5276" strokeWidth="1.5" opacity="0.9"/>
                    <polygon points="130,350 290,320 310,460 110,480"
                        fill="rgba(232,184,122,0.14)" stroke="#E8B87A" strokeWidth="1" opacity="0.8"/>
                    <polygon points="400,300 560,270 590,420 370,450"
                        fill="rgba(82,190,128,0.12)" stroke="#52BE80" strokeWidth="1" opacity="0.7"/>
                    <polygon points="180,500 360,475 380,600 155,625"
                        fill="rgba(193,68,14,0.1)" stroke="#C1440E" strokeWidth="0.8" opacity="0.6"/>
                    <polygon points="420,480 580,450 600,570 400,600"
                        fill="rgba(26,82,118,0.1)" stroke="#1A5276" strokeWidth="0.8" opacity="0.5"/>
                    {/* Glow markers */}
                    <circle cx="220" cy="245" r="5" fill="#C1440E" opacity="1"/>
                    <circle cx="220" cy="245" r="12" fill="#C1440E" opacity="0.15"/>
                    <circle cx="220" cy="245" r="20" fill="#C1440E" opacity="0.06"/>
                    <circle cx="400" cy="215" r="4" fill="#5DADE2" opacity="0.9"/>
                    <circle cx="400" cy="215" r="10" fill="#5DADE2" opacity="0.12"/>
                    <circle cx="220" cy="395" r="3" fill="#E8B87A" opacity="0.8"/>
                    <circle cx="490" cy="365" r="4" fill="#52BE80" opacity="0.8"/>
                    <circle cx="490" cy="365" r="9" fill="#52BE80" opacity="0.1"/>
                    <circle cx="280" cy="545" r="3" fill="#C1440E" opacity="0.6"/>
                    <circle cx="510" cy="520" r="3" fill="#1A5276" opacity="0.6"/>
                    {/* Zone labels */}
                    <text x="215" y="242" textAnchor="middle" fill="#C1440E"
                        fontSize="9" fontFamily="DM Sans" opacity="0.8">Gueliz</text>
                    <text x="400" y="212" textAnchor="middle" fill="#5DADE2"
                        fontSize="9" fontFamily="DM Sans" opacity="0.8">Médina</text>
                    <text x="220" y="392" textAnchor="middle" fill="#E8B87A"
                        fontSize="9" fontFamily="DM Sans" opacity="0.7">Hivernage</text>
                    <text x="490" y="362" textAnchor="middle" fill="#52BE80"
                        fontSize="9" fontFamily="DM Sans" opacity="0.7">Palmeraie</text>
                    {/* Compass */}
                    <g transform="translate(648,52)">
                        <circle r="18" fill="rgba(6,4,3,0.8)"
                            stroke="rgba(242,237,230,0.12)" strokeWidth="0.5"/>
                        <text y="4" textAnchor="middle" fill="#E8B87A"
                            fontSize="10" fontFamily="DM Sans" fontWeight="500">N</text>
                    </g>
                </svg>

                {/* Top: Brand */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        fontFamily: 'Amiri, serif', fontSize: '20px', color: '#E8B87A',
                    }}>
                        <div style={{
                            width: '8px', height: '8px', background: '#C1440E',
                            borderRadius: '50%',
                        }} />
                        UrbanMap
                        <span style={{ opacity: 0.35, margin: '0 8px' }}>|</span>
                        المغرب
                    </div>
                </div>

                {/* Bottom: Tagline + Stats */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                    {/* Live indicator */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        fontSize: '11px', color: 'rgba(242,237,230,0.35)',
                        letterSpacing: '0.06em', marginBottom: '16px',
                    }}>
                        <div style={{
                            width: '6px', height: '6px', background: '#52BE80',
                            borderRadius: '50%',
                        }} />
                        Plateforme active — Marrakech, Casablanca, Rabat
                    </div>

                    {/* Tagline */}
                    <h2 style={{
                        fontFamily: 'Amiri, serif', fontSize: '52px',
                        lineHeight: 1.1, fontWeight: 700,
                        color: '#F2EDE6', marginBottom: '16px',
                    }}>
                        La ville,<br />en temps<br />
                        <span style={{ color: '#C1440E' }}>réel.</span>
                    </h2>
                    <p style={{
                        fontSize: '14px', color: 'rgba(242,237,230,0.45)',
                        fontWeight: 300, lineHeight: 1.7, maxWidth: '380px',
                        marginBottom: '28px',
                    }}>
                        Données cartographiques citoyennes, analyses IA et
                        planification urbaine intégrée pour le Maroc.
                    </p>

                    {/* Stats strip */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255,255,255,0.04)',
                        border: '0.5px solid rgba(242,237,230,0.08)',
                        borderRadius: '8px', overflow: 'hidden',
                    }}>
                        {[
                            { num: '1,240', lbl: 'Citoyens' },
                            { num: '486',   lbl: 'Signalements' },
                            { num: '38',    lbl: 'Zones' },
                            { num: '3',     lbl: 'Villes' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                flex: 1, padding: '14px 18px',
                                borderRight: i < 3
                                    ? '0.5px solid rgba(242,237,230,0.06)' : 'none',
                            }}>
                                <div style={{
                                    fontFamily: 'Amiri, serif', fontSize: '24px',
                                    color: '#E8B87A', lineHeight: 1,
                                }}>{s.num}</div>
                                <div style={{
                                    fontSize: '10px', color: 'rgba(242,237,230,0.3)',
                                    marginTop: '3px', letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}>{s.lbl}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── RIGHT: Form panel ── */}
            <div style={{
                background: '#0E0B08',
                borderLeft: '0.5px solid rgba(242,237,230,0.07)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center',
                padding: '56px 48px',
                position: 'relative', zIndex: 1,
            }}>
                {/* Zellige on right panel */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.025,
                    pointerEvents: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F2EDE6' stroke-width='0.5'%3E%3Cpolygon points='30,2 58,16 58,44 30,58 2,44 2,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3C/g%3E%3C/svg%3E")`,
                }} />

                {/* FORM CONTENT */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Tag */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      border: '0.5px solid rgba(193,68,14,0.35)',
                      borderRadius: '100px', padding: '5px 12px',
                      fontSize: '10px', color: '#C1440E',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      background: 'rgba(193,68,14,0.07)', marginBottom: '20px',
                    }}>
                      <span style={{width:'5px',height:'5px',background:'#C1440E',
                        borderRadius:'50%',display:'inline-block'}}/>
                      Connexion sécurisée
                    </div>

                    {/* Title */}
                    <h2 style={{
                      fontFamily: 'Amiri, serif', fontSize: '30px',
                      color: '#F2EDE6', fontWeight: 700, marginBottom: '6px',
                    }}>
                      Bon retour.
                    </h2>
                    <p style={{
                      fontSize: '13px', color: 'rgba(242,237,230,0.38)',
                      fontWeight: 300, marginBottom: '32px', lineHeight: 1.6,
                    }}>
                      Connectez-vous pour accéder à votre espace et reprendre
                      là où vous vous étiez arrêté.
                    </p>

                    {/* Role selector pills */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                      {[
                        { key: 'citoyen',   Icon: User,    label: 'Citoyen',      iconColor: '#C1440E', activeBg: 'rgba(193,68,14,0.1)' },
                        { key: 'urbaniste', Icon: Compass, label: 'Urbaniste',    iconColor: '#E8B87A', activeBg: 'rgba(232,184,122,0.1)' },
                        { key: 'admin',     Icon: Shield,  label: 'Admin',        iconColor: '#5DADE2', activeBg: 'rgba(26,82,118,0.12)' },
                      ].map(r => {
                        const isActive = activeRole === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => setActiveRole(r.key)}
                            style={{
                              flex: 1, padding: '7px 10px', textAlign: 'center',
                              border: isActive
                                ? `0.5px solid rgba(193,68,14,0.6)`
                                : '0.5px solid rgba(242,237,230,0.1)',
                              borderRadius: '6px', fontSize: '11px',
                              color: isActive
                                ? '#F2EDE6' : 'rgba(242,237,230,0.35)',
                              background: isActive
                                ? r.activeBg : 'transparent',
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = 'rgba(193,68,14,0.4)';
                                e.currentTarget.style.color = 'rgba(242,237,230,0.7)';
                              }
                            }}
                            onMouseLeave={e => {
                              if (!isActive) {
                                e.currentTarget.style.borderColor = 'rgba(242,237,230,0.1)';
                                e.currentTarget.style.color = 'rgba(242,237,230,0.35)';
                              }
                            }}
                          >
                            <span style={{ 
                              display: 'flex', 
                              justifyContent: 'center', 
                              marginBottom: '5px',
                              opacity: isActive ? 1 : 0.45 
                            }}>
                              <r.Icon size={16} strokeWidth={1.5} color={isActive ? r.iconColor : 'rgba(242,237,230,0.7)'} />
                            </span>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Pro role warning */}
                    {activeRole !== 'citoyen' && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '9px',
                        background: 'rgba(245,158,11,0.07)',
                        border: '0.5px solid rgba(245,158,11,0.25)',
                        borderRadius: '6px', padding: '10px 14px',
                        marginBottom: '16px',
                        fontSize: '12px', color: 'rgba(245,158,11,0.8)',
                        lineHeight: 1.5,
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: '2px', color: 'rgba(245,158,11,0.8)' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Accès soumis à validation Super Admin. Votre compte doit être activé avant de pouvoir vous connecter.</span>
                      </div>
                    )}

                    {/* Error */}
                    {error && (
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '9px',
                        background: 'rgba(220,38,38,0.08)',
                        border: '0.5px solid rgba(220,38,38,0.3)',
                        borderRadius: '6px', padding: '10px 14px',
                        marginBottom: '16px',
                        fontSize: '12px', color: 'rgba(252,165,165,0.9)',
                        lineHeight: 1.5,
                      }}>
                        <svg style={{ flexShrink: 0, marginTop: '1px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>{error}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>

                      {/* Email field */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '7px',
                        }}>
                          <label style={{
                            fontSize: '11px', letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color: 'rgba(242,237,230,0.4)',
                          }}>Email</label>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <svg style={{
                            position: 'absolute', left: '13px',
                            top: '50%', transform: 'translateY(-50%)',
                            color: 'rgba(242,237,230,0.2)', pointerEvents: 'none',
                          }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="vous@exemple.ma"
                            required
                            style={{
                              width: '100%', padding: '11px 14px 11px 40px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '0.5px solid rgba(242,237,230,0.14)',
                              borderRadius: '6px', color: '#F2EDE6',
                              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                              outline: 'none', boxSizing: 'border-box',
                              transition: 'border-color 0.2s, background 0.2s',
                            }}
                            onFocus={e => {
                              e.target.style.borderColor = 'rgba(193,68,14,0.55)'
                              e.target.style.background = 'rgba(255,255,255,0.055)'
                            }}
                            onBlur={e => {
                              e.target.style.borderColor = 'rgba(242,237,230,0.14)'
                              e.target.style.background = 'rgba(255,255,255,0.04)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Password field */}
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '7px',
                        }}>
                          <label style={{
                            fontSize: '11px', letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            color: 'rgba(242,237,230,0.4)',
                          }}>Mot de passe</label>
                          <Link to="/forgot-password" style={{
                            fontSize: '11px', color: 'rgba(193,68,14,0.8)',
                            textDecoration: 'none', transition: 'color 0.2s',
                          }}>
                            Mot de passe oublié ?
                          </Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <svg style={{
                            position: 'absolute', left: '13px',
                            top: '50%', transform: 'translateY(-50%)',
                            color: 'rgba(242,237,230,0.2)', pointerEvents: 'none',
                          }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{
                              width: '100%', padding: '11px 40px 11px 40px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '0.5px solid rgba(242,237,230,0.14)',
                              borderRadius: '6px', color: '#F2EDE6',
                              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
                              outline: 'none', boxSizing: 'border-box',
                              transition: 'border-color 0.2s, background 0.2s',
                            }}
                            onFocus={e => {
                              e.target.style.borderColor = 'rgba(193,68,14,0.55)'
                              e.target.style.background = 'rgba(255,255,255,0.055)'
                            }}
                            onBlur={e => {
                              e.target.style.borderColor = 'rgba(242,237,230,0.14)'
                              e.target.style.background = 'rgba(255,255,255,0.04)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute', right: '13px',
                              top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none',
                              color: showPassword ? 'rgba(193,68,14,0.6)' : 'rgba(242,237,230,0.2)',
                              cursor: 'pointer', fontSize: '14px',
                              padding: 0, transition: 'color 0.2s',
                            }}
                            onMouseEnter={e =>
                              e.currentTarget.style.color = 'rgba(242,237,230,0.5)'
                            }
                            onMouseLeave={e =>
                              e.currentTarget.style.color = showPassword ? 'rgba(193,68,14,0.6)' : 'rgba(242,237,230,0.2)'
                            }
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Submit button */}
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          width: '100%', padding: '13px',
                          background: loading ? 'rgba(193,68,14,0.5)' : '#C1440E',
                          color: '#fff', border: 'none', borderRadius: '6px',
                          fontSize: '14px', fontWeight: 500,
                          fontFamily: 'DM Sans, sans-serif',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          letterSpacing: '0.02em',
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '8px',
                          transition: 'all 0.2s',
                          marginTop: '6px',
                        }}
                        onMouseEnter={e => {
                          if (!loading) e.currentTarget.style.background = '#A8380C';
                        }}
                        onMouseLeave={e => {
                          if (!loading) e.currentTarget.style.background = '#C1440E';
                        }}
                      >
                        <span>{loading ? 'Connexion en cours...' : 'Se connecter'}</span>
                        {!loading && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        )}
                      </button>

                    </form>

                    {/* Divider */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      gap: '12px', margin: '20px 0',
                    }}>
                      <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.07)' }} />
                      <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.2)' }}>
                        pas encore de compte ?
                      </span>
                      <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.07)' }} />
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'center' }}>
                      <Link to="/register" style={{
                        display: 'inline-block', width: '100%',
                        padding: '11px',
                        border: '0.5px solid rgba(242,237,230,0.1)',
                        borderRadius: '6px', fontSize: '13px',
                        color: 'rgba(242,237,230,0.5)',
                        textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                        transition: 'all 0.2s',
                      }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(232,184,122,0.4)'
                          e.currentTarget.style.color = '#E8B87A'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(242,237,230,0.1)'
                          e.currentTarget.style.color = 'rgba(242,237,230,0.5)'
                        }}
                      >
                        Créer un compte →
                      </Link>
                    </div>

                    {/* Security note */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '6px',
                      fontSize: '11px', color: 'rgba(242,237,230,0.18)',
                      marginTop: '16px',
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      Connexion chiffrée · Laravel Sanctum · TLS 1.3
                    </div>
                </div>
            </div>

        </div>
    )
}


export default Login