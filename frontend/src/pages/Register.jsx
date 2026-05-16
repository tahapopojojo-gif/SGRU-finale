import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

const MOROCCAN_CITIES = [
  { value: 'casablanca', label: 'Casablanca', emoji: '🏙️' },
  { value: 'rabat', label: 'Rabat', emoji: '🏛️' },
  { value: 'fes', label: 'Fès', emoji: '🏺' },
  { value: 'marrakesh', label: 'Marrakesh', emoji: '🕌' },
  { value: 'agadir', label: 'Agadir', emoji: '🌊' },
  { value: 'tanger', label: 'Tanger', emoji: '⚓' },
  { value: 'meknes', label: 'Meknès', emoji: '🏰' },
  { value: 'oujda', label: 'Oujda', emoji: '🕌' },
  { value: 'kenitra', label: 'Kénitra', emoji: '🏭' },
  { value: 'tetouan', label: 'Tétouan', emoji: '🏘️' },
  { value: 'mohammedia', label: 'Mohammédia', emoji: '🏖️' },
  { value: 'safi', label: 'Safi', emoji: '🏺' },
  { value: 'eljadida', label: 'El Jadida', emoji: '🏖️' },
  { value: 'nador', label: 'Nador', emoji: '⚓' },
  { value: 'settat', label: 'Settat', emoji: '🌾' },
  { value: 'benimellal', label: 'Béni Mellal', emoji: '🏞️' },
  { value: 'khouribga', label: 'Khouribga', emoji: '⛏️' },
  { value: 'taza', label: 'Taza', emoji: '🏔️' },
  { value: 'laayoune', label: 'Laâyoune', emoji: '🏜️' },
  { value: 'dakhla', label: 'Dakhla', emoji: '🏄' },
  { value: 'taroudant', label: 'Taroudant', emoji: '🍊' },
  { value: 'khemisset', label: 'Khémisset', emoji: '🐎' },
  { value: 'chefchaouen', label: 'Chefchaouen', emoji: '💙' },
  { value: 'alhoceima', label: 'Al Hoceima', emoji: '🌊' },
]

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

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) 
  const [searchTerm, setSearchTerm] = useState('')
  const [regionSearch, setRegionSearch] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [regionSuggestions, setRegionSuggestions] = useState([])
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

  // --- Step 2: City Autocomplete ---
  const handleCitySearch = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.length > 0) {
      const filtered = MOROCCAN_CITIES.filter(c => 
        c.label.toLowerCase().includes(val.toLowerCase())
      )
      setCitySuggestions(filtered)
    } else {
      setCitySuggestions([])
    }
  }

  const handleCitySelect = (city) => {
    setForm({ ...form, city: city.value, region: '' })
    setSearchTerm(city.label)
    setCitySuggestions([])
    setStep(3)
  }

  // --- Step 3: Region Autocomplete ---
  const handleRegionSearch = (e) => {
    const val = e.target.value
    setRegionSearch(val)
    const availableQuartiers = QUARTIERS[form.city] || []
    if (val.length > 0) {
      const filtered = availableQuartiers.filter(q => 
        q.toLowerCase().includes(val.toLowerCase())
      )
      setRegionSuggestions(filtered)
    } else {
      setRegionSuggestions([])
    }
    setForm({ ...form, region: val }) // Keep whatever they typed even if no match
  }

  const handleRegionSelect = (q) => {
    setForm({ ...form, region: q })
    setRegionSearch(q)
    setRegionSuggestions([])
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🏙️ UrbanMap Maroc</h2>

        <div style={styles.progressBar}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              ...styles.progressDot,
              background: step >= s ? '#0f3460' : '#e5e7eb'
            }} />
          ))}
        </div>

        {/* STEP 1 — Role */}
        {step === 1 && (
          <div>
            <p style={styles.stepTitle}>Bienvenue ! Qui êtes-vous?</p>
            <div style={{...styles.roleGrid, gridTemplateColumns: '1fr', gap: '15px'}}>
              <button style={{...styles.roleBtn, padding: '20px'}} onClick={() => handleRoleSelect('citoyen')}>
                <span style={styles.roleEmoji}>🇲🇦</span>
                <span style={styles.roleName}>Citoyen</span>
                <span style={styles.roleDesc}>Je veux donner mon avis sur ma ville</span>
              </button>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                  <button style={styles.roleBtn} onClick={() => handleRoleSelect('urbaniste')}>
                    <span style={styles.roleEmoji}>📐</span>
                    <span style={styles.roleName}>Urbaniste</span>
                    <span style={styles.roleDesc}>Analyser et exporter des données</span>
                    <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>⚠️ Soumis à validation</span>
                  </button>
                  <button style={styles.roleBtn} onClick={() => handleRoleSelect('admin')}>
                    <span style={styles.roleEmoji}>👮‍♂️</span>
                    <span style={styles.roleName}>Administrateur</span>
                    <span style={styles.roleDesc}>Valider et gérer les demandes</span>
                    <span style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>⚠️ Soumis à validation</span>
                  </button>
              </div>
            </div>
            <p style={styles.loginLink}>
              Déjà un compte? <Link to="/login" style={{color: '#0f3460', fontWeight: 'bold'}}>Se connecter</Link>
            </p>
          </div>
        )}

        {/* STEP 2 — City Search */}
        {step === 2 && (
          <div>
            <p style={styles.stepTitle}>
              {form.role === 'citoyen' 
                ? "Dans quelle ville habitez-vous ?" 
                : "Quelle est votre ville d'affectation ?"}
            </p>
            <div style={styles.searchContainer}>
              <input 
                style={styles.input} 
                type="text" 
                placeholder="Chercher une ville (ex: Casablanca, Tanger...)" 
                value={searchTerm}
                onChange={handleCitySearch}
                autoFocus
              />
              {citySuggestions.length > 0 && (
                <div style={styles.suggestionsList}>
                  {citySuggestions.map(city => (
                    <div 
                      key={city.value} 
                      style={styles.suggestionItem}
                      onClick={() => handleCitySelect(city)}
                    >
                      <span>{city.emoji} {city.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button style={styles.backBtn} onClick={() => setStep(1)}>← Retour</button>
          </div>
        )}

        {/* STEP 3 — Details & Region Search */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <p style={styles.stepTitle}>Dernière étape : Vos informations</p>
            {error && <p style={styles.error}>{error}</p>}

            <input style={styles.input} type="text" name="nom"
              placeholder="Nom complet" value={form.nom}
              onChange={handleChange} required />

            <input style={styles.input} type="email" name="email"
              placeholder="Email" value={form.email}
              onChange={handleChange} required />

            {form.role === 'citoyen' && (
              <div style={styles.searchContainer}>
                <input 
                  style={styles.input} 
                  type="text" 
                  placeholder="Chercher votre quartier (ex: Maarif, Agdal...)" 
                  value={regionSearch}
                  onChange={handleRegionSearch}
                  required 
                />
                {regionSuggestions.length > 0 && (
                  <div style={styles.suggestionsList}>
                    {regionSuggestions.map(q => (
                      <div 
                        key={q} 
                        style={styles.suggestionItem}
                        onClick={() => handleRegionSelect(q)}
                      >
                        <span>📍 {q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(form.role === 'admin' || form.role === 'urbaniste') && (
              <div style={styles.searchContainer}>
                <input 
                  style={styles.input} 
                  type="text" 
                  name="company_name"
                  placeholder="Service / Département" 
                  value={form.company_name}
                  onChange={handleDeptSearch}
                  required 
                />
                {deptSuggestions.length > 0 && (
                  <div style={styles.suggestionsList}>
                    {deptSuggestions.map(d => (
                      <div 
                        key={d} 
                        style={styles.suggestionItem}
                        onClick={() => handleDeptSelect(d)}
                      >
                        <span>🏢 {d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input style={styles.input} type="password" name="password"
              placeholder="Mot de passe" value={form.password}
              onChange={handleChange} required />

            <input style={styles.input} type="password" name="password_confirmation"
              placeholder="Confirmer mot de passe" value={form.password_confirmation}
              onChange={handleChange} required />

            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
            <button type="button" style={styles.backBtn}
              onClick={() => setStep(form.role === 'citoyen' ? 2 : 1)}>
              ← Retour
            </button>
          </form>
        )}
      </div>
    </div>
  )
}


const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
  card: { background: 'white', padding: '40px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  title: { textAlign: 'center', marginBottom: '8px', fontSize: '28px', color: '#0f3460', fontWeight: 'bold' },
  progressBar: { display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' },
  progressDot: { width: '40px', height: '6px', borderRadius: '3px', transition: 'background 0.3s' },
  stepTitle: { fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#1e293b', textAlign: 'center' },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
  roleBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px', border: '2px solid #e5e7eb', borderRadius: '12px', background: 'white', cursor: 'pointer', transition: 'all 0.2s', gap: '6px' },
  roleEmoji: { fontSize: '32px' },
  roleName: { fontWeight: '700', fontSize: '15px', color: '#1e293b' },
  roleDesc: { fontSize: '12px', color: '#64748b', textAlign: 'center', lineHeight: '1.4' },
  searchContainer: { position: 'relative', width: '100%' },
  suggestionsList: { position: 'absolute', top: 'calc(100% - 14px)', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto' },
  suggestionItem: { padding: '10px 12px', cursor: 'pointer', transition: 'background 0.2s', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  input: { width: '100%', padding: '12px', marginBottom: '14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  button: { width: '100%', padding: '13px', background: '#0f3460', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' },
  backBtn: { width: '100%', padding: '10px', background: 'transparent', color: '#64748b', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' },
  error: { color: 'red', marginBottom: '12px', fontSize: '14px', textAlign: 'center' },
  loginLink: { textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#666' },
}