import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, CircleMarker } from 'react-leaflet';
import { getZones, updateZone, deleteZone, getRemarks } from '../../services/adminApi';
import useResponsive from '../../hooks/useResponsive';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';

// Validate that a zone has renderable coordinates for Leaflet
const isValidCoords = (geojson) => {
  return (
    Array.isArray(geojson) &&
    geojson.length >= 3 &&
    geojson.every(
      c => Array.isArray(c) && c.length === 2 &&
           typeof c[0] === 'number' && typeof c[1] === 'number' &&
           !isNaN(c[0]) && !isNaN(c[1])
    )
  );
};

// Fix Leaflet's default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Forces Leaflet to recalculate container size after mount
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Forces the map to fly to city center on mount and enforces bounds with smooth animation
function MapController({ center, zoom, bounds, minZoom }) {
  const map = useMap();

  useEffect(() => {
    if (minZoom) map.setMinZoom(minZoom);
    if (bounds) map.setMaxBounds(bounds);
  }, [map, bounds, minZoom]);

  useEffect(() => {
    if (center && zoom) {
      map.setView(center, zoom, { animate: true, duration: 0.6 });
    }
  }, [map, center, zoom]);

  return null;
}

// Helper: Compute weekly trend
const getWeeklyTrend = (zoneId, remarks) => {
  const now = Date.now();
  const day = 86400000;
  const thisWeek = remarks.filter(r => r.zone_id === zoneId && now - new Date(r.created_at).getTime() < 7 * day).length;
  const lastWeek = remarks.filter(r => r.zone_id === zoneId && now - new Date(r.created_at).getTime() >= 7 * day && now - new Date(r.created_at).getTime() < 14 * day).length;
  if (!lastWeek && !thisWeek) return 0;
  if (!lastWeek) return 100;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
};

