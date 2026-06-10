/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeOpinion } from '../services/aiService'
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, LayersControl, useMapEvents, Circle, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../services/api.js'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { validateRequired, validateTextLength, validateEmail } from '../services/validationService.js'
import { useToast } from '../hooks/useToast.js'
import { getCityMapConfig } from '../utils/cityBounds'
import { getZones } from '../services/adminApi'
import { unwrap } from '../utils/unwrap'
import * as turf from '@turf/turf'

// Fix Leaflet Default Icon issue in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Local city center fallback (kept for heatmap/zone lookups)
const CITY_CENTERS = {
  casablanca: { center: [33.5731, -7.5898], zoom: 13 },
  rabat: { center: [34.0209, -6.8416], zoom: 13 },
  fes: { center: [34.0181, -5.0078], zoom: 13 },
  marrakesh: { center: [31.6295, -8.0083], zoom: 14 },
  marrakech: { center: [31.6295, -8.0083], zoom: 14 },
  agadir: { center: [30.4278, -9.5981], zoom: 13 },
  tanger: { center: [35.7595, -5.8340], zoom: 13 },
  meknes: { center: [33.8935, -5.5473], zoom: 13 },
}

// Forces the map to fly to city center on mount and enforces bounds
function MapController({ center, zoom, bounds, minZoom, selectedParcel }) {
  const map = useMap();
  useEffect(() => {
    if (minZoom) map.setMinZoom(minZoom);
    if (bounds) map.setMaxBounds(bounds);
    if (center && zoom) {
      map.setView(center, zoom, { animate: false });
    }
  }, [map, center, zoom, bounds, minZoom]);

  useEffect(() => {
    if (selectedParcel) {
      map.closePopup();

      let pos = null;
      if (selectedParcel.positions && selectedParcel.positions.length > 0) {
        if (selectedParcel.positions.length > 1) {
          const bounds = L.latLngBounds(selectedParcel.positions);
          pos = bounds.getCenter();
        } else {
          pos = L.latLng(selectedParcel.positions[0]);
        }
      }

      if (pos) {
        const targetZoom = Math.max(map.getZoom(), 15);
        const isMobile = window.innerWidth <= 768;

        if (!isMobile) {
          // Project to screen pixels to offset the center by 180px to the right,
          // which centers the marker in the left visible area (avoiding side panel overlap).
          const point = map.project(pos, targetZoom);
          point.x += 180;
          const offsetLatLng = map.unproject(point, targetZoom);
          map.flyTo(offsetLatLng, targetZoom, { animate: true, duration: 1 });
        } else {
          map.flyTo(pos, targetZoom, { animate: true, duration: 1 });
        }
      }
    }
  }, [selectedParcel, map]);

  return null;
}

