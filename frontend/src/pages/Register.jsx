import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Compass, Shield, Search, Building2 } from 'lucide-react'
import api from '../services/api'

const QUARTIERS = {
  casablanca: ['Maarif', 'Anfa', 'Ain Diab', 'Hay Hassani', 'Sidi Bernoussi', 'Ain Sebaa', 'Roches Noires', 'Derb Sultan', 'Gauthier', 'Bourgogne', 'Californie', 'Sidi Maarouf', 'Oulfa', 'Habous'],
  rabat: ['Agdal', 'Hassan', 'Souissi', 'Hay Riad', 'Yacoub El Mansour', 'Ocean', 'Kamra', 'Akkari', 'Mabella', 'Takadoum', 'Nahda'],
  marrakesh: ['Gueliz', 'Médina', 'Hivernage', 'Palmeraie', 'Massira', 'Daoudiate', 'Sidi Youssef Ben Ali', 'Targa', 'Mhamid', 'Semlalia'],
  fes: ['Fès El Bali', 'Fès El Jdid', 'Saiss', 'Zouagha', 'Bensouda', 'Narjis', 'Route de Sefrou', 'Oued Fès', 'Hay Hassani'],
  agadir: ['Centre ville', 'Talborjt', 'Hay Mohammadi', 'Anza', 'Bensergao', 'Tikiouine', 'Dakhla', 'Ihchach', 'Founty'],
  tanger: ['Centre', 'Malabata', 'Boukhalef', 'Iberia', 'Moujahidine', 'Marshan', 'Castilla', 'Branses', 'Mghogha'],
  meknes: ['Hamria', 'Plaza', 'Mansour', 'Zitoune', 'Sidi Baba', 'Marjane', 'Ouislane'],
  kenitra: ['Mimosas', 'Ville Haute', 'Bir Rami', 'Val Fleury', 'Mehdia', 'Ouled Oujih', 'Alliance'],
  safi: ['Plateau', 'Biada', 'Kawki', 'Sania', 'Azib Derai', 'Mouna', 'Anas', 'Koudia'],
  eljadida: ['Plateau', 'Hay Matar', 'Hay Salam', 'Ville Haute', 'Port', 'Sidi Moussa', 'Al Qods'],
  mohammedia: ['Parc', 'Kasbah', 'Monica', 'Les Crêtes', 'Rachidia', 'Al Alia', 'Beni Yakhlef'],
  oujda: ['Centre Ville', 'Lazaret', 'Al Qods', 'Hay Salam', 'Sidi Yahya', 'Zaitoune'],
  tetouan: ['Safir', 'Mhannech', 'Mulay El Mehdi', 'Jbel Dersa', 'Kwilma', 'Touabel'],
  nador: ['Ouled Mimoun', 'Lâari Sheikh', 'Al Matar', 'Hay Al Inara', 'Kandi'],
}

const ADMIN_DEPARTMENTS = [
  'Agence Urbaine',
  'Commune / Mairie',
  'Division de l\'Urbanisme',
  'Wilaya / Région',
  'Direction de l\'Aménagement',
  'Bureau d\'Études Techniques',
  'Inspection Régionale',
]