const AdminZonesTab = () => {
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const userCity = user?.city || null;
  const cityConfig = getCityMapConfig(userCity);

  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);

  // States for Map logic
  const [showThermals, setShowThermals] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('Toutes'); // Toutes | Critiques | Cette semaine
  const [selectedZone, setSelectedZone] = useState(null);
  const [mapCenter, setMapCenter] = useState(cityConfig?.center || [31.6295, -7.9811]);
  const [mapZoom, setMapZoom] = useState(cityConfig?.zoom || 13);
  const mapRef = useRef(null);

  // States retained for edit/delete modals
  const [zoneName, setZoneName] = useState("");
  const [zoneColor, setZoneColor] = useState("#FF5733");
  const [selectedZoneForEdit, setSelectedZoneForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: null, type: 'success' });

  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Sync with cityConfig changes
  useEffect(() => {
    if (cityConfig) {
      setMapCenter(cityConfig.center);
      setMapZoom(cityConfig.zoom);
    }
  }, [cityConfig]);

  const getPolygonCenter = useCallback((coords) => {
    if (!coords || coords.length === 0) return null;
    const lat = coords.reduce((sum, p) => sum + p[0], 0) / coords.length;
    const lng = coords.reduce((sum, p) => sum + p[1], 0) / coords.length;
    return [lat, lng];
  }, []);

  const handleZoneClick = useCallback((zone) => {
    setSelectedZone(zone);
    const center = getPolygonCenter(zone.coordonnees_geojson);
    if (center) {
      setMapCenter(center);
      setMapZoom(14);
    }
  }, [getPolygonCenter]);

  // Modal Focus Trap
  const useModalFocusTrap = (modalRef, isOpen, onClose) => {
    useEffect(() => {
      if (!isOpen || !modalRef.current) return;
      const modal = modalRef.current;
      const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
          previousFocusRef.current?.focus();
          return;
        }
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      };
      modal.addEventListener('keydown', handleKeyDown);
      firstFocusable?.focus();
      return () => modal.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, modalRef, onClose]);
  };

  useModalFocusTrap(editModalRef, showEditModal, () => setShowEditModal(false));
  useModalFocusTrap(deleteModalRef, showDeleteModal, () => setShowDeleteModal(false));

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: 'success' }), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resZones, resRemarks] = await Promise.all([getZones(), getRemarks()]);
      const fetchedZones = unwrap(resZones);
      const fetchedRemarks = unwrap(resRemarks);

      const cityZones = userCity
        ? fetchedZones.filter(z => z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim())
        : fetchedZones;
      setZones(cityZones.filter(z => isValidCoords(z.coordonnees_geojson)));
      setRemarks(fetchedRemarks);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, userCity]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchData(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  // Derivations
  const remarksCountByZone = useMemo(() => {
    const counts = {};
    remarks.forEach(r => { counts[r.zone_id] = (counts[r.zone_id] || 0) + 1; });
    return counts;
  }, [remarks]);

  const avgUrgencyByZone = useMemo(() => {
    const sum = {};
    const count = {};
    remarks.forEach(r => {
      sum[r.zone_id] = (sum[r.zone_id] || 0) + (parseInt(r.urgency, 10) || 3);
      count[r.zone_id] = (count[r.zone_id] || 0) + 1;
    });
    const avg = {};
    Object.keys(sum).forEach(k => { avg[k] = (sum[k] / count[k]).toFixed(1); });
    return avg;
  }, [remarks]);

  const maxZoneCount = Math.max(1, ...Object.values(remarksCountByZone));
  const criticalZonesCount = Object.values(remarksCountByZone).filter(c => c >= 6).length;

  const sortedZones = useMemo(() => {
    let zList = [...zones];
    if (zoneFilter === 'Critiques') {
      zList = zList.filter(z => (remarksCountByZone[z.id] || 0) >= 6);
    } else if (zoneFilter === 'Cette semaine') {
      const now = Date.now();
      const day = 86400000;
      zList = zList.filter(z => remarks.some(r => r.zone_id === z.id && now - new Date(r.created_at).getTime() < 7 * day));
    }
    return zList.sort((a, b) => (remarksCountByZone[b.id] || 0) - (remarksCountByZone[a.id] || 0));
  }, [zones, remarksCountByZone, zoneFilter, remarks]);

  const aiAlert = useMemo(() => {
    let highestGrowth = 0;
    let worstZone = null;
    let otherZoneGrowth = null;
    let otherZone = null;

    zones.forEach(z => {
      const trend = getWeeklyTrend(z.id, remarks);
      if (trend >= 15) {
        if (trend > highestGrowth) {
          otherZoneGrowth = highestGrowth;
          otherZone = worstZone;
          highestGrowth = trend;
          worstZone = z;
        } else if (!otherZone) {
          otherZoneGrowth = trend;
          otherZone = z;
        }
      }
    });

    if (worstZone) {
      let msg = `${worstZone.nom} signalée +${highestGrowth}% cette semaine — intervention recommandée.`;
      if (otherZone) {
        msg += ` ${otherZone.nom} en hausse modérée (+${otherZoneGrowth}%).`;
      }
      return msg;
    }
    return "Toutes les zones sont sous contrôle cette semaine.";
  }, [zones, remarks]);

  const getDensityColor = (count) => {
    if (count >= 6) return '#ef4444';
    if (count >= 3) return '#f59e0b';
    return '#22c55e';
  };

  const getUrgencyColor = (urgency) => {
    const u = parseInt(urgency, 10) || 3;
    if (u >= 4) return '#ef4444';
    if (u === 3) return '#f59e0b';
    return '#22c55e';
  };

  // Retained Handlers
  const openEditModal = useCallback((zone) => {
    previousFocusRef.current = document.activeElement;
    setSelectedZoneForEdit(zone);
    setZoneName(zone.nom);
    setZoneColor(zone.couleur);
    setShowEditModal(true);
  }, []);

  const handleUpdateZone = async () => {
    if (!zoneName.trim() || zoneName.length < 3) return;
    try {
      await updateZone(selectedZoneForEdit.id, { nom: zoneName, couleur: zoneColor });
      showToast("Zone updated successfully");
      setShowEditModal(false);
      setSelectedZoneForEdit(null);
      previousFocusRef.current?.focus();
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to update zone", "error");
    }
  };

  const openDeleteModal = useCallback((zone) => {
    previousFocusRef.current = document.activeElement;
    setZoneToDelete(zone);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      await deleteZone(zoneToDelete.id);
      showToast("Zone deleted successfully");
      setShowDeleteModal(false);
      setZoneToDelete(null);
      previousFocusRef.current?.focus();
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete zone", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', height: '100%', background: '#060403', color: '#F2EDE6', fontFamily: 'DM Sans, sans-serif' }}>
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* TOOLBAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '44px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(242,237,230,0.07)', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={() => setShowThermals(!showThermals)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '100px', cursor: 'pointer',
            background: showThermals ? 'rgba(193,68,14,0.15)' : 'transparent',
            border: showThermals ? '0.5px solid rgba(193,68,14,0.3)' : '0.5px solid rgba(242,237,230,0.1)',
            color: showThermals ? '#C1440E' : 'rgba(242,237,230,0.5)', fontSize: '11px', transition: 'all 0.2s'
          }}>
            {showThermals && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C1440E', animation: 'adpulse 2s infinite' }} />}
            Thermique
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px', color: 'rgba(242,237,230,0.6)', fontSize: '11px', cursor: 'pointer' }}>Importer</button>
          <button style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px', color: 'rgba(242,237,230,0.6)', fontSize: '11px', cursor: 'pointer' }}>Exporter</button>
          <button style={{ padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px', color: 'rgba(242,237,230,0.6)', fontSize: '11px', cursor: 'pointer' }}>Zones ▼</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '0', flex: 1, overflow: 'hidden', minHeight: 'calc(100vh - 150px)' }}>
        
        {/* Left: MAP */}
        <div style={{ flex: 1, height: isMobile ? '350px' : 'auto', minHeight: '400px', position: 'relative', background: '#080604' }}>
          <MapContainer ref={mapRef} center={mapCenter} zoom={mapZoom} minZoom={cityConfig?.minZoom || 11} maxBounds={cityConfig?.bounds} maxBoundsViscosity={1.0} style={{ width: '100%', height: '100%', zIndex: 1 }} zoomControl={false}>
            <InvalidateSize />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CartoDB" />
            <MapController center={mapCenter} zoom={mapZoom} bounds={cityConfig?.bounds} minZoom={cityConfig?.minZoom} />
            
            {zones.map((zone) => {
              const count = remarksCountByZone[zone.id] || 0;
              const polyColor = getDensityColor(count);
              return (
                <Polygon key={zone.id} positions={zone.coordonnees_geojson} pathOptions={{ color: polyColor, fillColor: polyColor, fillOpacity: selectedZone?.id === zone.id ? 0.4 : 0.15, weight: selectedZone?.id === zone.id ? 2 : 1 }} eventHandlers={{ click: () => handleZoneClick(zone) }}>
                  <Tooltip sticky direction="top">
                    <div style={{ fontWeight: 700, color: '#060403' }}>{zone.nom}</div>
                    <div style={{ fontSize: '11px', color: '#374151' }}>{count} signalements</div>
                  </Tooltip>
                </Polygon>
              );
            })}

            {showThermals && remarks.map(r => {
              const lat = parseFloat(r.latitude);
              const lng = parseFloat(r.longitude);
              if (isNaN(lat) || isNaN(lng)) return null;
              return (
                <CircleMarker key={r.id} center={[lat, lng]} radius={4} pathOptions={{ color: getUrgencyColor(r.urgency), fillColor: getUrgencyColor(r.urgency), fillOpacity: 0.8, weight: 1 }}>
                  <Tooltip><div style={{ color: '#000', fontSize: '11px' }}>Urgence: {r.urgency}</div></Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Map Badges & Controls */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(6,4,3,0.85)', backdropFilter: 'blur(4px)', border: '0.5px solid rgba(242,237,230,0.1)', borderRadius: '100px', padding: '6px 12px', fontSize: '11px', color: 'rgba(242,237,230,0.6)' }}>
              🔒 {userCity || 'Marrakesh'} · Zone verrouillée
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
             <button onClick={() => mapRef.current?.zoomIn()} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(242,237,230,0.1)', borderRadius: '6px', color: '#F2EDE6', cursor: 'pointer' }}>➕</button>
             <button onClick={() => mapRef.current?.zoomOut()} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(242,237,230,0.1)', borderRadius: '6px', color: '#F2EDE6', cursor: 'pointer' }}>➖</button>
             <button onClick={() => { if(cityConfig) { setMapCenter(cityConfig.center); setMapZoom(cityConfig.zoom); } }} style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(242,237,230,0.1)', borderRadius: '6px', color: '#F2EDE6', cursor: 'pointer', marginTop: '4px' }}>📍</button>
          </div>
        </div>

        {/* Right: SIDEBAR */}
        <div style={{ width: isMobile ? '100%' : '268px', flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : '0.5px solid rgba(242,237,230,0.07)', background: 'rgba(255,255,255,0.01)', overflowY: 'auto' }}>
          
          <div style={{ padding: '16px' }}>
            {/* Header */}
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Tableau de bord</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontFamily: 'Amiri, serif', fontWeight: 700, color: '#F2EDE6' }}>Zones · {userCity || 'Marrakesh'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(193,68,14,0.1)', border: '0.5px solid rgba(193,68,14,0.2)', borderRadius: '100px', padding: '3px 8px', fontSize: '9px', color: '#E8B87A' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#C1440E', animation: 'adpulse 2s infinite' }} />
                Admin
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '6px', padding: '10px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: '#E8B87A' }} />
                <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Signalements</div>
                <div style={{ fontSize: '18px', fontFamily: 'DM Mono, monospace', color: '#E8B87A', fontWeight: 500 }}>{remarks.length}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '6px', padding: '10px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: '#ef4444' }} />
                <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Zones critiques</div>
                <div style={{ fontSize: '18px', fontFamily: 'DM Mono, monospace', color: '#ef4444', fontWeight: 500 }}>{criticalZonesCount}</div>
              </div>
            </div>

            {/* Gradient legend */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ height: '4px', borderRadius: '2px', background: 'linear-gradient(to right, #22c55e, #f59e0b, #ef4444)', marginBottom: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(242,237,230,0.4)', fontFamily: 'DM Mono, monospace' }}>
                <span>Faible</span><span>Moyen</span><span>Élevé</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', marginBottom: '16px' }}>
              {['Toutes', 'Critiques', 'Cette semaine'].map(f => (
                <button key={f} onClick={() => setZoneFilter(f)} style={{
                  padding: '4px 10px', borderRadius: '100px', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: zoneFilter === f ? 'rgba(242,237,230,0.1)' : 'transparent',
                  border: zoneFilter === f ? '0.5px solid rgba(242,237,230,0.2)' : '0.5px solid rgba(242,237,230,0.05)',
                  color: zoneFilter === f ? '#F2EDE6' : 'rgba(242,237,230,0.4)', fontSize: '10px', transition: 'all 0.2s'
                }}>
                  {f}
                </button>
              ))}
            </div>

            {/* AI Alert Banner */}
            <div style={{ background: 'rgba(193,68,14,0.05)', border: '0.5px solid rgba(193,68,14,0.2)', borderRadius: '6px', padding: '10px', display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>🤖</div>
              <div>
                <div style={{ fontSize: '9px', color: '#C1440E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Alerte IA</div>
                <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.6)', lineHeight: 1.4, fontStyle: 'italic' }}>{aiAlert}</div>
              </div>
            </div>

            {/* Zone List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedZones.map((z) => {
                const count = remarksCountByZone[z.id] || 0;
                const trend = getWeeklyTrend(z.id, remarks);
                const avgUrg = avgUrgencyByZone[z.id] || "0.0";
                
                let severity = "Stable";
                let sevColor = "#22c55e";
                if (count >= 6) { severity = "Critique"; sevColor = "#ef4444"; }
                else if (count >= 3) { severity = "Modéré"; sevColor = "#f59e0b"; }

                return (
                  <div key={z.id} onClick={() => handleZoneClick(z)} style={{
                    background: selectedZone?.id === z.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                    border: selectedZone?.id === z.id ? '0.5px solid rgba(242,237,230,0.2)' : '0.5px solid rgba(242,237,230,0.05)',
                    borderRadius: '6px', padding: '10px', cursor: 'pointer', transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#F2EDE6' }}>{z.nom}</span>
                      <span style={{ fontSize: '9px', color: sevColor, background: `rgba(${sevColor === '#ef4444'?'239,68,68':sevColor === '#f59e0b'?'245,158,11':'34,197,94'}, 0.1)`, padding: '2px 6px', borderRadius: '4px' }}>{severity}</span>
                    </div>
                    
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '6px' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(100, (count / maxZoneCount) * 100)}%`, background: sevColor }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'rgba(242,237,230,0.4)' }}>
                      <span>{count} signalements · Urgence moy. {avgUrg}</span>
                      <span style={{ color: trend > 0 ? '#ef4444' : trend < 0 ? '#22c55e' : 'rgba(242,237,230,0.4)' }}>
                        {trend > 0 ? `↗ +${trend}%` : trend < 0 ? `↘ ${trend}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals Retained Below */}
      {showEditModal && selectedZoneForEdit && (
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px' }}>
          <div ref={editModalRef} role="dialog" aria-modal="true" style={{ background: '#0f0c09', width: '100%', maxWidth: '460px', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: '28px', border: '0.5px solid rgba(242,237,230,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F2EDE6', marginBottom: '20px' }}>✏️ Modifier la zone</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(242,237,230,0.6)', marginBottom: '6px' }}>Nom de la zone</label>
              <input type="text" value={zoneName} onChange={e=>setZoneName(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid rgba(242,237,230,0.12)', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', color: '#F2EDE6' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowEditModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.6)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleUpdateZone} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#C1440E', color: 'white', cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && zoneToDelete && (
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px' }}>
          <div ref={deleteModalRef} role="alertdialog" aria-modal="true" style={{ background: '#0f0c09', width: '100%', maxWidth: '420px', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: '28px', border: '0.5px solid rgba(242,237,230,0.1)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', color: '#F2EDE6', marginBottom: '8px' }}>Supprimer la zone ?</h3>
            <p style={{ color: 'rgba(242,237,230,0.4)', fontSize: '14px', marginBottom: '24px' }}>Voulez-vous vraiment supprimer <strong>{zoneToDelete.nom}</strong> ?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ padding: '10px 24px', borderRadius: '8px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.6)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleDeleteZone} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '12px 20px', borderRadius: '12px', background: toast.type === 'success' ? 'rgba(82,190,128,0.15)' : 'rgba(239,68,68,0.15)', border: toast.type === 'success' ? '0.5px solid rgba(82,190,128,0.3)' : '0.5px solid rgba(239,68,68,0.3)', color: toast.type === 'success' ? '#52BE80' : '#ef4444', fontSize: '14px' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminZonesTab;