const styles = {
  wrapper: {
    position: 'relative', height: '100vh', width: '100%',
    background: '#060403',
    fontFamily: 'DM Sans, sans-serif',
    overflow: 'hidden',
  },
  map: {
    height: '100vh', width: '100%',
    zIndex: 1, paddingTop: '52px',
  },
  panel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: '360px',
    background: 'rgba(8,6,3,0.88)',
    borderLeft: '0.5px solid rgba(242,237,230,0.08)',
    zIndex: 1500, display: 'flex', flexDirection: 'column',
    transform: 'translateX(100%)',
    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
    backdropFilter: 'blur(18px)',
    boxShadow: '-4px 0 32px rgba(0,0,0,0.5), -0.5px 0 0 rgba(193,68,14,0.12)',
  },
  panelOpen: {
    transform: 'translateX(0)',
  },
  panelHeader: {
    padding: '16px 18px 12px',
    borderBottom: '0.5px solid rgba(242,237,230,0.06)',
    flexShrink: 0,
  },
  panelTitle: {
    fontFamily: 'Amiri, serif', fontSize: '20px',
    color: '#F2EDE6', fontWeight: 700, lineHeight: 1.2,
    margin: 0,
  },
  panelMeta: {
    fontSize: '11px', color: 'rgba(242,237,230,0.35)',
    marginTop: '6px',
  },
  legend: {
    position: 'absolute', bottom: '60px', left: '66px',
    zIndex: 100,
    background: 'rgba(8,6,3,0.88)',
    border: '0.5px solid rgba(242,237,230,0.08)',
    borderRadius: '10px', padding: '12px 14px',
    backdropFilter: 'blur(18px)', minWidth: '160px',
    boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
  },
  legendTitle: {
    fontSize: '10px', letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(242,237,230,0.22)', marginBottom: '10px',
  },
  legendItem: {
    display: 'flex', alignItems: 'center',
    gap: '8px', marginBottom: '7px',
  },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
  legendText: { fontSize: '11px', color: 'rgba(242,237,230,0.45)' },
  adminCommentBox: { marginTop: '12px', padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' },
  adminCommentLabel: { fontSize: '11px', fontWeight: '800', color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' },
  adminCommentText: { fontSize: '13px', color: '#78350f', fontStyle: 'italic' },
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
  wrapper: { padding: '0' },

  progressOuter: {
    display: 'flex', gap: '8px', marginBottom: '10px',
    justifyContent: 'center', alignItems: 'center',
  },

  stepLabel: {
    fontSize: '10px', color: 'rgba(242,237,230,0.22)',
    textAlign: 'right', marginBottom: '14px',
  },

  question: {
    fontSize: '14px', fontWeight: 500,
    color: '#F2EDE6', marginBottom: '12px', lineHeight: 1.5,
  },

  subQuestion: {
    fontSize: '12px', fontWeight: 500,
    color: 'rgba(242,237,230,0.5)',
    margin: '14px 0 8px',
  },

  grid2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
    marginBottom: '12px',
  },
  grid1: {
    display: 'grid', gridTemplateColumns: '1fr', gap: '6px',
  },

  optionBtn: {
    padding: '9px 10px',
    border: '0.5px solid rgba(242,237,230,0.09)',
    borderRadius: '6px', background: 'transparent',
    fontSize: '12px', color: 'rgba(242,237,230,0.55)',
    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  optionBtnActive: {
    borderColor: '#C1440E',
    background: 'rgba(193,68,14,0.12)',
    color: '#F2EDE6',
  },

  textarea: {
    width: '100%', padding: '9px 11px',
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(242,237,230,0.11)',
    borderRadius: '6px', color: '#F2EDE6',
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', resize: 'none',
    transition: 'border-color 0.2s', marginBottom: '4px',
    boxSizing: 'border-box',
  },

  urgencyRow: {
    display: 'flex', justifyContent: 'center',
    gap: '8px', margin: '10px 0 12px',
  },
  urgencyBtn: {
    fontSize: '26px', background: 'none', border: 'none',
    cursor: 'pointer', opacity: 0.18, transition: 'all 0.2s',
    color: '#E8B87A',
  },
  urgencyBtnActive: {
    opacity: 1, transform: 'scale(1.12)',
  },
  urgencyLabel: {
    textAlign: 'center', fontWeight: 500,
    color: 'rgba(242,237,230,0.45)',
    fontSize: '12px', marginBottom: '12px',
    fontStyle: 'italic', minHeight: '18px',
  },

  navRow: {
    display: 'flex', gap: '8px', marginTop: '20px',
  },
  backBtn: {
    padding: '9px 14px', borderRadius: '6px',
    background: 'transparent',
    border: '0.5px solid rgba(242,237,230,0.11)',
    color: 'rgba(242,237,230,0.38)',
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
  },
  nextBtn: {
    flex: 1, padding: '9px', borderRadius: '6px',
    background: '#C1440E', color: '#fff', border: 'none',
    fontSize: '13px', fontWeight: 500,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  submitBtn: {
    flex: 1, padding: '9px', borderRadius: '6px',
    background: '#C1440E', color: '#fff', border: 'none',
    fontSize: '13px', fontWeight: 500,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s',
  },

  error: {
    color: 'rgba(252,165,165,0.9)', fontSize: '12px',
    marginTop: '10px', textAlign: 'center', fontWeight: 500,
  },
  hint: {
    fontSize: '11px', color: 'rgba(242,237,230,0.28)',
    fontWeight: 300,
  },

  addressBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(193,68,14,0.07)',
    border: '0.5px solid rgba(193,68,14,0.2)',
    borderRadius: '6px', padding: '9px 12px',
    marginBottom: '14px',
  },
  addressIcon: { fontSize: '14px' },
  addressText: {
    fontSize: '11px', color: 'rgba(242,237,230,0.45)',
    lineHeight: 1.5,
  },

  uploadArea: {
    border: '0.5px dashed rgba(242,237,230,0.13)',
    borderRadius: '6px', padding: '16px',
    textAlign: 'center', cursor: 'pointer',
    marginTop: '10px', transition: 'all 0.2s',
  },
  uploadIcon: {
    fontSize: '18px', display: 'block', marginBottom: '4px',
  },
  uploadText: {
    fontSize: '11px', color: 'rgba(242,237,230,0.28)',
  },
  imagePreview: {
    width: '100%', height: '100px',
    objectFit: 'cover', borderRadius: '6px', marginTop: '8px',
  },
}

// Custom styles removed since they were for the old navbarObject.assign(styles, customStyles);

const STATUS_COLORS = {
  en_cours: { color: '#d97706', fill: '#f59e0b', label: 'En cours' },
  resolu: { color: '#16a34a', fill: '#22c55e', label: 'Résolu' },
  rejete: { color: '#64748b', fill: '#94a3b8', label: 'Rejeté' },
  en_attente: { color: '#ca8a04', fill: '#facc15', label: 'En attente' },
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
    const handleZoomIn = () => map.zoomIn()
    const handleZoomOut = () => map.zoomOut()
    window.addEventListener('fly-to', handleFlyTo)
    window.addEventListener('map-zoom-in', handleZoomIn)
    window.addEventListener('map-zoom-out', handleZoomOut)
    return () => {
      window.removeEventListener('fly-to', handleFlyTo)
      window.removeEventListener('map-zoom-in', handleZoomIn)
      window.removeEventListener('map-zoom-out', handleZoomOut)
    }
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

function InteractionManager({ mode, onShapeCreated, setMode, isActive, userRole, zones }) {
  const map = useMapEvents({
    click(e) {
      if (mode === 'marker' && isActive) {
        onShapeCreated('marker', [e.latlng.lat, e.latlng.lng])
      }
    }
  })
  const [overlapWarning, setOverlapWarning] = useState(false)
  const drawerRef = useRef(null)

  const checkOverlap = useCallback((coords) => {
    if (!coords || coords.length < 3) return false
    const newPoly = turf.polygon([coords.map(c => [c[1], c[0]])])
    return zones.some(z => {
      const c = z.coordonnees_geojson
      if (!c || c.length < 3) return false
      const existingPoly = turf.polygon([c.map(p => [p[1], p[0]])])
      return turf.booleanOverlap(newPoly, existingPoly) ||
             turf.booleanContains(existingPoly, newPoly) ||
             turf.booleanContains(newPoly, existingPoly)
    })
  }, [zones])

  useEffect(() => {
    if (!isActive || mode !== 'polygon') return
    const onVertex = (e) => {
      if (!drawerRef.current) return
      const markers = e.layers.getLayers().filter(l => l instanceof L.Marker)
      if (markers.length < 3) { setOverlapWarning(false); return }
      const coords = markers.map(m => [m.getLatLng().lat, m.getLatLng().lng])
      setOverlapWarning(checkOverlap(coords))
    }
    map.on('draw:drawvertex', onVertex)
    return () => map.off('draw:drawvertex', onVertex)
  }, [map, mode, isActive, checkOverlap])

  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.disable()
      drawerRef.current = null
    }
    if (isActive && mode === 'polygon') {
      const drawer = new L.Draw.Polygon(map, {
        shapeOptions: { color: overlapWarning ? '#ef4444' : '#2563eb', weight: 4, fillOpacity: 0.2 },
        showArea: false,
        allowIntersection: false,
        drawError: { color: '#ef4444', message: 'Intersection interdite' }
      })
      drawer.enable()
      drawerRef.current = drawer
    }
    return () => { if (drawerRef.current) { drawerRef.current.disable(); drawerRef.current = null } }
  }, [mode, map, isActive, overlapWarning])

  useEffect(() => {
    const handleCreated = (e) => {
      if (e.layerType === 'polygon') {
        const layer = e.layer
        const latLngs = layer.getLatLngs()
        const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs
        const data = ring.map(ll => [ll.lat, ll.lng])
        onShapeCreated('polygon', data)
        setMode('marker')
        setOverlapWarning(false)
      }
    }
    map.on('draw:created', handleCreated)
    return () => map.off('draw:created', handleCreated)
  }, [map, onShapeCreated, setMode])

  return overlapWarning ? (
    <div style={{
      position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, background: 'rgba(239,68,68,0.9)', color: '#fff',
      padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
      fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
      backdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(239,68,68,0.5)',
    }}>
      ⚠️ Chevauchement avec une zone existante
    </div>
  ) : null
}