const CITIES_DATA = [
  { v:'casablanca', l:'Casablanca', pop:'3.7M hab.', zones:'18 zones', region:'centre', regionLabel:'Centre-Ouest', status:'active', color:'#1A5276', activity:85 },
  { v:'rabat',      l:'Rabat',      pop:'577K hab.', zones:'12 zones', region:'centre', regionLabel:'Centre-Ouest', status:'active', color:'#1A5276', activity:72 },
  { v:'mohammedia', l:'Mohammédia', pop:'208K hab.', zones:'6 zones',  region:'centre', regionLabel:'Centre-Ouest', status:'active', color:'#1A5276', activity:45 },
  { v:'kenitra',    l:'Kénitra',    pop:'431K hab.', zones:'8 zones',  region:'centre', regionLabel:'Centre-Ouest', status:'beta',   color:'#E8B87A', activity:30 },
  { v:'marrakesh',  l:'Marrakech',  pop:'928K hab.', zones:'14 zones', region:'sud',    regionLabel:'Sud',          status:'active', color:'#C1440E', activity:91 },
  { v:'agadir',     l:'Agadir',     pop:'421K hab.', zones:'9 zones',  region:'sud',    regionLabel:'Souss-Massa',  status:'active', color:'#C1440E', activity:60 },
  { v:'taroudant',  l:'Taroudant',  pop:'80K hab.',  zones:'3 zones',  region:'sud',    regionLabel:'Souss-Massa',  status:'beta',   color:'#E8B87A', activity:20 },
  { v:'laayoune',   l:'Laâyoune',   pop:'217K hab.', zones:'4 zones',  region:'sud',    regionLabel:'Laâyoune-Sakia',status:'beta', color:'#E8B87A', activity:15 },
  { v:'dakhla',     l:'Dakhla',     pop:'106K hab.', zones:'2 zones',  region:'sud',    regionLabel:'Dakhla-Oued',  status:'soon',   color:'#C1440E', activity:0 },
  { v:'tanger',     l:'Tanger',     pop:'947K hab.', zones:'11 zones', region:'nord',   regionLabel:'Tanger-Tétouan',status:'active',color:'#5DADE2', activity:68 },
  { v:'tetouan',    l:'Tétouan',    pop:'380K hab.', zones:'7 zones',  region:'nord',   regionLabel:'Tanger-Tétouan',status:'active',color:'#5DADE2', activity:42 },
  { v:'chefchaouen',l:'Chefchaouen',pop:'45K hab.',  zones:'4 zones',  region:'nord',   regionLabel:'Tanger-Tétouan',status:'beta',  color:'#5DADE2', activity:22 },
  { v:'alhoceima',  l:'Al Hoceima', pop:'56K hab.',  zones:'3 zones',  region:'nord',   regionLabel:'Tanger-Tétouan',status:'soon',  color:'#5DADE2', activity:0 },
  { v:'fes',        l:'Fès',        pop:'1.1M hab.', zones:'10 zones', region:'centre', regionLabel:'Fès-Meknès',   status:'active', color:'#E8B87A', activity:78 },
  { v:'meknes',     l:'Meknès',     pop:'632K hab.', zones:'8 zones',  region:'centre', regionLabel:'Fès-Meknès',   status:'active', color:'#E8B87A', activity:55 },
  { v:'taza',       l:'Taza',       pop:'147K hab.', zones:'3 zones',  region:'centre', regionLabel:'Fès-Meknès',   status:'soon',   color:'#E8B87A', activity:0 },
  { v:'oujda',      l:'Oujda',      pop:'494K hab.', zones:'7 zones',  region:'oriental',regionLabel:'Oriental',    status:'active', color:'#52BE80', activity:48 },
  { v:'nador',      l:'Nador',      pop:'162K hab.', zones:'4 zones',  region:'oriental',regionLabel:'Oriental',    status:'beta',   color:'#52BE80', activity:18 },
  { v:'eljadida',   l:'El Jadida',  pop:'194K hab.', zones:'5 zones',  region:'centre', regionLabel:'Casablanca-Settat',status:'active',color:'#1A5276',activity:35 },
  { v:'settat',     l:'Settat',     pop:'142K hab.', zones:'3 zones',  region:'centre', regionLabel:'Casablanca-Settat',status:'soon',  color:'#1A5276',activity:0 },
  { v:'benimellal', l:'Béni Mellal',pop:'192K hab.', zones:'4 zones',  region:'centre', regionLabel:'Béni Mellal',  status:'beta',   color:'#1A5276', activity:12 },
  { v:'khouribga',  l:'Khouribga',  pop:'196K hab.', zones:'3 zones',  region:'centre', regionLabel:'Béni Mellal',  status:'soon',   color:'#1A5276', activity:0 },
  { v:'safi',       l:'Safi',       pop:'308K hab.', zones:'5 zones',  region:'centre', regionLabel:'Marrakech-Safi',status:'beta',  color:'#C1440E', activity:25 },
  { v:'khemisset',  l:'Khémisset',  pop:'131K hab.', zones:'2 zones',  region:'centre', regionLabel:'Rabat-Salé',   status:'soon',   color:'#1A5276', activity:0 },
]
const STATUS_LABELS = { active:'Actif', beta:'Bêta', soon:'Bientôt' }
const STATUS_COLORS = {
  active:{ border:'rgba(82,190,128,0.4)',  color:'rgba(82,190,128,0.8)',  bg:'rgba(82,190,128,0.06)' },
  beta:  { border:'rgba(232,184,122,0.4)', color:'rgba(232,184,122,0.7)', bg:'rgba(232,184,122,0.06)' },
  soon:  { border:'rgba(242,237,230,0.15)',color:'rgba(242,237,230,0.3)', bg:'transparent' },
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [regionSearch, setRegionSearch] = useState('')
  const [deptSuggestions, setDeptSuggestions] = useState([])
  
  const [form, setForm] = useState({
    nom: '', email: '', password: '', password_confirmation: '',
    role: '', city: '', region: '', company_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRoleSelect = (role) => {
    setForm({ ...form, role })
    setStep(2)
  }

  // --- Step 3: Region Autocomplete ---
  const handleRegionSearch = (e) => {
    const val = e.target.value
    setRegionSearch(val)
    setForm({ ...form, region: val }) // Keep whatever they typed even if no match
  }

  const handleRegionSelect = (q) => {
    setForm({ ...form, region: q })
    setRegionSearch(q)
  }

  // --- Admin: Dept Suggestions ---
  const handleDeptSearch = (e) => {
    const val = e.target.value
    setForm({ ...form, company_name: val })
    if (val.length > 0) {
      const filtered = ADMIN_DEPARTMENTS.filter(d => 
        d.toLowerCase().includes(val.toLowerCase())
      )
      setDeptSuggestions(filtered)
    } else {
      setDeptSuggestions([])
    }
  }

  const handleDeptSelect = (d) => {
    setForm({ ...form, company_name: d })
    setDeptSuggestions([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
        setError('Les mots de passe ne correspondent pas')
        return
    }
    setLoading(true)
    setError('')
    
    try {
      await api.register(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      background: '#0E0B08',
      minHeight: '100vh',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F2EDE6' stroke-width='0.5'%3E%3Cpolygon points='30,2 58,16 58,44 30,58 2,44 2,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3Cline x1='30' y1='2' x2='30' y2='10'/%3E%3Cline x1='58' y1='16' x2='50' y2='20'/%3E%3Cline x1='58' y1='44' x2='50' y2='40'/%3E%3Cline x1='30' y1='58' x2='30' y2='50'/%3E%3Cline x1='2' y1='44' x2='10' y2='40'/%3E%3Cline x1='2' y1='16' x2='10' y2='20'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <aside style={{
        width: '420px', minWidth: '420px',
        background: 'rgba(193,68,14,0.06)',
        borderRight: '0.5px solid rgba(193,68,14,0.2)',
        display: 'flex', flexDirection: 'column',
        padding: '48px 40px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          fontFamily: 'Amiri, serif', fontSize: '18px',
          color: '#E8B87A', marginBottom: '56px',
        }}>
          <div style={{
            width: '8px', height: '8px', background: '#C1440E',
            borderRadius: '50%', animation: 'pulse 2s infinite',
          }} />
          UrbanMap
          <span style={{ opacity: 0.4, margin: '0 6px' }}>|</span>
          المغرب
        </div>

        {/* Heading */}
        <div>
          <h1 style={{
            fontFamily: 'Amiri, serif', fontSize: '38px',
            fontWeight: 700, color: '#F2EDE6',
            lineHeight: 1.15, marginBottom: '16px',
          }}>
            Votre ville<br />vous{' '}
            <span style={{ color: '#C1440E' }}>attend.</span>
          </h1>
          <p style={{
            fontSize: '13px', color: 'rgba(242,237,230,0.45)',
            lineHeight: 1.7, fontWeight: 300, marginBottom: '48px',
          }}>
            Créez votre compte en 3 étapes et rejoignez la plateforme
            citoyenne de référence au Maroc.
          </p>
        </div>

        {/* Step vertical tracker */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { n: 1, label: 'Votre rôle', hint: 'Citoyen, Urbaniste, Admin' },
            { n: 2, label: 'Votre ville', hint: 'Localisation principale' },
            { n: 3, label: 'Vos informations', hint: 'Nom, email, mot de passe' },
          ].map(({ n, label, hint }, i) => {
            const isDone = step > n
            const isActive = step === n
            return (
              <div key={n} style={{
                display: 'flex', alignItems: 'flex-start',
                gap: '16px', paddingBottom: i < 2 ? '32px' : 0,
                position: 'relative',
              }}>
                {/* connecting line */}
                {i < 2 && (
                  <div style={{
                    position: 'absolute', left: '15px', top: '32px',
                    width: '0.5px', height: 'calc(100% - 12px)',
                    background: isDone
                      ? 'rgba(193,68,14,0.4)'
                      : 'rgba(242,237,230,0.1)',
                    transition: 'background 0.3s',
                  }} />
                )}
                {/* circle */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  flexShrink: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 500,
                  transition: 'all 0.3s',
                  background: isDone
                    ? 'rgba(193,68,14,0.15)'
                    : isActive ? '#C1440E' : 'transparent',
                  border: isDone
                    ? '0.5px solid rgba(193,68,14,0.5)'
                    : isActive
                      ? '0.5px solid #C1440E'
                      : '0.5px solid rgba(242,237,230,0.15)',
                  color: isDone
                    ? '#C1440E'
                    : isActive ? '#fff' : 'rgba(242,237,230,0.3)',
                }}>
                  {isDone ? '✓' : n}
                </div>
                {/* text */}
                <div style={{ paddingTop: '4px' }}>
                  <div style={{
                    fontSize: '13px', fontWeight: 500,
                    color: isDone
                      ? 'rgba(193,68,14,0.8)'
                      : isActive ? '#F2EDE6' : 'rgba(242,237,230,0.25)',
                    transition: 'color 0.3s',
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(242,237,230,0.25)',
                    marginTop: '2px',
                  }}>
                    {hint}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom login link */}
        <div style={{
          marginTop: 'auto', paddingTop: '40px',
          borderTop: '0.5px solid rgba(242,237,230,0.07)',
        }}>
          <p style={{ fontSize: '13px', color: 'rgba(242,237,230,0.35)' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{
              color: '#E8B87A', textDecoration: 'none', fontWeight: 500,
            }}>
              Se connecter →
            </Link>
          </p>
        </div>
      </aside>

      <main style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px', position: 'relative', zIndex: 1,
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* STEP 1 — Role */}
        {step === 1 && (
          <div>
            {/* Step tag */}
            <div style={{ marginBottom: '36px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                border: '0.5px solid rgba(193,68,14,0.35)',
                borderRadius: '100px', padding: '5px 12px',
                fontSize: '10px', color: '#C1440E',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: 'rgba(193,68,14,0.07)', marginBottom: '14px',
              }}>
                <span style={{width:'5px',height:'5px',background:'#C1440E',
                  borderRadius:'50%',display:'inline-block'}}/>
                Étape 1 sur 3
              </div>
              <h2 style={{
                fontFamily: 'Amiri, serif', fontSize: '30px',
                color: '#F2EDE6', fontWeight: 700, marginBottom: '6px',
              }}>
                Qui êtes-vous ?
              </h2>
              <p style={{
                fontSize: '13px', color: 'rgba(242,237,230,0.4)',
                fontWeight: 300, lineHeight: 1.6,
              }}>
                Choisissez votre rôle pour personnaliser votre expérience.
              </p>
            </div>

            {/* Role cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                {
                  role: 'citoyen', IconComponent: User,
                  iconBg: 'rgba(193,68,14,0.15)', iconColor: '#C1440E',
                  name: 'Citoyen',
                  desc: 'Signalez des problèmes dans votre quartier, suivez leur résolution et participez à la vie urbaine.',
                  badge: 'Accès libre',
                  badgeStyle: { borderColor: 'rgba(82,190,128,0.4)', color: 'rgba(82,190,128,0.8)' },
                  featured: true,
                },
                {
                  role: 'urbaniste', IconComponent: Compass,
                  iconBg: 'rgba(232,184,122,0.15)', iconColor: '#E8B87A',
                  name: 'Urbaniste',
                  desc: 'Analysez les données spatiales, synthèses IA, annotations privées et rapports PDF.',
                  badge: 'Professionnel',
                  badgeStyle: { borderColor: 'rgba(232,184,122,0.4)', color: 'rgba(232,184,122,0.7)' },
                  featured: false,
                },
                {
                  role: 'admin', IconComponent: Shield,
                  iconBg: 'rgba(26,82,118,0.2)', iconColor: '#5DADE2',
                  name: 'Administrateur',
                  desc: 'Gérez les zones urbaines, modérez les signalements et administrez votre territoire.',
                  badge: 'Institution',
                  badgeStyle: { borderColor: 'rgba(93,173,226,0.4)', color: 'rgba(93,173,226,0.7)' },
                  featured: false,
                },
              ].map(({ role, IconComponent, iconBg, iconColor, name, desc, badge, badgeStyle, featured }) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr auto',
                    alignItems: 'center', gap: '16px',
                    border: featured
                      ? '0.5px solid rgba(193,68,14,0.35)'
                      : '0.5px solid rgba(242,237,230,0.1)',
                    borderRadius: '8px', padding: '18px 20px',
                    cursor: 'pointer',
                    background: featured ? 'rgba(193,68,14,0.04)' : 'transparent',
                    textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.25s', width: '100%',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(193,68,14,0.5)'
                    e.currentTarget.style.background = 'rgba(193,68,14,0.05)'
                    e.currentTarget.style.transform = 'translateX(3px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = featured
                      ? 'rgba(193,68,14,0.35)' : 'rgba(242,237,230,0.1)'
                    e.currentTarget.style.background = featured
                      ? 'rgba(193,68,14,0.04)' : 'transparent'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '8px',
                    background: iconBg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconComponent size={20} strokeWidth={1.5} color={iconColor} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: '14px', fontWeight: 500,
                      color: '#F2EDE6', marginBottom: '3px',
                    }}>
                      {name}
                    </div>
                    <div style={{
                      fontSize: '12px', color: 'rgba(242,237,230,0.4)',
                      lineHeight: 1.4, fontWeight: 300,
                    }}>
                      {desc}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '3px 9px',
                    borderRadius: '100px',
                    border: '0.5px solid',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    alignSelf: 'flex-start',
                    ...badgeStyle,
                  }}>
                    {badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.08)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.25)' }}>
                accès soumis à validation pour les rôles professionnels
              </span>
              <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.08)' }} />
            </div>
          </div>
        )}

        {/* STEP 2 — City Search */}
        {step === 2 && (() => {
          const filtered = CITIES_DATA.filter(c => {
            const matchRegion = regionFilter === 'all' || c.region === regionFilter
            const matchSearch = c.l.toLowerCase().includes(searchTerm.toLowerCase())
            return matchRegion && matchSearch
          })
          // group by regionLabel
          const groups = filtered.reduce((acc, c) => {
            acc[c.regionLabel] = acc[c.regionLabel] || []
            acc[c.regionLabel].push(c)
            return acc
          }, {})
          const selectedCityData = CITIES_DATA.find(c => c.v === form.city)
          return (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:'6px',
                border:'0.5px solid rgba(193,68,14,0.35)', borderRadius:'100px',
                padding:'5px 12px', fontSize:'10px', color:'#C1440E',
                letterSpacing:'0.1em', textTransform:'uppercase',
                background:'rgba(193,68,14,0.07)', marginBottom:'20px',
              }}>
                <span style={{width:'5px',height:'5px',background:'#C1440E',borderRadius:'50%',display:'inline-block'}}/>
                Étape 2 sur 3
              </div>
              <h2 style={{ fontFamily:'Amiri, serif', fontSize:'34px', color:'#F2EDE6', fontWeight:700, marginBottom:'8px', lineHeight:1.2 }}>
                {form.role === 'citoyen' ? 'Votre ville de résidence' : "Ville d'affectation"}
              </h2>
              <p style={{ fontSize:'13px', color:'rgba(242,237,230,0.4)', fontWeight:300, lineHeight:1.6 }}>
                Sélectionnez la ville principale de votre activité. Vous aurez accès aux zones et données de cette ville.
              </p>
            </div>

            {/* Search — command palette style */}
            <div style={{ position:'relative', marginBottom:'4px' }}>
              <Search size={16} strokeWidth={1.5} color='rgba(242,237,230,0.25)'
                style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}
              />
              <input
                type='text' autoComplete='off'
                placeholder='Rechercher une ville...'
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value) }}
                style={{
                  width:'100%', padding:'13px 44px 13px 42px',
                  background:'rgba(255,255,255,0.05)',
                  border:'0.5px solid rgba(242,237,230,0.2)',
                  borderRadius:'8px', color:'#F2EDE6',
                  fontSize:'14px', fontFamily:'DM Sans, sans-serif',
                  outline:'none', letterSpacing:'0.01em',
                  transition:'border-color 0.2s, background 0.2s',
                  boxSizing:'border-box',
                }}
                onFocus={e => { e.target.style.borderColor='rgba(193,68,14,0.6)'; e.target.style.background='rgba(255,255,255,0.06)' }}
                onBlur={e => { e.target.style.borderColor='rgba(242,237,230,0.2)'; e.target.style.background='rgba(255,255,255,0.05)' }}
              />
              <span style={{
                position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                fontSize:'10px', color:'rgba(242,237,230,0.2)',
                border:'0.5px solid rgba(242,237,230,0.12)', borderRadius:'3px',
                padding:'2px 6px', letterSpacing:'0.05em',
              }}>⌘K</span>
            </div>

            {/* Region tabs */}
            <div style={{ display:'flex', gap:'6px', margin:'14px 0 10px', flexWrap:'wrap' }}>
              {[['all','Toutes'],['nord','Nord'],['centre','Centre'],['sud','Sud'],['oriental','Oriental']].map(([key, label]) => (
                <button key={key} onClick={() => setRegionFilter(key)}
                  style={{
                    padding:'5px 12px', borderRadius:'100px',
                    fontSize:'11px', fontFamily:'DM Sans, sans-serif',
                    border: regionFilter === key ? '0.5px solid rgba(193,68,14,0.6)' : '0.5px solid rgba(242,237,230,0.12)',
                    color: regionFilter === key ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
                    background: regionFilter === key ? 'rgba(193,68,14,0.1)' : 'transparent',
                    cursor:'pointer', transition:'all 0.2s', letterSpacing:'0.03em',
                  }}
                >{label}</button>
              ))}
            </div>

            {/* Results count */}
            <div style={{ fontSize:'11px', color:'rgba(242,237,230,0.2)', textAlign:'right', padding:'6px 2px 0', letterSpacing:'0.04em' }}>
              {filtered.length} ville{filtered.length !== 1 ? 's' : ''} trouvée{filtered.length !== 1 ? 's' : ''}
            </div>

            {/* City list */}
            <div style={{
              background:'rgba(255,255,255,0.025)',
              border:'0.5px solid rgba(242,237,230,0.08)',
              borderRadius:'8px', overflow:'hidden',
              maxHeight:'340px', overflowY:'auto',
            }}>
              {filtered.length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', fontSize:'13px', color:'rgba(242,237,230,0.25)' }}>
                  Aucune ville trouvée pour « <strong>{searchTerm}</strong> »
                </div>
              ) : (
                Object.entries(groups).map(([regionLabel, cities]) => (
                  <div key={regionLabel}>
                    <div style={{
                      padding:'8px 16px 6px', fontSize:'10px', letterSpacing:'0.1em',
                      textTransform:'uppercase', color:'rgba(242,237,230,0.2)', fontWeight:500,
                      borderBottom:'0.5px solid rgba(242,237,230,0.05)',
                      background:'rgba(255,255,255,0.02)',
                    }}>{regionLabel}</div>
                    {cities.map(c => {
                      const isSel = form.city === c.v
                      const sc = STATUS_COLORS[c.status]
                      return (
                        <button key={c.v}
                          onClick={() => setForm(f => ({ ...f, city: f.city === c.v ? '' : c.v, region:'' }))}
                          style={{
                            display:'grid', gridTemplateColumns:'36px 1fr auto',
                            alignItems:'center', gap:'12px',
                            padding:'13px 16px', cursor:'pointer',
                            borderBottom:'0.5px solid rgba(242,237,230,0.04)',
                            borderLeft:'none', borderRight:'none', borderTop:'none',
                            transition:'all 0.15s', width:'100%', textAlign:'left',
                            fontFamily:'DM Sans, sans-serif',
                            background: isSel ? 'rgba(193,68,14,0.08)' : 'transparent',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background='transparent' }}
                        >
                          {/* Dot + activity bar */}
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c.color, margin:'0 auto' }}/>
                            {c.activity > 0 && (
                              <div style={{ width:`${c.activity}%`, maxWidth:'28px', height:'3px', borderRadius:'2px', background:c.color, opacity:0.5 }}/>
                            )}
                          </div>
                          {/* Name + meta */}
                          <div>
                            <div style={{ fontSize:'13px', fontWeight:500, color: isSel ? '#F2EDE6' : 'rgba(242,237,230,0.85)', marginBottom:'2px', transition:'color 0.15s' }}>{c.l}</div>
                            <div style={{ fontSize:'11px', color:'rgba(242,237,230,0.28)', fontWeight:300, display:'flex', gap:'10px' }}>
                              <span>{c.pop}</span><span>{c.zones}</span>
                            </div>
                          </div>
                          {/* Status + check */}
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0 }}>
                            <span style={{
                              fontSize:'10px', padding:'2px 8px', borderRadius:'100px',
                              border:`0.5px solid ${sc.border}`, color:sc.color,
                              background:sc.bg, whiteSpace:'nowrap',
                            }}>{STATUS_LABELS[c.status]}</span>
                            <div style={{
                              width:'16px', height:'16px', borderRadius:'50%', display:'flex',
                              alignItems:'center', justifyContent:'center', transition:'all 0.2s',
                              border: isSel ? 'none' : '0.5px solid rgba(242,237,230,0.15)',
                              background: isSel ? '#C1440E' : 'transparent',
                            }}>
                              {isSel && (
                                <svg width='8' height='8' viewBox='0 0 10 10' fill='none'>
                                  <path d='M2 5l2.5 2.5 4-4' stroke='#fff' strokeWidth='1.5' strokeLinecap='round'/>
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Selected preview */}
            {selectedCityData && (
              <div style={{
                marginTop:'10px', border:'0.5px solid rgba(193,68,14,0.35)',
                borderRadius:'8px', padding:'14px 18px',
                background:'rgba(193,68,14,0.05)',
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', flexShrink:0, background:selectedCityData.color }}/>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'#F2EDE6' }}>{selectedCityData.l}</div>
                    <div style={{ fontSize:'11px', color:'rgba(242,237,230,0.35)', marginTop:'1px' }}>
                      {selectedCityData.regionLabel} · {selectedCityData.pop} · {selectedCityData.zones}
                    </div>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => setForm(f => ({ ...f, city:'', region:'' }))}
                  style={{
                    fontSize:'11px', color:'rgba(242,237,230,0.3)',
                    cursor:'pointer', background:'none', border:'none',
                    fontFamily:'DM Sans, sans-serif', padding:'4px 8px',
                    borderRadius:'4px', transition:'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color='rgba(242,237,230,0.7)'; e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='rgba(242,237,230,0.3)'; e.currentTarget.style.background='none' }}
                >Changer ×</button>
              </div>
            )}

            {/* Actions */}
            <div style={{ marginTop:'20px', display:'flex', gap:'10px' }}>
              <button
                type='button' onClick={() => setStep(1)}
                style={{
                  padding:'13px 20px', background:'transparent',
                  color:'rgba(242,237,230,0.4)',
                  border:'0.5px solid rgba(242,237,230,0.12)',
                  borderRadius:'6px', fontSize:'13px',
                  fontFamily:'DM Sans, sans-serif', cursor:'pointer',
                  transition:'all 0.2s', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(242,237,230,0.3)'; e.currentTarget.style.color='rgba(242,237,230,0.7)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(242,237,230,0.12)'; e.currentTarget.style.color='rgba(242,237,230,0.4)' }}
              >← Retour</button>
              <button
                type='button'
                disabled={!form.city}
                onClick={() => form.city && setStep(3)}
                style={{
                  flex:1, padding:'13px',
                  background: 'transparent',
                  color: form.city ? '#C1440E' : 'rgba(193,68,14,0.3)',
                  border: form.city
                    ? '0.5px solid #C1440E'
                    : '0.5px solid rgba(193,68,14,0.2)',
                  borderRadius:'6px',
                  fontSize:'14px', fontWeight:500,
                  fontFamily:'DM Sans, sans-serif',
                  cursor: form.city ? 'pointer' : 'not-allowed',
                  transition:'all 0.2s',
                }}
                onMouseEnter={e => { if (form.city) e.currentTarget.style.background = '#C1440E'; if (form.city) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (form.city) e.currentTarget.style.background = 'transparent'; if (form.city) e.currentTarget.style.color = '#C1440E'; }}
              >
                {form.city
                  ? `Continuer avec ${selectedCityData?.l} →`
                  : "Continuer vers l'étape 3 →"}
              </button>
            </div>
          </div>
        )})()}


        {/* STEP 3 — Details & Region Search */}
        {step === 3 && (() => {
          const inp = {
            width: '100%', padding: '11px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(242,237,230,0.15)',
            borderRadius: '6px', color: '#F2EDE6',
            fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }

          return (
            <div>
              {/* Step header */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  border: '0.5px solid rgba(193,68,14,0.35)',
                  borderRadius: '100px', padding: '5px 12px',
                  fontSize: '10px', color: '#C1440E',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'rgba(193,68,14,0.07)', marginBottom: '14px',
                }}>
                  <span style={{width:'5px',height:'5px',background:'#C1440E',
                    borderRadius:'50%',display:'inline-block'}}/>
                  Étape 3 sur 3
                </div>
                <h2 style={{
                  fontFamily: 'Amiri, serif', fontSize: '30px',
                  color: '#F2EDE6', fontWeight: 700, marginBottom: '6px',
                }}>
                  Vos informations
                </h2>
                <p style={{
                  fontSize: '13px', color: 'rgba(242,237,230,0.4)',
                  fontWeight: 300, lineHeight: 1.6,
                }}>
                  Dernière étape — remplissez vos coordonnées pour finaliser.
                </p>
              </div>

              <form onSubmit={handleSubmit}>

                {/* Pro warning */}
                {form.role !== 'citoyen' && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: 'rgba(245,158,11,0.07)',
                    border: '0.5px solid rgba(245,158,11,0.25)',
                    borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
                  }}>
                    <div style={{
                      width: '6px', height: '6px', background: '#f59e0b',
                      borderRadius: '50%', flexShrink: 0, marginTop: '4px',
                    }} />
                    <p style={{
                      fontSize: '11px', color: 'rgba(245,158,11,0.8)',
                      lineHeight: 1.5, margin: 0,
                    }}>
                      Ce rôle est soumis à validation par un Super Admin avant
                      activation. Vous recevrez un email de confirmation.
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(193,68,14,0.1)',
                    border: '0.5px solid rgba(193,68,14,0.4)',
                    borderRadius: '6px', padding: '10px 14px', marginBottom: '14px',
                    fontSize: '12px', color: '#C1440E',
                  }}>
                    ⚠ {error}
                  </div>
                )}

                {/* Nom + Email side by side */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '12px', marginBottom: '14px',
                }}>
                  <div>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Nom complet</label>
                    <input
                      style={inp} type="text" name="nom"
                      placeholder="Ex: Youssef Alami"
                      value={form.nom} onChange={handleChange} required
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                  </div>
                  <div>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Email</label>
                    <input
                      style={inp} type="email" name="email"
                      placeholder="vous@exemple.ma"
                      value={form.email} onChange={handleChange} required
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                  </div>
                </div>

                {/* Quartier — citoyen only — pills */}
                {form.role === 'citoyen' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Votre quartier</label>
                    <input
                      style={inp} type="text"
                      placeholder="Chercher un quartier..."
                      value={regionSearch}
                      onChange={handleRegionSearch}
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                    {/* Quartier pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {(QUARTIERS[form.city] || [])
                        .filter(q => !regionSearch ||
                          q.toLowerCase().includes(regionSearch.toLowerCase()))
                        .map(q => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleRegionSelect(q)}
                            style={{
                              padding: '5px 12px', borderRadius: '100px',
                              fontSize: '11px', cursor: 'pointer',
                              fontFamily: 'DM Sans, sans-serif',
                              transition: 'all 0.2s',
                              background: form.region === q
                                ? 'rgba(193,68,14,0.15)' : 'transparent',
                              border: form.region === q
                                ? '0.5px solid #C1440E'
                                : '0.5px solid rgba(242,237,230,0.15)',
                              color: form.region === q
                                ? '#F2EDE6' : 'rgba(242,237,230,0.5)',
                            }}
                          >
                            {q}
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Department — admin/urbaniste only */}
                {(form.role === 'admin' || form.role === 'urbaniste') && (
                  <div style={{ marginBottom: '14px', position: 'relative' }}>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Service / Département</label>
                    <input
                      style={inp} type="text" name="company_name"
                      placeholder="Ex: Agence Urbaine, Commune..."
                      value={form.company_name}
                      onChange={handleDeptSearch} required
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                    {deptSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 2px)',
                        left: 0, right: 0, background: '#1A1410',
                        border: '0.5px solid rgba(193,68,14,0.3)',
                        borderRadius: '6px', zIndex: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        maxHeight: '160px', overflowY: 'auto',
                      }}>
                        {deptSuggestions.map(d => (
                          <div
                            key={d}
                            onClick={() => handleDeptSelect(d)}
                            style={{
                              padding: '10px 14px', cursor: 'pointer',
                              fontSize: '13px', color: 'rgba(242,237,230,0.8)',
                              borderBottom: '0.5px solid rgba(242,237,230,0.05)',
                              transition: 'background 0.15s',
                              display: 'flex', alignItems: 'center', gap: '8px',
                            }}
                            onMouseEnter={e =>
                              e.currentTarget.style.background = 'rgba(193,68,14,0.1)'
                            }
                            onMouseLeave={e =>
                              e.currentTarget.style.background = 'transparent'
                            }
                          >
                            <Building2 size={13} style={{ flexShrink: 0, color: 'rgba(242,237,230,0.4)' }} /> {d}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Security divider */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: '12px', margin: '18px 0',
                }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.08)' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.25)' }}>
                    sécurité
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(242,237,230,0.08)' }} />
                </div>

                {/* Password + Confirm side by side */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '12px', marginBottom: '20px',
                }}>
                  <div>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Mot de passe</label>
                    <input
                      style={inp} type="password" name="password"
                      placeholder="••••••••"
                      value={form.password} onChange={handleChange} required
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                  </div>
                  <div>
                    <label style={{
                      fontSize: '11px', color: 'rgba(242,237,230,0.4)',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: '6px', display: 'block',
                    }}>Confirmation</label>
                    <input
                      style={inp} type="password" name="password_confirmation"
                      placeholder="••••••••"
                      value={form.password_confirmation}
                      onChange={handleChange} required
                      onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.15)'}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: 'transparent',
                    color: loading ? 'rgba(193,68,14,0.5)' : '#C1440E',
                    border: loading
                      ? '0.5px solid rgba(193,68,14,0.4)'
                      : '0.5px solid #C1440E',
                    borderRadius: '6px',
                    fontSize: '14px', fontWeight: 500,
                    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                    letterSpacing: '0.02em', marginBottom: '8px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#C1440E'; e.currentTarget.style.color = '#fff'; }}}
                  onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#C1440E'; }}}
                >
                  {loading ? 'Inscription en cours...' : 'Créer mon compte →'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    width: '100%', padding: '10px',
                    background: 'transparent',
                    color: 'rgba(242,237,230,0.4)',
                    border: '0.5px solid rgba(242,237,230,0.12)',
                    borderRadius: '6px', fontSize: '13px',
                    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(242,237,230,0.3)'
                    e.currentTarget.style.color = 'rgba(242,237,230,0.7)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(242,237,230,0.12)'
                    e.currentTarget.style.color = 'rgba(242,237,230,0.4)'
                  }}
                >
                  ← Retour
                </button>
              </form>
            </div>
          )
        })()}
        </div>
      </main>
    </div>
  )
}