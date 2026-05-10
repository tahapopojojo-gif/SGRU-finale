import { useState, useEffect, useRef } from 'react'
import { analyzeOpinion } from '../services/aiService'
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, LayersControl, useMapEvents, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../services/api.js'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { validateRequired, validateTextLength, validateEmail } from '../services/validationService.js'
import { useToast } from '../hooks/useToast.js'

// Fix Leaflet Default Icon issue in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CITY_CENTERS = {
  casablanca: { center: [33.5731, -7.5898], zoom: 13 },
  rabat: { center: [34.0209, -6.8416], zoom: 13 },
  fes: { center: [34.0181, -5.0078], zoom: 13 },
  marrakesh: { center: [31.6295, -8.0083], zoom: 14 },
  agadir: { center: [30.4278, -9.5981], zoom: 13 },
  tanger: { center: [35.7595, -5.8340], zoom: 13 },
  meknes: { center: [33.8935, -5.5473], zoom: 13 },
}

const MOROCCO_BOUNDS = [
  [21.0, -17.0], // South West (Sahara)
  [36.0, -1.0],  // North East (Mediterranean/Border)
]

const styles = {
  wrapper: { position: 'relative', height: '100vh', width: '100%', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  map: { height: '100vh', width: '100%', zIndex: 1, paddingTop: '80px' }, // Added padding to push map below fixed navbar

  legend: { position: 'absolute', bottom: '40px', left: '24px', zIndex: 1000, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', padding: '16px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '140px' },
  legendTitle: { fontSize: '11px', fontWeight: '800', marginBottom: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%' },
  legendText: { fontSize: '12px', fontWeight: '500', color: '#475569' },
  panel: { position: 'absolute', top: '90px', right: '24px', zIndex: 1000, background: '#fff', width: '380px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', border: '1px solid #f1f5f9', scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' },
  panelHeader: { padding: '24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' },
  panelTitle: { fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' },
  adminCommentBox: { marginTop: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' },
  adminCommentLabel: { fontSize: '11px', fontWeight: '800', color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' },
  adminCommentText: { fontSize: '13px', color: '#78350f', fontStyle: 'italic' },
  panelMeta: { fontSize: '13px', color: '#64748b', marginTop: '6px', fontWeight: '500' },
  successBox: { padding: '40px', textAlign: 'center' },
  bigText: { fontSize: '22px', fontWeight: '800', margin: '16px 0 8px', color: '#0f172a' },
  smallText: { fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' },
  closeBtn2: { width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', color: '#475569' },
  parcelStats: { display: 'flex', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '16px', marginBottom: '20px' },
  parcelStat: { flex: 1, textAlign: 'center' },
  parcelStatNum: { display: 'block', fontSize: '18px', fontWeight: '800', color: '#0f172a' },
  parcelStatLabel: { fontSize: '11px', color: '#64748b' },
  shapeBtn: { padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', transition: '0.2s' }
}

const formStyles = {
  wrapper: { padding: '24px' },
  progressOuter: { height: '6px', background: '#f1f5f9', borderRadius: '3px', marginBottom: '8px' },
  progressInner: { height: '6px', background: '#3b82f6', borderRadius: '3px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' },
  stepLabel: { fontSize: '12px', fontWeight: '700', color: '#94a3b8', textAlign: 'right', marginBottom: '20px' },
  question: { fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: '#0f172a', lineHeight: '1.3' },
  subQuestion: { fontSize: '14px', fontWeight: '700', margin: '20px 0 12px', color: '#334155' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px' },
  optionBtn: { padding: '14px 12px', border: '1.5px solid #f1f5f9', borderRadius: '14px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  optionBtnActive: { borderColor: '#3b82f6', background: '#eff6ff', color: '#1e40af', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)', borderWidth: '2px' },
  textarea: { width: '100%', padding: '14px', border: '1.5px solid #f1f5f9', borderRadius: '12px', marginTop: '15px', boxSizing: 'border-box', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  urgencyRow: { display: 'flex', justifyContent: 'center', gap: '15px', margin: '30px 0' },
  urgencyBtn: { fontSize: '32px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.2, transition: 'all 0.2s' },
  urgencyBtnActive: { opacity: 1, transform: 'scale(1.2)' },
  urgencyLabel: { textAlign: 'center', fontWeight: '800', color: '#0f172a', fontSize: '16px' },
  navRow: { display: 'flex', gap: '12px', marginTop: '30px' },
  backBtn: { flex: 1, padding: '14px', border: 'none', background: '#f1f5f9', color: '#475569', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' },
  nextBtn: { flex: 2, padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' },
  submitBtn: { flex: 2, padding: '14px', background: '#059669', color: '#fff', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' },
  error: { color: '#ef4444', fontSize: '13px', marginTop: '15px', textAlign: 'center', fontWeight: '600' },
  hint: { fontSize: '12px', color: '#94a3b8', fontWeight: '500' },
  addressBox: { background: '#f8fafc', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', border: '1px solid #e2e8f0' },
  addressIcon: { fontSize: '18px' },
  addressText: { fontSize: '13px', color: '#475569', fontWeight: '500', lineHeight: '1.4' },
  uploadArea: { border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '20px', textAlign: 'center', cursor: 'pointer', marginTop: '15px', transition: 'all 0.2s', background: '#f8fafc' },
  uploadIcon: { fontSize: '24px', display: 'block', marginBottom: '8px' },
  uploadText: { fontSize: '12px', fontWeight: '700', color: '#64748b' },
  imagePreview: { width: '100%', height: '120px', objectFit: 'cover', borderRadius: '10px', marginTop: '10px' },
}

// Custom styles removed since they were for the old navbarObject.assign(styles, customStyles);

const MOCK_PARCELS = [
  {
    id: 1, name: 'Parcelle A - Zone Gueliz', city: 'marrakesh', region: 'gueliz',
    status: 'urgent', deadline: '5 jours restants', votes: 23,
    positions: [[31.6295,-8.0083],[31.6315,-8.0083],[31.6315,-8.0063],[31.6295,-8.0063]],
  },
  {
    id: 2, name: 'Parcelle B - Zone Hivernage', city: 'marrakesh', region: 'hivernage',
    status: 'active', deadline: '18 jours restants', votes: 45,
    positions: [[31.6250,-8.0120],[31.6270,-8.0120],[31.6270,-8.0100],[31.6250,-8.0100]],
  },
  {
    id: 3, name: 'Zone Sidi Maarouf', city: 'casablanca', region: 'sidi maarouf',
    status: 'planning', deadline: 'Projet futur', votes: 8,
    positions: [[33.5350,-7.6350],[33.5370,-7.6350],[33.5370,-7.6330],[33.5350,-7.6330]],
  },
  {
    id: 4, name: 'Zone Agdal', city: 'rabat', region: 'agdal',
    status: 'urgent', deadline: '2 jours restants', votes: 112,
    positions: [[34.0050,-6.8500],[34.0070,-6.8500],[34.0070,-6.8480],[34.0050,-6.8480]],
  },
]

const STATUS_COLORS = {
  urgent: { color: '#dc2626', fill: '#ef4444', label: 'Urgent' },
  active: { color: '#d97706', fill: '#f59e0b', label: 'Actif' },
  planning: { color: '#16a34a', fill: '#22c55e', label: 'Planifié' },
  pending: { color: '#ca8a04', fill: '#facc15', label: 'En attente' },
  rejected: { color: '#64748b', fill: '#94a3b8', label: 'Rejeté' },
}

const CATEGORY_COLORS = {
  park: '#22c55e',
  school: '#3b82f6',
  residential: '#eab308',
  commercial: '#ec4899',
  hospital: '#ef4444',
  sports: '#f97316',
  mosque: '#6366f1',
  other: '#94a3b8'
}

const BUILDING_TYPES = [
  { value: 'park', label: '🌳 Parc' },
  { value: 'school', label: '🏫 École' },
  { value: 'residential', label: '🏘️ Résidentiel' },
  { value: 'commercial', label: '🏪 Commercial' },
  { value: 'hospital', label: '🏥 Hôpital' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'mosque', label: '🕌 Mosquée' },
  { value: 'other', label: '🔧 Autre' },
]

const REASONS = {
  park: ['Manque d\'espaces verts', 'Besoin pour les enfants', 'Pollution élevée', 'Pas de loisirs'],
  school: ['École trop loin', 'Manque de places', 'Population en croissance', 'Besoin urgent'],
  residential: ['Manque de logements', 'Loyers trop chers', 'Croissance démographique', 'Moderniser le quartier'],
  commercial: ['Manque de commerces', 'Chômage local', 'Zone mal desservie', 'Dynamiser le quartier'],
  hospital: ['Hôpital trop loin', 'Manque de médecins', 'Urgences saturées', 'Population vieillissante'],
  sports: ['Pas d\'infrastructure', 'Besoin pour la jeunesse', 'Promouvoir le sport', 'Manque d\'activités'],
  mosque: ['Mosquée trop loin', 'Population en croissance', 'Besoin spirituel', 'Zone sans mosquée'],
  other: ['Autre raison', 'Besoin spécifique', 'Projet communautaire', 'Initiative locale'],
}

const PROBLEMS = [
  { value: 'dumping', label: '🚮 Déchets illégaux' },
  { value: 'lighting', label: '💡 Pas d\'éclairage' },
  { value: 'abandoned', label: '🏚️ Bâtiment abandonné' },
  { value: 'flooding', label: '🌊 Risque inondation' },
  { value: 'traffic', label: '🚗 Problème circulation' },
  { value: 'crime', label: '⚠️ Insécurité' },
  { value: 'noise', label: '🔊 Nuisances sonores' },
  { value: 'none', label: '✅ Aucun problème' },
]

const PROFILES = [
  { value: 'family', label: '👨‍👩‍👧 Famille' },
  { value: 'single', label: '👤 Célibataire' },
  { value: 'student', label: '🎓 Étudiant' },
  { value: 'elderly', label: '👴 Retraité' },
  { value: 'business', label: '💼 Commerçant' },
]

const RESIDENCE_DURATION = [
  { value: 'less1', label: '< 1 an' },
  { value: '1to5', label: '1 - 5 ans' },
  { value: '5to10', label: '5 - 10 ans' },
  { value: 'more10', label: '+ 10 ans' },
]

function MapAutoZoom({ city }) {
  const map = useMap()
  useEffect(() => {
    const cityData = CITY_CENTERS[city]
    if (cityData) {
      map.setView(cityData.center, cityData.zoom, { animate: true })
    } else if (city) {
      // Smart Fallback: Search for the city coordinates if not hardcoded
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}, Maroc`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 13, { animate: true })
            }
        })
    }
  }, [city, map])

  useEffect(() => {
    const handleFlyTo = (e) => {
        map.flyTo(e.detail, 16)
    }
    window.addEventListener('fly-to', handleFlyTo)
    return () => window.removeEventListener('fly-to', handleFlyTo)
  }, [map])

  return null
}

function HeatmapLayer({ points }) {
  const map = useMap()

  useEffect(() => {
    if (!window.L.heatLayer || !points.length) return

    const heatPoints = points.map(p => {
        const pos = p.positions[0]
        return [pos[0], pos[1], 1.0]
    })

    const layer = window.L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
    }).addTo(map)

    return () => { map.removeLayer(layer) }
  }, [map, points])

  return null
}

function ZoneHeatmapLayer({ zones }) {
  const map = useMap()

  useEffect(() => {
    if (!window.L.heatLayer || !zones.length) return

    const points = []
    zones.forEach(z => {
      // Add multiple points per zone to create a visible "heat" area
      points.push([z.centre.lat, z.centre.lng, 1.0])
      const offset = 0.003
      points.push([z.centre.lat + offset, z.centre.lng, 0.6])
      points.push([z.centre.lat - offset, z.centre.lng, 0.6])
      points.push([z.centre.lat, z.centre.lng + offset, 0.6])
      points.push([z.centre.lat, z.centre.lng - offset, 0.6])
    })

    const layer = window.L.heatLayer(points, {
      radius: 40,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: '#3b82f6', 0.7: '#60a5fa', 1: '#93c5fd' }
    }).addTo(map)

    return () => { map.removeLayer(layer) }
  }, [map, zones])

  return null
}

function InteractionManager({ mode, onShapeCreated, setMode, isActive, userRole }) {
  const map = useMapEvents({
    click(e) {
      if (mode === 'marker' && isActive) {
        if (userRole === 'citoyen') {
            alert("Veuillez cliquer sur une zone officielle (polygone coloré) pour soumettre votre avis.")
            return
        }
        onShapeCreated('marker', [e.latlng.lat, e.latlng.lng])
      }
    }
  })

  useEffect(() => {
    let drawer;
    if (isActive && mode === 'polygon') {
        drawer = new L.Draw.Polygon(map, { 
            shapeOptions: { color: '#2563eb', weight: 4, fillOpacity: 0.2 },
            showArea: false,
            allowIntersection: false,
            drawError: { color: '#ef4444', message: 'Intersection interdite' }
        })
        drawer.enable()
    }
    return () => { if (drawer) drawer.disable() }
  }, [mode, map, isActive])

  useEffect(() => {
    const handleCreated = (e) => {
      if (e.layerType === 'polygon') {
         const layer = e.layer
         const latLngs = layer.getLatLngs()
         const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs
         const data = ring.map(ll => [ll.lat, ll.lng])
         onShapeCreated('polygon', data)
         setMode('marker')
      }
    }
    map.on('draw:created', handleCreated)
    return () => map.off('draw:created', handleCreated)
  }, [map, onShapeCreated, setMode])

  return null
}

function FeedbackForm({ parcel, onSubmit, onClose }) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const totalSteps = 5
  const [address, setAddress] = useState('Chargement de l\'adresse...')
  const [form, setForm] = useState({
    building_type: '',
    reasons: [],
    urgency: 0,
    problems: [],
    profile: '',
    residence_duration: '',
    would_use: null,
    opinion: '',
    photo: null,
    name: '',
    email: '',
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    residence_duration: false
  });
  const [opinionCharCount, setOpinionCharCount] = useState(0);
  const [error, setError] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  useEffect(() => {
    if (parcel && parcel.positions.length > 0) {
      const [lat, lng] = parcel.positions[0]
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
            const addr = data.display_name || 'Adresse inconnue'
            setAddress(addr.split(',').slice(0, 3).join(','))
        })
        .catch(() => setAddress('Localisation sur la carte'))
    }
  }, [parcel])

  const toggle = (field, value) => {
    const current = form[field]
    if (current.includes(value)) {
      setForm({ ...form, [field]: current.filter(v => v !== value) })
    } else {
      setForm({ ...form, [field]: [...current, value] })
    }
  }

  const validationStyles = {
    errorInput: { border: '2px solid #DC2626', backgroundColor: '#FEE2E2' },
    validInput: { border: '2px solid #10B981', backgroundColor: '#DCFCE7' },
    errorText: { color: '#DC2626', fontSize: '12px', marginTop: '4px' },
    charCounter: { fontSize: '12px', color: '#6B7280', marginTop: '4px' }
  };

  const handleOpinionChange = (e) => {
    const text = e.target.value;
    if (text.length <= 500) {
      setForm({ ...form, opinion: text });
      setOpinionCharCount(text.length);
    }
  };

  const canNext = () => {
    if (step === 1) return form.building_type !== '';
    if (step === 2) return true; // opinion is optional, problems length is in step 4
    if (step === 3) return form.urgency > 0;
    if (step === 4) return form.problems.length > 0;
    if (step === 5) {
      return form.profile !== '' && 
             validateRequired(form.residence_duration).valid && 
             validateRequired(form.name).valid && form.name.length >= 2 &&
             validateEmail(form.email).valid;
    }
    return true;
  }

  const handleNext = () => {
    if (step === 1 && form.building_type === '') {
      setError('Please select a category');
      return;
    }
    if (step === 2 && form.opinion && !validateTextLength(form.opinion, 0, 500).valid) {
      setError('Opinion exceeds 500 characters');
      return;
    }
    if (step === 3 && form.urgency === 0) {
      setError('Please select an urgency level');
      return;
    }
    if (step === 4 && form.problems.length === 0) {
      setError('Select at least one problem');
      return;
    }
    setError('');
    setStep(step + 1);
  }

  const handleSubmit = async () => {
    if (step === 5) {
      setTouched({ name: true, email: true, residence_duration: true });
      if (!canNext()) {
        setError('Veuillez compléter toutes les informations requises.');
        return;
      }
    }

    const opinionText = form.opinion?.trim() || null
    let finalOpinion = null
    let opinionAiValidated = false

    if (opinionText) {
      setIsAiLoading(true)
      try {
        // 8-second timeout race
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ relevant: true, reason: 'timeout', cleaned_text: opinionText }), 8000)
        )
        const result = await Promise.race([analyzeOpinion(opinionText), timeoutPromise])

        if (result.relevant === true) {
          finalOpinion = result.cleaned_text || opinionText
          opinionAiValidated = true
        } else {
          finalOpinion = null
          opinionAiValidated = false
        }
      } catch (err) {
        // Fallback: never block the submission
        console.error('AI analysis error:', err)
        finalOpinion = opinionText
        opinionAiValidated = true
      } finally {
        setIsAiLoading(false)
      }
    }

    onSubmit({
      ...form,
      opinion: finalOpinion,
      opinion_ai_validated: opinionAiValidated,
      opinion_ai_summary: null
    })
  }

  const progress = ((step - 1) / (totalSteps - 1)) * 100

  return (
    <div style={formStyles.wrapper}>
      <div style={formStyles.addressBox}>
        <span style={formStyles.addressIcon} aria-hidden="true">📍</span>
        <span style={formStyles.addressText}>{address}</span>
      </div>
      
      <div
        style={formStyles.progressOuter}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Étape ${step} sur ${totalSteps}`}
      >
        <div style={{ ...formStyles.progressInner, width: `${progress}%` }} />
      </div>
      <p style={formStyles.stepLabel} aria-live="polite" aria-atomic="true">Étape {step}/{totalSteps}</p>

      {step === 1 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={formStyles.question}><span aria-hidden="true">🏢</span> Que devrait-on construire ici? <span aria-hidden="true">*</span></legend>
          <div style={formStyles.grid2}>
            {BUILDING_TYPES.map(type => (
              <button key={type.value} type="button"
                aria-pressed={form.building_type === type.value}
                style={{ ...formStyles.optionBtn, ...(form.building_type === type.value ? formStyles.optionBtnActive : {}) }}
                onClick={() => { setForm({ ...form, building_type: type.value, reasons: [] }); setError('') }}>
                {type.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <div>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={formStyles.question}><span aria-hidden="true">💬</span> Pourquoi ce besoin? <span style={formStyles.hint}>(plusieurs choix)</span></legend>
            <div style={formStyles.grid1}>
              {(REASONS[form.building_type] || []).map(reason => (
                <button key={reason} type="button"
                  aria-pressed={form.reasons.includes(reason)}
                  style={{ ...formStyles.optionBtn, ...(form.reasons.includes(reason) ? formStyles.optionBtnActive : {}) }}
                  onClick={() => { toggle('reasons', reason); setError('') }}>
                  {form.reasons.includes(reason) ? '✓ ' : ''}{reason}
                </button>
              ))}
            </div>
          </fieldset>
          <label htmlFor="opinion-details" style={{ ...formStyles.hint, display: 'block', marginTop: '16px' }}>Détails supplémentaires (optionnel)</label>
          <textarea id="opinion-details" style={formStyles.textarea}
            placeholder="Détails supplémentaires..."
            value={form.opinion}
            onChange={handleOpinionChange}
            rows={2}
            aria-describedby="opinion-char-count"
          />
          <div id="opinion-char-count" style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280', marginTop: '4px' }} aria-live="polite" aria-atomic="true">
            {opinionCharCount}/500
          </div>
          
          <div style={formStyles.uploadArea} onClick={() => document.getElementById('photo-input').click()}>
            <input 
              id="photo-input"
              type="file" 
              accept="image/*" 
              hidden 
              onChange={e => {
                const file = e.target.files[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onloadend = () => setForm({ ...form, photo: reader.result })
                  reader.readAsDataURL(file)
                }
              }}
            />
            {form.photo ? (
              <img src={form.photo} style={formStyles.imagePreview} alt="Preview" />
            ) : (
              <>
                <span style={formStyles.uploadIcon}>📸</span>
                <span style={formStyles.uploadText}>Ajouter une photo (optionnel)</span>
              </>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={formStyles.question}><span aria-hidden="true">⚡</span> Quel est le niveau d'urgence? <span aria-hidden="true">*</span></p>
          <div style={formStyles.urgencyRow} role="radiogroup" aria-label="Niveau d'urgence de 1 à 5" aria-required="true">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                role="radio"
                aria-checked={form.urgency === n}
                aria-label={`Urgence niveau ${n}`}
                style={{ ...formStyles.urgencyBtn, ...(form.urgency >= n ? formStyles.urgencyBtnActive : {}) }}
                onClick={() => { setForm({ ...form, urgency: n }); setError('') }}>
                <span aria-hidden="true">⭐</span>
              </button>
            ))}
          </div>
          <p style={formStyles.urgencyLabel}>
            {form.urgency === 1 && 'Pas urgent'}
            {form.urgency === 2 && 'Peu urgent'}
            {form.urgency === 3 && 'Modérément urgent'}
            {form.urgency === 4 && 'Urgent'}
            {form.urgency === 5 && '🚨 Très urgent!'}
          </p>
        </div>
      )}

      {step === 4 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={formStyles.question}><span aria-hidden="true">🚨</span> Problèmes actuels? <span style={formStyles.hint}>(plusieurs)</span> <span aria-hidden="true">*</span></legend>
          <div style={formStyles.grid2}>
            {PROBLEMS.map(problem => (
              <button key={problem.value} type="button"
                aria-pressed={form.problems.includes(problem.value)}
                style={{ ...formStyles.optionBtn, ...(form.problems.includes(problem.value) ? formStyles.optionBtnActive : {}) }}
                onClick={() => { toggle('problems', problem.value); setError('') }}>
                {problem.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 5 && (
        <div>
          <p style={formStyles.question}><span aria-hidden="true">👤</span> Votre profil</p>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="citizen-name" style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Nom complet <span aria-hidden="true">*</span></label>
            <input
              id="citizen-name"
              type="text"
              value={form.name}
              onChange={e => { setForm({...form, name: e.target.value}); setError('') }}
              onBlur={() => setTouched({...touched, name: true})}
              style={{ ...formStyles.textarea, marginTop: '4px', padding: '10px', ...(touched.name ? (!validateRequired(form.name).valid || form.name.length < 2 ? validationStyles.errorInput : validationStyles.validInput) : {}) }}
              placeholder="Votre nom"
              required
              aria-required="true"
              aria-invalid={touched.name && (!validateRequired(form.name).valid || form.name.length < 2)}
              aria-describedby={touched.name && (!validateRequired(form.name).valid || form.name.length < 2) ? 'citizen-name-error' : undefined}
            />
            {touched.name && (!validateRequired(form.name).valid || form.name.length < 2) && <div id="citizen-name-error" role="alert" style={validationStyles.errorText}>Le nom est requis (min 2 caractères)</div>}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="citizen-email" style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Email <span aria-hidden="true">*</span></label>
            <input
              id="citizen-email"
              type="email"
              value={form.email}
              onChange={e => { setForm({...form, email: e.target.value}); setError('') }}
              onBlur={() => setTouched({...touched, email: true})}
              style={{ ...formStyles.textarea, marginTop: '4px', padding: '10px', ...(touched.email ? (!validateEmail(form.email).valid ? validationStyles.errorInput : validationStyles.validInput) : {}) }}
              placeholder="votre@email.com"
              required
              aria-required="true"
              aria-invalid={touched.email && !validateEmail(form.email).valid}
              aria-describedby={touched.email && !validateEmail(form.email).valid ? 'citizen-email-error' : undefined}
            />
            {touched.email && !validateEmail(form.email).valid && <div id="citizen-email-error" role="alert" style={validationStyles.errorText}>Adresse email invalide</div>}
          </div>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={formStyles.subQuestion}>Type de profil <span aria-hidden="true">*</span></legend>
            <div style={formStyles.grid2}>
              {PROFILES.map(p => (
                <button key={p.value} type="button"
                  aria-pressed={form.profile === p.value}
                  style={{ ...formStyles.optionBtn, ...(form.profile === p.value ? formStyles.optionBtnActive : {}) }}
                  onClick={() => { setForm({ ...form, profile: p.value }); setError('') }}>
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={formStyles.subQuestion}>Depuis combien de temps? <span aria-hidden="true">*</span></legend>
            <div style={formStyles.grid2}>
              {RESIDENCE_DURATION.map(d => (
                <button key={d.value} type="button"
                  aria-pressed={form.residence_duration === d.value}
                  style={{ ...formStyles.optionBtn, ...(form.residence_duration === d.value ? formStyles.optionBtnActive : {}) }}
                  onClick={() => { setForm({ ...form, residence_duration: d.value }); setError(''); setTouched({...touched, residence_duration: true}); }}>
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
          {touched.residence_duration && !validateRequired(form.residence_duration).valid && <div role="alert" style={{...validationStyles.errorText, textAlign: 'center'}}>Veuillez sélectionner la durée</div>}
        </div>
      )}

      {error && <p role="alert" style={formStyles.error}>{error}</p>}

      <div style={formStyles.navRow}>
        {step > 1 ? (
          <button type="button" style={formStyles.backBtn} onClick={() => setStep(step - 1)}>← Retour</button>
        ) : (
          parcel?.isNew && (
            <button type="button" style={{ ...formStyles.backBtn, color: '#ef4444' }} onClick={onClose}>
               Annuler
            </button>
          )
        )}
        {step < totalSteps ? (
          <button type="button" style={formStyles.nextBtn} onClick={handleNext}>Suivant →</button>
        ) : (
          <button
            type="button"
            style={{
              ...formStyles.submitBtn,
              opacity: (isAiLoading || !canNext()) ? 0.7 : 1,
              cursor: (isAiLoading || !canNext()) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSubmit}
            disabled={isAiLoading || !canNext()}
            aria-disabled={isAiLoading || !canNext()}
            aria-label={isAiLoading ? 'Analyse en cours, veuillez patienter' : 'Envoyer mon avis'}
          >
            {isAiLoading ? '⏳ Analyse en cours...' : '🚀 Envoyer mon avis'}
          </button>
        )}
      </div>
    </div>
  )
}

function ProfessionalView({ parcel, onClose }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [note, setNote] = useState(parcel.internal_note || '')

  const handleSaveNote = () => {
      parcel.internal_note = note
      alert('Note interne sauvegardée avec succès ! (Simulation)')
  }

  return (
    <div style={formStyles.wrapper}>
      <div style={{...formStyles.addressBox, background: '#f1f5f9'}}>
        <span style={formStyles.addressIcon}>📊</span>
        <span style={{...formStyles.addressText, color: '#0f172a'}}>Fiche Technique Urbanistique</span>
      </div>
      
      <div style={{marginTop: '20px'}}>
        <p style={formStyles.question}>🏢 Détails de la zone</p>
        <div style={styles.parcelStats}>
            <div style={styles.parcelStat}><span style={styles.parcelStatNum}>{parcel.votes || 0}</span><span style={styles.parcelStatLabel}>Avis Citoyens</span></div>
            <div style={styles.parcelStat}><span style={styles.parcelStatNum}>{parcel.urgency || 3}/5</span><span style={styles.parcelStatLabel}>Urgence Moy.</span></div>
        </div>
        
        <p style={{...formStyles.subQuestion, marginTop: '20px'}}>Type d'équipement suggéré :</p>
        <div style={{padding: '12px', background: '#f8fafc', borderRadius: '12px', fontWeight: '700', color: '#1e40af', marginBottom: '20px'}}>
            {BUILDING_TYPES.find(b => b.value === parcel.building_type)?.label || 'Non spécifié'}
        </div>

        {parcel.photo && (
            <div style={{ marginBottom: '20px' }}>
                <p style={formStyles.subQuestion}>📸 Photo du terrain :</p>
                <img src={parcel.photo} style={formStyles.imagePreview} alt="Terrain" />
            </div>
        )}

        {user?.role === 'urbaniste' && (
            <div style={{ marginBottom: '20px', padding: '15px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px' }}>
                <p style={{...formStyles.subQuestion, color: '#991b1b', marginTop: 0}}>📝 Notes Internes (Privé) :</p>
                <textarea 
                    style={{...formStyles.textarea, borderColor: '#fecaca'}} 
                    rows={3} 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Annotez cette zone pour l'équipe..." 
                />
                <button onClick={handleSaveNote} style={{...formStyles.nextBtn, background: '#dc2626', marginTop: '10px', width: '100%'}}>
                    💾 Sauvegarder la note
                </button>
            </div>
        )}

        <button 
            style={{...formStyles.submitBtn, background: '#0f172a'}} 
            onClick={() => {
              if (user?.role === 'admin') navigate('/admin/dashboard')
              else if (user?.role === 'urbaniste') navigate('/urbaniste/dashboard')
              else if (user?.role === 'super_admin') navigate('/super-admin/users')
              else alert("Vous n'avez pas accès au tableau de bord.")
            }}
        >
            🔗 Ouvrir dans le Tableau de Bord
        </button>
        <button style={formStyles.backBtn} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

export default function MapPage() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const userCity = user?.city || 'marrakesh'
  const [drawMode, setDrawMode] = useState('marker') // 'marker' | 'polygon'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [parcels, setParcels] = useState([])
  const [zones, setZones] = useState([])

  const fetchData = async () => {
    try {
      const res = await api.getRemarks()
      setParcels(res.data)
      const resZones = await api.getZones(userCity)
      setZones(resZones.data)
    } catch (err) {
      console.error('Erreur chargement données', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userCity])
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [votedParcels, setVotedParcels] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.length > 2) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}, Maroc`)
      const data = await res.json()
      if (data.length > 0) {
        const { lat, lon } = data[0]
        window.dispatchEvent(new CustomEvent('fly-to', { detail: [parseFloat(lat), parseFloat(lon)] }))
      }
    }
  }

  const filteredParcels = parcels.filter(p => {
    const matchCity = p.city === userCity
    const matchStatus = filterStatus === 'all' ? true : p.status === filterStatus
    const matchCategory = filterCategory === 'all' ? true : p.building_type === filterCategory
    
    // Étape 2 — Filtre selon le rôle
    if (user?.role === 'citoyen') {
        // Citoyen : Validées + Ses propres remarques
        const isValidated = ['active', 'planning', 'urgent'].includes(p.status)
        const isMine = p.user_email === user.email
        return matchCity && matchCategory && (isValidated || isMine)
    } else if (user?.role === 'urbaniste') {
        // Urbaniste : Seulement Validées
        const isValidated = ['active', 'planning', 'urgent'].includes(p.status)
        return matchCity && matchStatus && matchCategory && isValidated
    }
    // Admin voit tout
    return matchCity && matchStatus && matchCategory
  })

  const handleParcelClick = (parcel) => {
    setSelectedParcel(parcel)
    setSubmitted(false)
  }

  const handleShapeCreated = (type, data, extraData = {}) => {
    const newParcel = {
        id: Date.now(),
        name: extraData.zone_nom || 'Nouveau signalement',
        status: 'pending',
        deadline: 'À l\'instant',
        votes: 0,
        shapeType: type,
        isNew: true,
        zone_id: extraData.zone_id || null,
        zone_nom: extraData.zone_nom || null
    }
    
    if (type === 'marker') {
        newParcel.positions = [data]
        newParcel.latitude = data[0]
        newParcel.longitude = data[1]
    } else {
        newParcel.positions = data
    }

    setSelectedParcel(newParcel)
    setSubmitted(false)
  }

  const handleFormSubmit = async (formData) => {
    try {
      const finalParcel = { 
          ...selectedParcel, 
          isNew: false, 
          ...formData,
          status: 'pending', // Étape 1 — Automatiquement en attente
          user_email: user?.email,
          userName: user?.name,
          votes: 1
      }
      await api.addRemark(finalParcel)
      fetchData()
      setSubmitted(true)
      toast.success('Remarque soumise avec succès')
      if (formData.opinion_ai_validated) {
        toast.info("Avis analysé par l'IA")
      }
    } catch (err) {
      toast.error('Erreur lors de la soumission')
    }
  }

  const handleClosePanel = () => {
    setSelectedParcel(null)
  }

  return (
    <div style={styles.wrapper}>
      {['admin', 'urbaniste'].includes(user?.role) && !isMobile && !selectedParcel && (
        <div style={{ position: 'absolute', top: '180px', left: '10px', zIndex: 1000 }}>
            <button 
              style={{
                  padding: '12px 20px', 
                  background: drawMode === 'polygon' ? '#ef4444' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  color: drawMode === 'polygon' ? 'white' : '#0f172a',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '16px',
                  fontWeight: '900',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.3s ease',
                  fontSize: '13px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
              }}
              onClick={() => setDrawMode(drawMode === 'polygon' ? 'marker' : 'polygon')}
            >
                {drawMode === 'polygon' ? '🛑 Annuler le dessin' : '📐 Dessiner une Zone'}
            </button>
        </div>
      )}

      {drawMode === 'polygon' && (
          <div style={{
              position: 'absolute', 
              bottom: '40px', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              zIndex: 1000,
              background: 'rgba(15, 23, 42, 0.9)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '30px',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
          }}>
              <span style={{fontSize: '20px'}}>✍️</span>
              <span>Cliquez pour ajouter des points. Cliquez sur le 1er point pour fermer la zone.</span>
          </div>
      )}
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        buildingTypes={BUILDING_TYPES}
      />


      <MapContainer
        center={CITY_CENTERS[userCity]?.center || [31.6295, -8.0083]}
        zoom={CITY_CENTERS[userCity]?.zoom || 14}
        minZoom={6}
        maxBounds={MOROCCO_BOUNDS}
        maxBoundsViscosity={1.0}
        style={styles.map}>
        <LayersControl position="bottomleft">
          <LayersControl.BaseLayer checked name="Plan">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer 
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community" 
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="🔥 Heatmap (Remarques)">
            <HeatmapLayer points={parcels} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="🛰️ Heatmap (Zones)">
            <ZoneHeatmapLayer zones={zones} />
          </LayersControl.Overlay>
        </LayersControl>
        
        <MapAutoZoom city={userCity} />
        
        {zones.map(z => (
            <Polygon 
                key={`zone-${z.id}`}
                positions={z.coordonnees_geojson}
                pathOptions={{
                    color: z.couleur || '#3b82f6',
                    fillColor: z.couleur || '#3b82f6',
                    fillOpacity: 0.2,
                    weight: 2
                }}
                eventHandlers={{
                    click: (e) => {
                        if (user?.role === 'citoyen') {
                            window.L.DomEvent.stopPropagation(e);
                            handleShapeCreated('marker', [e.latlng.lat, e.latlng.lng], { zone_id: z.id, zone_nom: z.nom });
                        }
                    }
                }}
            >
              <Popup>
                 <b>{z.nom}</b><br/>
                 {user?.role === 'citoyen' ? <span style={{fontSize:'12px'}}>Cliquez ici pour soumettre un avis</span> : <span style={{fontSize:'12px'}}>Zone officielle</span>}
              </Popup>
            </Polygon>
        ))}

        <InteractionManager 
            mode={drawMode}
            onShapeCreated={handleShapeCreated}
            setMode={setDrawMode}
            isActive={!selectedParcel}
            userRole={user?.role}
        />
        
        {filteredParcels.map(parcel => {
          const statusCfg = STATUS_COLORS[parcel.status] || STATUS_COLORS.pending
          const categoryColor = CATEGORY_COLORS[parcel.building_type] || '#94a3b8'
          const hasVoted = votedParcels.includes(parcel.id)
          
          // Couleur : Citoyen voit catégorie, Pro voit statut
          const markerColor = user?.role === 'citoyen' ? categoryColor : statusCfg.fill
          
          return (
            <Polygon key={parcel.id} positions={parcel.positions}
              pathOptions={{
                color: hasVoted ? '#9ca3af' : markerColor,
                fillColor: hasVoted ? '#d1d5db' : markerColor,
                fillOpacity: 0.45, weight: 2,
              }}
              eventHandlers={{ click: () => handleParcelClick(parcel) }} />
          )
        })}

        {selectedParcel?.isNew && (
            selectedParcel.shapeType === 'circle' ? (
                <Circle center={selectedParcel.positions[0]} radius={selectedParcel.radius} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.5 }} />
            ) : selectedParcel.positions.length > 1 ? (
                <Polygon positions={selectedParcel.positions} pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.5 }} />
            ) : (
                <Marker position={selectedParcel.positions[0]} />
            )
        )}
      </MapContainer>

      <Legend role={user?.role} />

      {selectedParcel && (
        <div
          style={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label={selectedParcel.isNew ? 'Nouveau signalement' : `Détails : ${selectedParcel.name}`}
        >
          <div style={{...styles.panelHeader, borderLeft: `5px solid ${STATUS_COLORS[selectedParcel.status]?.fill || '#3b82f6'}`}}>
            <p style={styles.panelTitle}><span aria-hidden="true">📍</span> {selectedParcel.isNew ? 'Nouveau signalement' : selectedParcel.name}</p>
            <p style={styles.panelMeta}>{selectedParcel.isNew ? 'Zone dessinée par vous' : `${selectedParcel.deadline} · ${selectedParcel.votes} avis`}</p>
            {selectedParcel.admin_comment && (
              <div style={styles.adminCommentBox}>
                <p style={styles.adminCommentLabel}><span aria-hidden="true">💬</span> Retour de l'administration :</p>
                <p style={styles.adminCommentText}>{selectedParcel.admin_comment}</p>
              </div>
            )}
          </div>

          {votedParcels.includes(selectedParcel.id) || submitted ? (
            <div style={styles.successBox} role="status" aria-live="polite">
              <p style={{ fontSize: '40px', margin: 0 }} aria-hidden="true">✅</p>
              <p style={styles.bigText}>Avis enregistré !</p>
              <p style={styles.smallText}>Merci pour votre contribution à l'urbanisme de votre ville.</p>
              <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
                <span aria-hidden="true">✉️</span> Un email de confirmation vous a été envoyé.
              </div>
              <button style={styles.closeBtn2} onClick={handleClosePanel} aria-label="Fermer le panneau">✕ Fermer</button>
            </div>
          ) : (
            user?.role === 'admin' ? (
                <ProfessionalView parcel={selectedParcel} onClose={handleClosePanel} />
            ) : (
                <FeedbackForm
                    parcel={selectedParcel}
                    onSubmit={handleFormSubmit}
                    onClose={handleClosePanel}
                />
            )
          )}
        </div>
      )}
    </div>
  )
}

function Legend({ role }) {
  return (
    <div style={styles.legend}>
      {role === 'citoyen' ? (
        <>
          <p style={styles.legendTitle}>Types de Projets</p>
          {BUILDING_TYPES.map(type => (
            <div key={type.value} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: CATEGORY_COLORS[type.value] }} />
              <span style={styles.legendText}>{type.label.split(' ')[1]}</span>
            </div>
          ))}
        </>
      ) : (
        <>
          <p style={styles.legendTitle}>États Projets</p>
          {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
            <div key={key} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: cfg.fill }} />
              <span style={styles.legendText}>{cfg.label}</span>
            </div>
          ))}
          <p style={{ ...styles.legendTitle, marginTop: '15px' }}>Catégories</p>
          {BUILDING_TYPES.slice(0, 5).map(type => (
            <div key={type.value} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: CATEGORY_COLORS[type.value], borderRadius: '2px' }} />
              <span style={styles.legendText}>{type.label.split(' ')[1]}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