function FeedbackForm({ parcel, onSubmit, onClose }) {
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const totalSteps = 5
  const [address, setAddress] = useState('Chargement de l\'adresse...')
  const [form, setForm] = useState({
    building_type: '',
    reasons: ['Signalement citoyen'],
    problems: ['Infrastructure / Autre'],
    urgency: 0,
    profile: '',
    residence_duration: '',
    would_use: null,
    opinion: '',
    photo: null,
    photoFile: null,
    name: 'Citoyen',
    email: 'citoyen@urbanmap.ma',
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
    if (step === 2) return form.opinion.trim() !== '';
    if (step === 3) return form.urgency > 0;
    if (step === 4) return form.residence_duration !== '';
    if (step === 5) return true; // Profile is optional
    return true;
  }

  const handleNext = () => {
    if (step === 1 && form.building_type === '') {
      setError('Veuillez sélectionner une catégorie');
      return;
    }
    if (step === 2 && form.opinion.trim() === '') {
      setError('Veuillez décrire le problème');
      return;
    }
    if (step === 2 && form.opinion && form.opinion.length > 500) {
      setError('Description trop longue (500 max)');
      return;
    }
    if (step === 3 && form.urgency === 0) {
      setError("Veuillez sélectionner un niveau d'urgence");
      return;
    }
    if (step === 4 && form.residence_duration === '') {
      setError('Veuillez sélectionner depuis quand');
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
      opinion: finalOpinion || form.opinion || 'Avis soumis',
      opinion_ai_validated: opinionAiValidated,
      opinion_ai_summary: null
    })
  }

  const progress = ((step - 1) / (totalSteps - 1)) * 100

  return (
    <div style={formStyles.wrapper}>
      <div style={formStyles.addressBox}>
        <span style={{ ...formStyles.addressIcon, display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 0C2.91 0 0 2.91 0 6.5C0 10.85 6.5 16 6.5 16C6.5 16 13 10.85 13 6.5C13 2.91 10.09 0 6.5 0ZM6.5 8.75C5.26 8.75 4.25 7.74 4.25 6.5C4.25 5.26 5.26 4.25 6.5 4.25C7.74 4.25 8.75 5.26 8.75 6.5C8.75 7.74 7.74 8.75 6.5 8.75Z" fill="#C1440E"/>
          </svg>
        </span>
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
        {[1, 2, 3, 4, 5].map((sIndex) => (
          <div
            key={sIndex}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: step > sIndex
                ? '#C1440E'
                : step === sIndex
                  ? 'rgba(193,68,14,0.55)'
                  : 'rgba(242,237,230,0.07)',
              transition: 'background 0.3s, transform 0.3s',
              transform: step === sIndex ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
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
                  reader.onloadend = () => setForm({ ...form, photo: reader.result, photoFile: file })
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
              onChange={e => { setForm({ ...form, name: e.target.value }); setError('') }}
              onBlur={() => setTouched({ ...touched, name: true })}
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
              onChange={e => { setForm({ ...form, email: e.target.value }); setError('') }}
              onBlur={() => setTouched({ ...touched, email: true })}
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
                  onClick={() => { setForm({ ...form, residence_duration: d.value }); setError(''); setTouched({ ...touched, residence_duration: true }); }}>
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
          {touched.residence_duration && !validateRequired(form.residence_duration).valid && <div role="alert" style={{ ...validationStyles.errorText, textAlign: 'center' }}>Veuillez sélectionner la durée</div>}
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
      <div style={{ ...formStyles.addressBox, background: '#f1f5f9' }}>
        <span style={formStyles.addressIcon}>📊</span>
        <span style={{ ...formStyles.addressText, color: '#0f172a' }}>Fiche Technique Urbanistique</span>
      </div>

      <div style={{ marginTop: '20px' }}>
        <p style={formStyles.question}>🏢 Détails de la zone</p>
        <div style={styles.parcelStats}>
          <div style={styles.parcelStat}><span style={styles.parcelStatNum}>{parcel.votes || 0}</span><span style={styles.parcelStatLabel}>Avis Citoyens</span></div>
          <div style={styles.parcelStat}><span style={styles.parcelStatNum}>{parcel.urgency || 3}/5</span><span style={styles.parcelStatLabel}>Urgence Moy.</span></div>
        </div>

        <p style={{ ...formStyles.subQuestion, marginTop: '20px' }}>Type d'équipement suggéré :</p>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', fontWeight: '700', color: '#1e40af', marginBottom: '20px' }}>
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
            <p style={{ ...formStyles.subQuestion, color: '#991b1b', marginTop: 0 }}>📝 Notes Internes (Privé) :</p>
            <textarea
              style={{ ...formStyles.textarea, borderColor: '#fecaca' }}
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Annotez cette zone pour l'équipe..."
            />
            <button onClick={handleSaveNote} style={{ ...formStyles.nextBtn, background: '#dc2626', marginTop: '10px', width: '100%' }}>
              💾 Sauvegarder la note
            </button>
          </div>
        )}

        <button
          style={{ ...formStyles.submitBtn, background: '#0f172a' }}
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
  const location = useLocation()
  const userCity = user?.city || 'marrakesh'
  // City-locked map config derived from user.city
  const cityConfig = getCityMapConfig(userCity)
  const showPlanningOverlays = user?.role !== 'citoyen'
  const [mapStyle, setMapStyle] = useState('plan')
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
      setParcels(unwrap(res))
      const resZones = await getZones()
      setZones(unwrap(resZones))
    } catch (err) {
      console.error('Erreur chargement données', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userCity])

  useEffect(() => {
    if (location.state?.activateDrawMode) {
      setDrawMode('polygon')
      // Clear the state so refresh doesn't re-trigger
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  const [selectedParcel, setSelectedParcel] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [votedParcels, setVotedParcels] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingZone, setPendingZone] = useState(null)
  const [zoneName, setZoneName] = useState('')
  const [zoneColor, setZoneColor] = useState('#C1440E')

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
      const isValidated = ['en_cours', 'resolu'].includes(p.status)
      const isMine = p.user_email === user.email
      return matchCity && matchCategory && (isValidated || isMine)
    } else if (user?.role === 'urbaniste') {
      // Urbaniste : Seulement Validées
      const isValidated = ['en_cours', 'resolu'].includes(p.status)
      return matchCity && matchStatus && matchCategory && isValidated
    }
    // Admin voit tout
    return matchCity && matchStatus && matchCategory
  })

  const handleParcelClick = (parcel) => {
    setSelectedParcel(parcel)
    setSubmitted(false)
  }

  const checkOverlap = (newPolygonCoords) => {
    const newPoly = turf.polygon([newPolygonCoords.map(c => [c[1], c[0]])])
    return zones.some(existingZone => {
      const existingCoords = existingZone.coordonnees_geojson
      if (!existingCoords || existingCoords.length < 3) return false
      const existingPoly = turf.polygon([existingCoords.map(c => [c[1], c[0]])])
      return turf.booleanOverlap(newPoly, existingPoly) ||
             turf.booleanContains(existingPoly, newPoly) ||
             turf.booleanContains(newPoly, existingPoly)
    })
  }

  const handleShapeCreated = (type, data, extraData = {}) => {
    if (type === 'polygon' && !extraData.zone_nom) {
      if (checkOverlap(data)) {
        alert('⚠️ Cette zone chevauche une zone existante. Veuillez dessiner en dehors des zones existantes.')
        return
      }
      setPendingZone({ positions: data })
      return // don't open panel yet
    }

    const newParcel = {
      id: Date.now(),
      name: extraData.zone_nom || 'Nouveau signalement',
      status: 'pending',
      deadline: 'À l\'instant',
      votes: 0,
      shapeType: type,
      isNew: true,
      zone_id: extraData.zone_id || null,
      zone_nom: extraData.zone_nom || null,
      zone_color: extraData.zone_color || '#C1440E',
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

  const handleFormSubmit = async (formValues) => {
    try {
      const formData = new FormData();
      formData.append('zone_id', selectedParcel.zone_id || '');
      formData.append('categorie', formValues.building_type);
      formData.append('urgency', formValues.urgency);
      formData.append('profile', formValues.profile);
      formData.append('residence_duration', formValues.residence_duration);
      formData.append('opinion', formValues.opinion || 'Avis soumis');
      formData.append('latitude', selectedParcel.positions[0][0]);
      formData.append('longitude', selectedParcel.positions[0][1]);

      // arrays must be appended item by item
      (formValues.reasons ?? []).forEach(r => formData.append('reasons[]', r));
      (formValues.problems ?? []).forEach(p => formData.append('problems[]', p));

      if (formValues.building_type) {
        formData.append('building_type', formValues.building_type);
      }
      if (formValues.photoFile) {
        formData.append('photo', formValues.photoFile);
      }

      await api.createRemark(formData);

      fetchData();
      setSubmitted(true);
      toast.success('Remarque soumise avec succès');
      if (formValues.opinion_ai_validated) {
        toast.info("Avis analysé par l'IA");
      }
    } catch (err) {
      toast.error('Erreur lors de la soumission');
      console.log('Validation errors:', err.response?.data?.errors);
      console.error(err);
    }
  }

  const handleClosePanel = () => {
    setSelectedParcel(null)
  }

  return (
    <div style={styles.wrapper} className={`${selectedParcel ? 'has-panel-open' : ''} ${drawMode === 'polygon' ? 'draw-mode' : ''}`}>
      <style>{`
        .leaflet-control-layers {
          display: none !important;
        }
        @media (max-width: 768px) {
          .map-floating-control.map-locate-control {
            top: 68px !important;
            left: 8px !important;
          }
          .map-floating-control.map-layers-control {
            top: 68px !important;
            right: 8px !important;
          }
          #live-counter {
            left: 8px !important;
            bottom: 100px !important;
            gap: 4px !important;
          }
          #live-counter > div {
            padding: 6px 8px !important;
          }
          #legend-box {
            display: none !important;
          }
        }
      `}</style>
      {/* Left floating action */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '80px',
        zIndex: 100,
      }}>
        <button
          type="button"
          aria-label="Signaler un point"
          title="Signaler un point"
          onClick={() => setDrawMode('marker')}
          style={{
            position: 'absolute',
            left: '12px',
            bottom: isMobile ? '165px' : '90px',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            border: '0.5px solid rgba(242,237,230,0.08)',
            background: 'rgba(8,6,3,0.88)',
            color: drawMode === 'marker' ? '#C1440E' : 'rgba(242,237,230,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="2.5" />
            <path d="M12 3v4" />
            <path d="M12 17v4" />
            <path d="M3 12h4" />
            <path d="M17 12h4" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        aria-label="Basculer Plan Satellite"
        title={mapStyle === 'plan' ? 'Satellite' : 'Plan'}
        onClick={() => setMapStyle(mapStyle === 'plan' ? 'satellite' : 'plan')}
        style={{
          position: 'absolute',
          top: '80px',
          right: '12px',
          zIndex: 100,
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          border: '0.5px solid rgba(242,237,230,0.08)',
          background: 'rgba(8,6,3,0.88)',
          color: 'rgba(242,237,230,0.72)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m12 2 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
      </button>

      <div style={{
        position: 'absolute',
        left: '66px',
        bottom: '16px',
        display: 'flex',
        gap: '8px',
        zIndex: 100,
      }}>
        <div style={{
          background: 'rgba(8,6,3,0.88)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px',
          padding: '8px 14px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#52BE80',
            animation: 'livePulse 2s infinite',
          }} />
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#52BE80',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            En direct
          </span>
        </div>

        <div style={{
          background: 'rgba(8,6,3,0.88)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px',
          padding: '8px 14px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            color: '#E8B87A',
            fontSize: '16px',
            lineHeight: 1,
          }}>Ø</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'rgba(242,237,230,0.32)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {filteredParcels.length} Signalements
          </span>
        </div>

        <div style={{
          background: 'rgba(8,6,3,0.88)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px',
          padding: '8px 14px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: '20px',
            color: '#E8B87A',
            fontWeight: 500,
            lineHeight: 1,
          }}>
            {zones.length}
          </span>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'rgba(242,237,230,0.32)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Zones
          </span>
        </div>
      </div>

      {drawMode === 'polygon' && (
        <div style={{
          position: 'absolute', bottom: '70px',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 150,
          background: 'rgba(8,6,3,0.88)',
          border: '0.5px solid rgba(193,68,14,0.3)',
          borderRadius: '10px', padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: '12px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          fontSize: '13px', color: '#F2EDE6', fontWeight: 500,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          </svg>
          Cliquez pour ajouter des points. Fermez sur le 1er point.
          <button
            onClick={() => setDrawMode('marker')}
            style={{
              background: 'rgba(255,255,255,0.22)', border: 'none',
              borderRadius: '100px', padding: '4px 12px',
              fontSize: '11px', color: '#F2EDE6',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}
          >
            Annuler
          </button>
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
        center={cityConfig.center}
        zoom={cityConfig.zoom}
        minZoom={cityConfig.minZoom}
        maxBounds={cityConfig.bounds}
        maxBoundsViscosity={1.0}
        style={styles.map}
        zoomControl={false}>
        <MapController center={cityConfig.center} zoom={cityConfig.zoom} bounds={cityConfig.bounds} minZoom={cityConfig.minZoom} selectedParcel={selectedParcel} />
        <LayersControl position="topright">
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
            <ZoneHeatmapLayer zones={showPlanningOverlays ? zones : []} />
          </LayersControl.Overlay>
        </LayersControl>

        {mapStyle === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community"
          />
        )}

        <MapAutoZoom city={userCity} />

        {showPlanningOverlays && zones.map(z => {
          const isSelected = selectedParcel && selectedParcel.zone_id === z.id;
          return (
            <Polygon
              key={`zone-${z.id}`}
              positions={z.coordonnees_geojson}
              pathOptions={{
                color: isSelected ? '#C1440E' : (z.couleur || '#3b82f6'),
                fillColor: z.couleur || '#3b82f6',
                fillOpacity: 0,
                weight: 2.5
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
              <Tooltip
                permanent
                direction="center"
                className="zone-label-tooltip"
              >
                {z.nom}
              </Tooltip>
              {!selectedParcel && (
                <Popup>
                  <b>{z.nom}</b><br />
                  {user?.role === 'citoyen' ? <span style={{ fontSize: '12px' }}>Cliquez ici pour soumettre un avis</span> : <span style={{ fontSize: '12px' }}>Zone officielle</span>}
                </Popup>
              )}
            </Polygon>
          );
        })}

        <InteractionManager
          mode={drawMode}
          onShapeCreated={handleShapeCreated}
          setMode={setDrawMode}
          isActive={!selectedParcel}
          userRole={user?.role}
          zones={zones}
        />

        {filteredParcels.map(parcel => {
          const statusCfg = STATUS_COLORS[parcel.status] || STATUS_COLORS.en_attente
          const categoryColor = CATEGORY_COLORS[parcel.building_type] || '#94a3b8'
          const hasVoted = votedParcels.includes(parcel.id)
          const isSelected = selectedParcel && selectedParcel.id === parcel.id

          // Couleur : Citoyen voit catégorie, Pro voit statut
          const markerColor = user?.role === 'citoyen' ? categoryColor : statusCfg.fill

          return (
            <Polygon key={parcel.id} positions={parcel.positions}
              pathOptions={{
                color: isSelected ? '#C1440E' : (hasVoted ? '#9ca3af' : markerColor),
                fillColor: hasVoted ? '#d1d5db' : markerColor,
                fillOpacity: 0.04,
                weight: 2.5,
                className: '',
              }}
              eventHandlers={{ click: () => handleParcelClick(parcel) }} />
          )
        })}

        {selectedParcel?.isNew && (
          selectedParcel.shapeType === 'circle' ? (
            <Circle center={selectedParcel.positions[0]} radius={selectedParcel.radius} pathOptions={{ color: '#C1440E', fillColor: '#C1440E', fillOpacity: 0.22, weight: 2 }} />
          ) : selectedParcel.positions.length > 1 ? (
            <Polygon positions={selectedParcel.positions} pathOptions={{ color: selectedParcel.zone_color || '#C1440E', fillColor: selectedParcel.zone_color || '#C1440E', fillOpacity: 0.22, weight: 2 }} />
          ) : (
            <Marker position={selectedParcel.positions[0]} />
          )
        )}
      </MapContainer>

      <Legend role={user?.role} isMobile={isMobile} />

      {selectedParcel && (
        <div style={{
          position: 'absolute',
          top: isMobile ? 'auto' : 0,
          bottom: 0,
          right: 0,
          left: isMobile ? 0 : 'auto',
          width: isMobile ? '100%' : '360px',
          height: isMobile ? '75vh' : 'auto',
          background: 'rgba(8,6,3,0.96)',
          borderLeft: isMobile ? 'none' : '0.5px solid rgba(242,237,230,0.08)',
          borderTop: isMobile ? '0.5px solid rgba(242,237,230,0.08)' : 'none',
          borderRadius: isMobile ? '16px 16px 0 0' : 0,
          zIndex: 1500, display: 'flex', flexDirection: 'column',
          transform: selectedParcel ? 'translateX(0)' : isMobile ? 'translateY(100%)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          backdropFilter: 'blur(18px)',
          boxShadow: isMobile
            ? '0 -4px 32px rgba(0,0,0,0.5)'
            : '-4px 0 32px rgba(0,0,0,0.5), -0.5px 0 0 rgba(193,68,14,0.12)',
        }}>
          {isMobile && (
            <div style={{
              display: 'flex', justifyContent: 'center',
              padding: '8px 0 4px',
              flexShrink: 0,
            }}>
              <div style={{
                width: '36px', height: '4px',
                borderRadius: '2px',
                background: 'rgba(242,237,230,0.15)',
              }} />
            </div>
          )}
          {/* Panel header */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '0.5px solid rgba(242,237,230,0.06)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '10px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontSize: '10px', letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#E8B87A', marginBottom: '7px',
                  background: 'rgba(193,68,14,0.1)',
                  border: '0.5px solid rgba(193,68,14,0.25)',
                  padding: '3px 8px', borderRadius: '100px',
                }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: STATUS_COLORS[selectedParcel?.status]?.fill
                      || '#C1440E',
                  }} />
                  {selectedParcel?.zone_nom || 'Zone sélectionnée'}
                </div>
                <p style={{
                  fontFamily: 'Amiri, serif', fontSize: '20px',
                  color: '#F2EDE6', fontWeight: 700,
                  lineHeight: 1.2, margin: 0,
                }}>
                  {selectedParcel?.isNew
                    ? 'Nouveau signalement'
                    : selectedParcel?.name}
                </p>
                <div style={{
                  display: 'flex', gap: '10px',
                  flexWrap: 'wrap', marginTop: '8px',
                }}>
                  {!selectedParcel?.isNew && (
                    <>
                      <span style={{
                        fontSize: '11px',
                        color: 'rgba(242,237,230,0.35)',
                      }}>
                        {selectedParcel?.deadline}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'rgba(242,237,230,0.35)',
                      }}>
                        · {selectedParcel?.votes} avis
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={handleClosePanel}
                style={{
                  width: '26px', height: '26px', borderRadius: '4px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(242,237,230,0.1)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer',
                  color: 'rgba(242,237,230,0.35)', flexShrink: 0,
                  transition: 'all 0.2s', fontSize: '14px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.color = '#F2EDE6'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = 'rgba(242,237,230,0.35)'
                }}
              >
                ✕
              </button>
            </div>
            {/* Status bar */}
            <div style={{
              height: '2px', width: '100%', marginTop: '12px',
              borderRadius: '1px',
              background: 'linear-gradient(90deg, #C1440E, #E8B87A)',
            }} />
          </div>

          {/* Panel scrollable body */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 18px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(193,68,14,0.3) transparent',
          }}>
            {/* keep existing FeedbackForm / ProfessionalView / success JSX */}
            {(votedParcels.includes(selectedParcel.id) || submitted) ? (
              <div style={{
                padding: '28px 18px', textAlign: 'center',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'rgba(82,190,128,0.1)',
                  border: '0.5px solid rgba(82,190,128,0.4)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '14px',
                  fontSize: '22px',
                }}>✓</div>
                <h3 style={{
                  fontFamily: 'Amiri, serif', fontSize: '22px',
                  color: '#F2EDE6', marginBottom: '8px', fontWeight: 700,
                }}>
                  Avis enregistré !
                </h3>
                <p style={{
                  fontSize: '12px', color: 'rgba(242,237,230,0.38)',
                  lineHeight: 1.6, maxWidth: '240px', fontWeight: 300,
                }}>
                  Merci pour votre contribution à l'urbanisme de votre ville.
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(193,68,14,0.08)',
                  border: '0.5px solid rgba(193,68,14,0.25)',
                  borderRadius: '6px', padding: '9px 13px', marginTop: '14px',
                  fontSize: '11px', color: 'rgba(193,68,14,0.9)',
                }}>
                  ● Analysé par l'IA · Gemini API
                </div>
                <button
                  onClick={handleClosePanel}
                  style={{
                    marginTop: '16px', width: '100%', padding: '9px',
                    background: 'transparent',
                    border: '0.5px solid rgba(242,237,230,0.1)',
                    borderRadius: '6px', fontSize: '12px',
                    color: 'rgba(242,237,230,0.4)',
                    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
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
        </div>
      )}

      {/* Floating zone naming modal */}
      {pendingZone && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          background: 'rgba(8,6,3,0.96)',
          border: '0.5px solid rgba(193,68,14,0.35)',
          borderRadius: '12px', padding: '24px',
          width: '280px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.15), 0 24px 48px rgba(0,0,0,0.7)',
        }}>
          <div style={{ fontFamily: 'Amiri, serif', fontSize: '18px', color: '#F2EDE6', marginBottom: '16px', fontWeight: 700 }}>
            Nommer la zone
          </div>
          <input
            autoFocus
            value={zoneName}
            onChange={e => setZoneName(e.target.value)}
            placeholder="Ex: Gueliz Nord..."
            style={{
              width: '100%', padding: '9px 12px',
              background: 'rgba(255,255,255,0.05)',
              border: '0.5px solid rgba(242,237,230,0.15)',
              borderRadius: '6px', color: '#F2EDE6',
              fontSize: '13px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none', marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.4)' }}>Couleur:</span>
            {['#C1440E','#1A5276','#E8B87A','#52BE80','#5DADE2'].map(c => (
              <div
                key={c}
                onClick={() => setZoneColor(c)}
                style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: c, cursor: 'pointer',
                  border: zoneColor === c ? '2px solid #F2EDE6' : '2px solid transparent',
                  transition: 'border 0.15s',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPendingZone(null)}
              style={{
                flex: 1, padding: '9px', borderRadius: '6px',
                background: 'transparent',
                border: '0.5px solid rgba(242,237,230,0.12)',
                color: 'rgba(242,237,230,0.4)',
                fontSize: '12px', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!zoneName.trim()) return
                if (checkOverlap(pendingZone.positions)) {
                  alert('⚠️ Cette zone chevauche une zone existante. Veuillez choisir un emplacement différent.')
                  return
                }
                // Now save to API with zoneName + zoneColor
                handleShapeCreated('polygon', pendingZone.positions, {
                  zone_nom: zoneName,
                  zone_color: zoneColor,
                })
                setPendingZone(null)
                setZoneName('')
              }}
              style={{
                flex: 2, padding: '9px', borderRadius: '6px',
                background: '#C1440E', color: '#fff', border: 'none',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              }}
            >
              Créer la zone →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Legend({ role, isMobile }) {
  if (isMobile) return null
  if (role === 'citoyen') return null

  return (
    <div style={{
      position: 'absolute', bottom: '80px', left: '60px',
      zIndex: 100,
      background: 'rgba(8,6,3,0.88)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px', padding: '12px 14px',
      backdropFilter: 'blur(16px)', minWidth: '160px',
      boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{
        fontSize: '10px', letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(242,237,230,0.22)', marginBottom: '10px',
        margin: '0 0 10px 0',
      }}>
        {role === 'citoyen' ? 'Catégories' : 'Statuts'}
      </p>

      {role === 'citoyen' ? (
        BUILDING_TYPES.map(type => (
          <div key={type.value} style={{
            display: 'flex', alignItems: 'center',
            gap: '8px', marginBottom: '7px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: CATEGORY_COLORS[type.value],
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '11px', color: 'rgba(242,237,230,0.45)',
            }}>
              {type.label.split(' ').slice(1).join(' ')}
            </span>
          </div>
        ))
      ) : (
        <>
          {Object.entries(STATUS_COLORS).map(([key, cfg]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '7px',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: cfg.fill, flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,237,230,0.45)',
              }}>
                {cfg.label}
              </span>
            </div>
          ))}
          <div style={{
            height: '0.5px',
            background: 'rgba(242,237,230,0.06)',
            margin: '10px 0',
          }} />
          {BUILDING_TYPES.slice(0, 5).map(type => (
            <div key={type.value} style={{
              display: 'flex', alignItems: 'center',
              gap: '8px', marginBottom: '7px',
            }}>
              <div style={{
                width: '8px', height: '8px',
                borderRadius: '2px',
                background: CATEGORY_COLORS[type.value],
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px', color: 'rgba(242,237,230,0.45)',
              }}>
                {type.label.split(' ').slice(1).join(' ')}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
