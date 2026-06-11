/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, useMapEvents, Circle, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Navbar from '../components/Navbar.jsx'
import api from '../services/api.js'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { useToast } from '../hooks/useToast.js'
import { getCityMapConfig } from '../utils/cityBounds'
import { getZones } from '../services/adminApi'
import { unwrap } from '../utils/unwrap'
import FeedbackForm from '../components/FeedbackForm'
import { driver as Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Plus } from 'lucide-react'
import { generateRemarkPDF } from '../services/pdfService'

// Fix Leaflet Default Icon issue in Vite/React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
    j = i;
  }

  return inside;
}

function detectZoneForPoint(lat, lng, zones) {
  for (const zone of zones) {
    if (isPointInPolygon(lat, lng, zone.coordonnees_geojson)) {
      return { zone_id: zone.id, zone_nom: zone.nom };
    }
  }
  return { zone_id: null, zone_nom: null };
}

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
function MapController({ center, zoom, bounds, minZoom, selectedParcel, onMapReady }) {
  const map = useMap();
  useEffect(() => { onMapReady?.(map) }, []);
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
    width: '36px', height: '36px',
    fontSize: '14px', fontWeight: 600,
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(242,237,230,0.11)',
    borderRadius: '6px',
    cursor: 'pointer', opacity: 0.35, transition: 'all 0.2s',
    color: '#E8B87A',
  },
  urgencyBtnActive: {
    opacity: 1,
    borderColor: '#C1440E',
    background: 'rgba(193,68,14,0.12)',
    transform: 'scale(1.05)',
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
  road: '#78716c', route: '#78716c',
  lighting: '#eab308', eclairage: '#eab308',
  waste: '#22c55e', dechets: '#22c55e',
  water: '#3b82f6', eau: '#3b82f6',
  parks: '#16a34a', parc: '#16a34a',
  schools: '#6366f1',
  transport: '#f97316',
  other: '#94a3b8', autre: '#94a3b8',
}

const PROBLEM_TYPES = [
  { value: 'road', label: 'Route ou trottoir' },
  { value: 'lighting', label: 'Éclairage public' },
  { value: 'waste', label: 'Déchets et propreté' },
  { value: 'water', label: 'Eau ou drainage' },
  { value: 'parks', label: 'Parcs et espaces verts' },
  { value: 'schools', label: 'Écoles ou bâtiments publics' },
  { value: 'transport', label: 'Transports en commun' },
  { value: 'other', label: 'Autre' },
]

const URGENCY_LABELS = {
  1: 'Gêne mineure',
  2: 'Gênant mais gérable',
  3: 'Problème important',
  4: 'Dangereux',
  5: 'Urgence, action immédiate requise',
}

