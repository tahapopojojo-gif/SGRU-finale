import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import axiosInstance from '../services/axiosInstance';
import { generateRemarkPDF } from '../services/pdfService';
import { useToast } from '../hooks/useToast';

// Leaflet default icons fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Map controller to invalidate size and fly to center
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (center && zoom) {
      map.setView(center, zoom, { animate: true, duration: 0.6 });
    }
  }, [map, center, zoom]);
  return null;
}

// Custom Draw Manager using Leaflet.Draw
function ZoneDrawManager({ isDrawing, setIsDrawing, onShapeCreated }) {
  const map = useMap();

  useEffect(() => {
    let drawer;
    if (isDrawing) {
      drawer = new L.Draw.Polygon(map, {
        shapeOptions: {
          color: '#C1440E',
          fillColor: '#C1440E',
          fillOpacity: 0.35,
          weight: 3
        },
        showArea: false,
        allowIntersection: false,
        drawError: {
          color: '#ef4444',
          message: 'Intersection non autorisée'
        }
      });
      drawer.enable();
    }

    const handleCreated = (e) => {
      if (e.layerType === 'polygon') {
        const layer = e.layer;
        const latLngs = layer.getLatLngs()[0];
        const coords = latLngs.map(ll => [ll.lat, ll.lng]);
        onShapeCreated(coords);
        layer.remove();
        setIsDrawing(false);
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      if (drawer) drawer.disable();
      map.off(L.Draw.Event.CREATED, handleCreated);
    };
  }, [isDrawing, map, onShapeCreated, setIsDrawing]);

  return null;
}

export default function PublicMapPage() {
  const { isAuthenticated, login, token } = useAuth();
  const { toast } = useToast();
  
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);

  // Auth form state
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Remark form state
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [remarkCategory, setRemarkCategory] = useState('autre');
  const [remarkUrgency, setRemarkUrgency] = useState(3);
  const [remarkOpinion, setRemarkOpinion] = useState('');
  const [remarkError, setRemarkError] = useState('');

  const fetchZones = async () => {
    setLoading(true);
    try {
      // Direct call without Auth header as required
      const res = await axios.get('http://localhost:8000/api/zones');
      if (res.data && res.data.data) {
        setZones(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedZoneId(res.data.data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load zones', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSignalerClick = () => {
    if (isAuthenticated) {
      setIsDrawing(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authTab === 'login') {
        await login(authEmail, authPassword);
        setShowAuthModal(false);
        setIsDrawing(true);
      } else {
        // Register using api services
        await api.register({
          nom: authName,
          email: authEmail,
          password: authPassword,
          password_confirmation: authPassword,
          role: 'citoyen',
          city: 'marrakesh'
        });
        // Login right after register
        await login(authEmail, authPassword);
        setShowAuthModal(false);
        setIsDrawing(true);
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || "Une erreur est survenue lors de l'authentification.");
    }
  };

  const handleShapeCreated = (coords) => {
    setDrawnPolygon(coords);
    setShowRemarkModal(true);
  };

  const handleRemarkSubmit = async (e) => {
    e.preventDefault();
    setRemarkError('');

    if (!selectedZoneId) {
      setRemarkError("Veuillez sélectionner une zone.");
      return;
    }

    if (!remarkOpinion.trim()) {
      setRemarkError("Veuillez décrire le problème.");
      return;
    }

    // Calculate center coordinates of drawn shape
    const lat = drawnPolygon.reduce((sum, c) => sum + c[0], 0) / drawnPolygon.length;
    const lng = drawnPolygon.reduce((sum, c) => sum + c[1], 0) / drawnPolygon.length;

    try {
      // Post using the Sanctum authenticated instance
      const res = await axiosInstance.post('/remarques', {
        zone_id: parseInt(selectedZoneId, 10),
        categorie: remarkCategory,
        urgency: parseInt(remarkUrgency, 10),
        opinion: remarkOpinion,
        latitude: lat,
        longitude: lng,
        reasons: ['Signalement citoyen public'],
        problems: ['Infrastructure / Autre'],
        profile: 'Citoyen',
        residence_duration: 'Plus de 5 ans'
      });

      const remarkData = res.data.data || res.data;
      generateRemarkPDF(remarkData);

      toast.success("Votre signalement a été enregistré avec succès ! Un récépissé PDF a été généré et téléchargé.", 4000);
      setShowRemarkModal(false);
      setDrawnPolygon(null);
      setRemarkOpinion('');
    } catch (err) {
      setRemarkError(err.response?.data?.message || "Échec de l'envoi du signalement.");
    }
  };

  // Styles definition using pure inline styles as requested
  const s = {
    container: {
      position: 'relative',
      width: '100vw',
      height: '100vh',
      fontFamily: 'DM Sans, sans-serif',
      background: '#0E0B08',
      overflow: 'hidden'
    },
    mapContainer: {
      width: '100%',
      height: '100%',
      zIndex: 1
    },
    floatBtn: {
      position: 'absolute',
      bottom: '24px',
      right: '24px',
      zIndex: 1000,
      background: '#C1440E',
      color: '#fff',
      border: 'none',
      borderRadius: '30px',
      padding: '14px 24px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      boxShadow: '0 8px 24px rgba(193,68,14,0.4)',
      transition: 'transform 0.2s ease'
    },
    modalOverlay: {
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      backgroundColor: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    },
    modalContent: {
      background: '#0f0c09',
      width: '100%',
      maxWidth: '420px',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      border: '0.5px solid rgba(242,237,230,0.1)'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#F2EDE6',
      marginBottom: '20px',
      textAlign: 'center'
    },
    tabsContainer: {
      display: 'flex',
      borderBottom: '1px solid rgba(242,237,230,0.1)',
      marginBottom: '20px'
    },
    tabButton: (active) => ({
      flex: 1,
      padding: '10px',
      background: 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #C1440E' : 'none',
      color: active ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      textAlign: 'center'
    }),
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '700',
      color: 'rgba(242,237,230,0.6)',
      marginBottom: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      fontSize: '14px',
      border: '1px solid rgba(242,237,230,0.12)',
      borderRadius: '8px',
      outline: 'none',
      background: 'rgba(255,255,255,0.04)',
      color: '#F2EDE6',
      boxSizing: 'border-box'
    },
    submitBtn: {
      width: '100%',
      padding: '12px',
      background: '#C1440E',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      marginTop: '10px'
    },
    cancelBtn: {
      width: '100%',
      padding: '12px',
      background: 'transparent',
      color: 'rgba(242,237,230,0.6)',
      border: '1px solid rgba(242,237,230,0.15)',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px'
    },
    errorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '6px'
    },
    drawingIndicator: {
      position: 'absolute',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(15, 12, 9, 0.9)',
      border: '1px solid #C1440E',
      borderRadius: '20px',
      padding: '8px 20px',
      color: '#F2EDE6',
      fontSize: '13px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      pointerEvents: 'none'
    }
  };

  return (
    <div style={s.container}>
      {isDrawing && (
        <div style={s.drawingIndicator}>
          📍 Mode Dessin : Cliquez sur la carte pour tracer la zone du signalement. Double-cliquez pour valider.
        </div>
      )}

      {loading && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 10,
          background: 'rgba(6, 4, 3, 0.8)', border: '0.5px solid rgba(242,237,230,0.1)',
          borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: '#E8B87A'
        }}>
          Chargement des zones...
        </div>
      )}

      <MapContainer
        center={[31.6295, -7.9811]}
        zoom={13}
        style={s.mapContainer}
      >
        <MapController center={[31.6295, -7.9811]} zoom={13} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {zones.map((zone) => (
          <Polygon
            key={zone.id}
            positions={zone.coordonnees_geojson}
            pathOptions={{
              color: zone.couleur || '#C1440E',
              fillColor: zone.couleur || '#C1440E',
              fillOpacity: 0.25,
              weight: 1.5,
            }}
          >
            <Tooltip sticky direction="top">
              <div style={{ fontWeight: 700 }}>{zone.nom}</div>
            </Tooltip>
          </Polygon>
        ))}

        <ZoneDrawManager
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          onShapeCreated={handleShapeCreated}
        />
      </MapContainer>

      {/* Floating report button */}
      {!isDrawing && (
        <button
          onClick={handleSignalerClick}
          style={s.floatBtn}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.03)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        >
          📍 Signaler un problème
        </button>
      )}

      {/* AuthPromptModal */}
      {showAuthModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <div style={s.tabsContainer}>
              <button
                onClick={() => { setAuthTab('login'); setAuthError(''); }}
                style={s.tabButton(authTab === 'login')}
              >
                Se connecter
              </button>
              <button
                onClick={() => { setAuthTab('register'); setAuthError(''); }}
                style={s.tabButton(authTab === 'register')}
              >
                S'inscrire
              </button>
            </div>

            <form onSubmit={handleAuthSubmit}>
              {authError && <div style={{ ...s.errorText, marginBottom: '12px' }}>{authError}</div>}

              {authTab === 'register' && (
                <div style={s.formGroup}>
                  <label style={s.label}>Nom complet</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    style={s.input}
                  />
                </div>
              )}

              <div style={s.formGroup}>
                <label style={s.label}>Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={s.input}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Mot de passe</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  style={s.input}
                />
              </div>

              <button type="submit" style={s.submitBtn}>
                {authTab === 'login' ? 'Connexion' : "Inscription"}
              </button>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                style={s.cancelBtn}
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RemarkModal (Formulaire de remarque simplifié) */}
      {showRemarkModal && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h3 style={s.modalTitle}>📝 Nouveau Signalement</h3>
            
            <form onSubmit={handleRemarkSubmit}>
              {remarkError && <div style={{ ...s.errorText, marginBottom: '12px' }}>{remarkError}</div>}

              <div style={s.formGroup}>
                <label style={s.label}>Zone associée</label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  style={s.input}
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id} style={{ background: '#0f0c09' }}>
                      {z.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Catégorie</label>
                <select
                  value={remarkCategory}
                  onChange={(e) => setRemarkCategory(e.target.value)}
                  style={s.input}
                >
                  <option value="route" style={{ background: '#0f0c09' }}>Route / Chaussée</option>
                  <option value="ecole" style={{ background: '#0f0c09' }}>École / Éducation</option>
                  <option value="hopital" style={{ background: '#0f0c09' }}>Santé / Hôpital</option>
                  <option value="parc" style={{ background: '#0f0c09' }}>Espace Vert / Parc</option>
                  <option value="autre" style={{ background: '#0f0c09' }}>Autre</option>
                </select>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Niveau d'Urgence ({remarkUrgency}/5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={remarkUrgency}
                  onChange={(e) => setRemarkUrgency(parseInt(e.target.value, 10))}
                  style={{ ...s.input, padding: '0' }}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Votre avis / Description</label>
                <textarea
                  required
                  rows="4"
                  value={remarkOpinion}
                  onChange={(e) => setRemarkOpinion(e.target.value)}
                  placeholder="Décrivez précisément le problème constaté..."
                  style={{ ...s.input, resize: 'none' }}
                />
              </div>

              <button type="submit" style={s.submitBtn}>
                Envoyer le signalement
              </button>
              <button
                type="button"
                onClick={() => { setShowRemarkModal(false); setDrawnPolygon(null); }}
                style={s.cancelBtn}
              >
                Annuler
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