const PROBLEM_DURATION = [
  { value: 'days', label: 'Vient d\'apparaître (quelques jours)' },
  { value: 'months', label: 'Quelques mois' },
  { value: 'year', label: 'Plus d\'un an' },
  { value: 'always', label: 'Aussi longtemps que je m\'en souvienne' },
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

function UserLocationMarker({ position }) {
  if (!position) return null
  return (
    <>
      <Circle
        center={position}
        radius={80}
        pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}
      />
      <Circle
        center={position}
        radius={8}
        pathOptions={{ color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}
      />
    </>
  )
}

function InteractionManager({ mode, onShapeCreated, setMode, isActive, userRole, zones }) {
  const map = useMapEvents({
    click(e) {
      if (mode === 'marker' && isActive) {
        const { lat, lng } = e.latlng;
        const zoneMatch = detectZoneForPoint(lat, lng, zones);
        onShapeCreated('marker', [lat, lng], zoneMatch);
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

        <p style={{ ...formStyles.subQuestion, marginTop: '20px' }}>Type de problème :</p>
        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', fontWeight: '700', color: '#1e40af', marginBottom: '20px' }}>
          {PROBLEM_TYPES.find(b => b.value === parcel.building_type)?.label || 'Non spécifié'}
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
  
  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true })
    } else if (user?.role === 'super_admin') {
      navigate('/super-admin/users', { replace: true })
    } else if (user?.role === 'urbaniste') {
      navigate('/urbaniste/dashboard', { replace: true })
    }
  }, [user, navigate])

  const userCity = user?.city || 'marrakesh'
  // City-locked map config derived from user.city
  const cityConfig = getCityMapConfig(userCity)
  const [mapStyle, setMapStyle] = useState('plan')
  const [showLayersPanel, setShowLayersPanel] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const layersPanelRef = useRef(null)
  const [drawMode, setDrawMode] = useState('marker') // 'marker' | 'polygon'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!showLayersPanel) return
    const handleOutsideClick = (e) => {
      if (layersPanelRef.current && !layersPanelRef.current.contains(e.target)) {
        setShowLayersPanel(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showLayersPanel])

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas disponible sur cet appareil')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([latitude, longitude])
        const map = mapRef.current
        if (map) {
          map.flyTo([latitude, longitude], 15, { animate: true, duration: 1.5 })
          L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#4285F4',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 1,
          })
            .bindPopup('📍 Vous êtes ici')
            .addTo(map)
            .openPopup()
        }
        setIsLocating(false)
      },
      () => {
        setIsLocating(false)
        toast.error('Impossible d\'accéder à votre position. Vérifiez les permissions de localisation.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const mapRef = useRef(null)

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

  useEffect(() => {
    if (selectedParcel) setShowLayersPanel(false)
  }, [selectedParcel])

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
    if (!p.latitude || !p.longitude) return false

    const matchStatus = filterStatus === 'all' ? true : p.statut === filterStatus
    const matchCategory = filterCategory === 'all' ? true : p.building_type === filterCategory

    if (user?.role === 'citoyen') {
      const isValidated = ['en_cours', 'resolu'].includes(p.statut)
      const isMine = p.user?.email === user.email
      return matchCategory && (isValidated || isMine)
    } else if (user?.role === 'urbaniste') {
      const isValidated = ['en_cours', 'resolu'].includes(p.statut)
      return matchStatus && matchCategory && isValidated
    }
    return matchStatus && matchCategory
  })

  const handleParcelClick = (parcel) => {
    setSelectedParcel(parcel)
    setSubmitted(false)
  }

  const handleShapeCreated = (type, data, extraData = {}) => {
    if (type === 'polygon' && !extraData.zone_nom) {
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
      const problemLabel = formValues.problem_label || formValues.problem_type
      const formData = new FormData();
      if (selectedParcel.zone_id) {
        formData.append('zone_id', selectedParcel.zone_id);
      }
      formData.append('categorie', formValues.problem_type);
      formData.append('building_type', formValues.problem_type);
      formData.append('urgency', formValues.urgency);
      formData.append('duration', formValues.duration);
      formData.append('opinion', formValues.opinion || 'Signalement soumis sans description');
      formData.append('latitude', selectedParcel.positions[0][0]);
      formData.append('longitude', selectedParcel.positions[0][1]);
      formData.append('reasons[]', 'Signalement citoyen');
      formData.append('problems[]', problemLabel);

      if (formValues.photoFile) {
        formData.append('photo', formValues.photoFile);
      }

      const response = await api.createRemark(formData);
      const createdRemark = response?.data || response;
      createdRemark.opinion = formValues.opinion || 'Signalement soumis sans description';
      createdRemark.profile = formValues.profile;
      createdRemark.duration = formValues.duration;
      createdRemark.urgency = formValues.urgency;
      createdRemark.categorie = formValues.problem_type;

      fetchData();
      setSubmitted(true);
      toast.success(
        selectedParcel.zone_nom
          ? `Signalement envoyé — assigné à la zone ${selectedParcel.zone_nom} ✓`
          : 'Signalement envoyé — aucune zone correspondante, un admin l\'examinera ✓'
      );
      if (formValues.opinion_ai_validated) {
        toast.info("Avis analysé par l'IA");
      }

      generateRemarkPDF(createdRemark);
    } catch (err) {
      toast.error('Erreur lors de la soumission');
      console.log('Validation errors:', err.response?.data?.errors);
      console.error(err);
    }
  }

  const handleClosePanel = () => {
    setSelectedParcel(null)
  }

  // ─── Onboarding tour — only on first login ─────────────────────────
  const markTourSeen = useCallback(() => {
    localStorage.setItem('urbanmap_tour_done', 'true')
  }, [])

  useEffect(() => {
    if (user?.role !== 'citoyen') return
    if (localStorage.getItem('urbanmap_tour_done')) return

    const driver = new Driver({
      animate: true,
      opacity: 0.75,
      padding: 10,
      allowClose: true,
      overlayClickNext: false,
      doneBtnText: 'Commencer !',
      closeBtnText: 'Passer',
      nextBtnText: 'Suivant →',
      prevBtnText: '← Précédent',
      onReset: markTourSeen,
      onDestroyed: markTourSeen,
      steps: [
        {
          element: '#map-container',
          popover: {
            title: 'Carte de Marrakesh',
            description: 'Voici la carte interactive de votre ville. Vous pouvez voir tous les signalements citoyens en temps réel.',
            position: 'right',
          },
        },
        {
          element: '#locate-btn',
          popover: {
            title: '🧭 Me localiser',
            description: 'Cliquez sur ce bouton pour vous situer sur la carte et découvrir les signalements près de chez vous.',
            position: 'right',
          },
        },
        {
          element: '#add-report-btn',
          popover: {
            title: 'Signaler un problème',
            description: 'Cliquez sur ce bouton puis choisissez un emplacement sur la carte pour signaler un problème urbain.',
            position: 'top',
          },
        },
        {
          element: '#legend-box',
          popover: {
            title: 'Catégories',
            description: 'Chaque couleur représente une catégorie : marron = route, jaune = éclairage, vert = déchets, bleu = eau, violet = écoles…',
            position: 'left',
          },
        },
        {
          element: '#live-counter',
          popover: {
            title: 'En direct',
            description: 'Suivez en temps réel le nombre total de signalements et de zones officielles dans Marrakesh.',
            position: 'top',
          },
        },
        {
          element: '#add-report-btn',
          popover: {
            title: 'Vous êtes prêt !',
            description: 'Commencez par signaler un problème près de chez vous.',
            position: 'top',
            onClose: markTourSeen,
          },
        },
      ],
    })

    const timer = setTimeout(() => driver.drive(), 1500)
    return () => clearTimeout(timer)
  }, [user, markTourSeen])

  const restartTour = () => {
    localStorage.removeItem('urbanmap_tour_done')
    window.location.reload()
  }

  return (
    <div id="urbanmap-wrapper" style={styles.wrapper} className={`${selectedParcel ? 'has-panel-open' : ''} ${drawMode === 'polygon' ? 'draw-mode' : ''}`}>
      <style>{`
        .navbar-search input:focus,
        input[placeholder*="quartier"]:focus,
        input[placeholder*="adresse"]:focus {
          outline: none !important;
          border-color: rgba(193,68,14,0.5) !important;
          box-shadow: none !important;
        }

        .driver-popover {
          background: rgba(8,6,3,0.96) !important;
          border: 0.5px solid rgba(193,68,14,0.3) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7) !important;
          color: #F2EDE6 !important;
          font-family: 'DM Sans', sans-serif !important;
        }
        .driver-popover-title {
          font-family: 'Amiri', serif !important;
          color: #F2EDE6 !important;
          font-size: 17px !important;
        }
        .driver-popover-description {
          color: rgba(242,237,230,0.6) !important;
          font-size: 12px !important;
          line-height: 1.6 !important;
        }
        .driver-popover-footer button {
          background: transparent !important;
          border: 0.5px solid rgba(242,237,230,0.15) !important;
          color: rgba(242,237,230,0.6) !important;
          border-radius: 6px !important;
          font-family: 'DM Sans', sans-serif !important;
          font-size: 12px !important;
        }
        .driver-popover-footer .driver-btn-next {
          background: #C1440E !important;
          border-color: #C1440E !important;
          color: #fff !important;
        }
        .driver-popover-close-btn {
          color: rgba(242,237,230,0.4) !important;
        }
        .driver-overlay {
          background: rgba(6,4,3,0.75) !important;
        }
      `}</style>
      {user?.role === 'citoyen' && (
        <button
          id="add-report-btn"
          type="button"
          aria-label="Signaler un problème"
          title="Signaler un problème"
          onClick={() => toast.info('Cliquez sur la carte pour placer votre signalement')}
          style={{
            position: 'fixed',
            bottom: isMobile ? '80px' : '90px',
            right: '20px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#C1440E',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            zIndex: 1000,
          }}
          title="Signaler un problème"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)'
          }}
        >
          <Plus size={22} />
        </button>
      )}
      <div className="map-floating-control map-locate-control">
        <button
          id="locate-btn"
          type="button"
          aria-label="Ma position"
          title="Ma position"
          onClick={handleLocateMe}
          disabled={isLocating}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            border: '0.5px solid rgba(242,237,230,0.08)',
            background: 'rgba(8,6,3,0.88)',
            color: isLocating ? '#C1440E' : 'rgba(242,237,230,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isLocating ? 'wait' : 'pointer',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
            opacity: isLocating ? 0.8 : 1,
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

      {/* Right — layers panel (shifts left when signalement form is open) */}
      <div
        ref={layersPanelRef}
        className={[
          'map-floating-control',
          'map-layers-control',
          selectedParcel ? 'map-layers-control--shifted' : '',
          selectedParcel && isMobile ? 'map-layers-control--mobile-shifted' : '',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          aria-label="Couches de la carte"
          title="Couches de la carte"
          aria-expanded={showLayersPanel}
          onClick={() => setShowLayersPanel(prev => !prev)}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            border: showLayersPanel ? '0.5px solid rgba(193,68,14,0.4)' : '0.5px solid rgba(242,237,230,0.08)',
            background: 'rgba(8,6,3,0.88)',
            color: showLayersPanel ? '#C1440E' : 'rgba(242,237,230,0.72)',
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

            {showLayersPanel && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                minWidth: '200px',
                maxWidth: 'calc(100vw - 80px)',
            background: 'rgba(8,6,3,0.96)',
            border: '0.5px solid rgba(242,237,230,0.1)',
            borderRadius: '10px',
            padding: '12px',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <p style={{
              fontSize: '10px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(242,237,230,0.35)',
              margin: '0 0 10px 0',
            }}>
              Fond de carte
            </p>
            {[
              { id: 'plan', label: 'Plan' },
              { id: 'satellite', label: 'Satellite' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMapStyle(option.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  marginBottom: '4px',
                  borderRadius: '6px',
                  border: mapStyle === option.id ? '0.5px solid rgba(193,68,14,0.4)' : '0.5px solid transparent',
                  background: mapStyle === option.id ? 'rgba(193,68,14,0.12)' : 'transparent',
                  color: mapStyle === option.id ? '#F2EDE6' : 'rgba(242,237,230,0.55)',
                  fontSize: '12px',
                  fontFamily: 'DM Sans, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {mapStyle === option.id ? '✓ ' : ''}{option.label}
              </button>
            ))}
          </div>
        )}

        {user?.role === 'citoyen' && (
          <button
            type="button"
            aria-label="Aide"
            title="Aide"
            onClick={restartTour}
            style={{
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
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
              marginTop: '6px',
            }}
          >
            ?
          </button>
        )}
      </div>

      <div id="live-counter" style={{
        position: 'absolute',
        left: isMobile ? '12px' : '66px',
        bottom: isMobile ? '16px' : '16px',
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
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'rgba(242,237,230,0.32)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {parcels.length} Signalements
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
          left: isMobile ? '16px' : '50%', right: isMobile ? '16px' : undefined,
          transform: isMobile ? 'none' : 'translateX(-50%)',
          zIndex: 150,
          background: 'rgba(8,6,3,0.88)',
          border: '0.5px solid rgba(193,68,14,0.3)',
          borderRadius: '10px', padding: isMobile ? '8px 14px' : '10px 24px',
          display: 'flex', alignItems: 'center', gap: '12px',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 0 0 0.5px rgba(193,68,14,0.12), 0 8px 32px rgba(0,0,0,0.5)',
          fontSize: isMobile ? '11px' : '13px', color: '#F2EDE6', fontWeight: 500,
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
        buildingTypes={PROBLEM_TYPES}
      />


      <MapContainer
        id="map-container"
        center={cityConfig.center}
        zoom={cityConfig.zoom}
        minZoom={cityConfig.minZoom}
        maxBounds={cityConfig.bounds}
        maxBoundsViscosity={1.0}
        style={styles.map}
        zoomControl={false}>
        <MapController center={cityConfig.center} zoom={cityConfig.zoom} bounds={cityConfig.bounds} minZoom={cityConfig.minZoom} selectedParcel={selectedParcel} onMapReady={(m) => { mapRef.current = m }} />

        {mapStyle === 'plan' ? (
          <TileLayer
            key="plan"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap"
          />
        ) : (
          <TileLayer
            key="satellite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        )}

        <UserLocationMarker position={userLocation} />

        <MapAutoZoom city={userCity} />

        {zones.map(z => {
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
                  if (user?.role !== 'citoyen') {
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
                  {user?.role === 'citoyen' ? (
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <b>Zone officielle : {z.nom}</b><br />
                      <span style={{ fontSize: '13px', color: '#666' }}>
                        Cette zone est activement surveillée<br />par les autorités de {userCity}.
                      </span>
                    </div>
                  ) : (
                    <>
                      <b>{z.nom}</b><br />
                      <span style={{ fontSize: '12px' }}>Zone officielle</span>
                    </>
                  )}
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
          const categoryColor = CATEGORY_COLORS[parcel.building_type] || '#94a3b8'
          const isSelected = selectedParcel && selectedParcel.id === parcel.id

          return (
            <CircleMarker
              key={parcel.id}
              center={[parcel.latitude, parcel.longitude]}
              radius={5}
              pathOptions={{
                color: isSelected ? '#C1440E' : categoryColor,
                fillColor: categoryColor,
                fillOpacity: 0.8,
                weight: isSelected ? 2.5 : 1.5,
              }}
              eventHandlers={{ click: () => handleParcelClick(parcel) }}
            />
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
          position: 'absolute', top: 0, right: 0, bottom: 0,
          paddingTop: isMobile ? '62px' : undefined,
          width: isMobile ? '100%' : '360px',
          background: 'rgba(8,6,3,0.88)',
          borderLeft: '0.5px solid rgba(242,237,230,0.08)',
          zIndex: 1500, display: 'flex', flexDirection: 'column',
          transform: selectedParcel ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          backdropFilter: 'blur(18px)',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.5), -0.5px 0 0 rgba(193,68,14,0.12)',
        }}>
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
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 16px)' : undefined,
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
          width: isMobile ? 'calc(100vw - 48px)' : '280px',
          maxWidth: '320px',
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

  return (
    <div id="legend-box" style={{
      position: 'absolute', bottom: '80px', left: '60px',
      zIndex: 100,
      display: isMobile ? 'none' : 'block',
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
        PROBLEM_TYPES.map(type => (
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
              {type.label}
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
          {PROBLEM_TYPES.slice(0, 5).map(type => (
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
                {type.label}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
