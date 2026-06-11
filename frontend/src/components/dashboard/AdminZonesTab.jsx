import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet.heat';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, useMapEvents, CircleMarker, Popup } from 'react-leaflet';
import { Thermometer, AlertTriangle, MapPin } from 'lucide-react';
import { getZones, updateZone, deleteZone, getRemarks, createZone } from '../../services/adminApi';
import useResponsive from '../../hooks/useResponsive';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';

const CATEGORIES = [
  { value: 'road', label: 'Route', color: '#FF6B6B' },
  { value: 'lighting', label: 'Éclairage', color: '#FFE66D' },
  { value: 'waste', label: 'Déchets', color: '#A8E6CF' },
  { value: 'water', label: 'Eau', color: '#74B9FF' },
  { value: 'parks', label: 'Parcs', color: '#55EFC4' },
  { value: 'schools', label: 'Écoles', color: '#A29BFE' },
  { value: 'transport', label: 'Transport', color: '#FD79A8' },
  { value: 'other', label: 'Autre', color: '#DFE6E9' },
];

const PRIORITY_OPTIONS = [
  { value: 'faible', label: 'Faible', color: '#22c55e' },
  { value: 'modere', label: 'Modéré', color: '#f59e0b' },
  { value: 'critique', label: 'Critique', color: '#ef4444' },
];

const isValidCoords = (geojson) => (
  Array.isArray(geojson) &&
  geojson.length >= 3 &&
  geojson.every(c => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]))
);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getCategoryMeta = (value) => {
  const key = (value || 'other').toLowerCase();
  return CATEGORIES.find(c => c.value === key) || CATEGORIES[CATEGORIES.length - 1];
};

const getRemarkCoords = (remark) => {
  const lat = parseFloat(remark.latitude);
  const lng = parseFloat(remark.longitude);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : [lat, lng];
};

const pointInPolygon = (point, polygon) => {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};

const isRemarkAssigned = (remark, zonesList) => {
  if (remark.zone_id) return true;
  const coords = getRemarkCoords(remark);
  if (!coords) return false;
  return zonesList.some(z => isValidCoords(z.coordonnees_geojson) && pointInPolygon(coords, z.coordonnees_geojson));
};

const getSeverityColor = (avg) => {
  if (avg >= 3.5) return '#ef4444';
  if (avg >= 2.5) return '#f59e0b';
  return '#22c55e';
};

const suggestPriority = (avg) => {
  if (avg >= 3.5) return 'critique';
  if (avg >= 2.5) return 'modere';
  return 'faible';
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';

const getWeeklyTrend = (zoneId, remarks) => {
  const now = Date.now();
  const day = 86400000;
  const thisWeek = remarks.filter(r => r.zone_id === zoneId && now - new Date(r.created_at).getTime() < 7 * day).length;
  const lastWeek = remarks.filter(r => r.zone_id === zoneId && now - new Date(r.created_at).getTime() >= 7 * day && now - new Date(r.created_at).getTime() < 14 * day).length;
  if (!lastWeek && !thisWeek) return 0;
  if (!lastWeek) return 100;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
};

function MapResizeHandler({ isActive }) {
  const map = useMap();
  useEffect(() => {
    if (!isActive) return;
    const refresh = () => map.invalidateSize({ animate: false });
    refresh();
    const t = setTimeout(refresh, 200);
    return () => clearTimeout(t);
  }, [isActive, map]);
  return null;
}

function MapBoundsController({ bounds, minZoom }) {
  const map = useMap();
  useEffect(() => {
    if (minZoom) map.setMinZoom(minZoom);
    if (bounds) map.setMaxBounds(bounds);
  }, [map, bounds, minZoom]);
  return null;
}

function AutoFitBounds({ remarks, zones, isActive, dataReady, cityCenter, cityZoom }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!dataReady) fittedRef.current = false;
  }, [dataReady]);

  useEffect(() => {
    if (!isActive || !dataReady) return;
    if (fittedRef.current) return;

    const points = remarks.map(getRemarkCoords).filter(Boolean);
    const zonePts = zones.flatMap(z => z.coordonnees_geojson || []);
    const all = [...points, ...zonePts];

    if (all.length > 0) {
      map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15, animate: false });
    } else if (cityCenter) {
      map.setView(cityCenter, cityZoom, { animate: false });
    }
    fittedRef.current = true;
  }, [map, remarks, zones, isActive, dataReady, cityCenter, cityZoom]);

  return null;
}

function HeatmapLayer({ remarks }) {
  const map = useMap();
  useEffect(() => {
    const heatPoints = remarks.map(r => [r.latitude, r.longitude, (parseInt(r.urgency, 10) || 3) / 5]);
    if (!heatPoints.length) return;
    const heatLayer = window.L.heatLayer(heatPoints, {
      radius: 60,
      blur: 40,
      maxZoom: 16,
      max: 1.0,
      gradient: {
        0.0: 'rgba(0,0,0,0)',
        0.2: 'rgba(0,255,255,0.3)',
        0.4: 'rgba(0,255,0,0.5)',
        0.6: 'rgba(255,255,0,0.7)',
        0.8: 'rgba(255,100,0,0.85)',
        1.0: 'rgba(255,0,0,1)',
      },
    }).addTo(map);
    return () => map.removeLayer(heatLayer);
  }, [map, remarks]);
  return null;
}

function ZoneDrawManager({ isDrawing, color, onShapeCreated, onCancel, onDrawerReady }) {
  const map = useMapEvents({});

  useEffect(() => {
    let drawer;
    if (isDrawing) {
      drawer = new L.Draw.Polygon(map, {
        shapeOptions: { color: '#C1440E', fillOpacity: 0.04, weight: 2.5 },
        showArea: false,
        allowIntersection: true,
        repeatMode: false,
        touchIcon: new L.DivIcon({
          iconSize: new L.Point(20, 20),
          className: 'leaflet-div-icon leaflet-editing-icon',
        }),
      });
      drawer.enable();
      onDrawerReady?.(drawer);
    } else {
      onDrawerReady?.(null);
    }
    return () => {
      if (drawer) drawer.disable();
      onDrawerReady?.(null);
    };
  }, [isDrawing, map, color, onDrawerReady]);

  useEffect(() => {
    const handleCreated = (e) => {
      if (e.layerType !== 'polygon') return;
      const layer = e.layer;
      const latLngs = layer.getLatLngs();
      const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs;
      const data = ring.map(ll => [ll.lat, ll.lng]);
      map.removeLayer(layer);
      onShapeCreated(data);
    };
    map.on(L.Draw.Event.CREATED, handleCreated);
    return () => map.off(L.Draw.Event.CREATED, handleCreated);
  }, [map, onShapeCreated]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return null;
}

function CategoryBreakdownBar({ remarks }) {
  if (!remarks.length) return null;
  const counts = {};
  remarks.forEach(r => {
    const cat = (r.categorie || r.building_type || 'other').toLowerCase();
    counts[cat] = (counts[cat] || 0) + 1;
  });
  const total = remarks.length;
  const segments = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ height: '4px', borderRadius: '2px', overflow: 'hidden', display: 'flex', marginTop: '6px' }}>
      {segments.map(([cat, count]) => (
        <div key={cat} style={{
          width: `${(count / total) * 100}%`,
          background: getCategoryMeta(cat).color,
          minWidth: count > 0 ? '4px' : 0,
        }} title={`${getCategoryMeta(cat).label}: ${count}`} />
      ))}
    </div>
  );
}

const formatApiError = (err, fallback) => {
  const data = err?.response?.data;
  if (data?.errors) {
    return Object.values(data.errors).flat().join(' · ');
  }
  if (data?.message) return data.message;
  return fallback;
};

const AdminZonesTab = ({ zoneFocus = null, onZoneFocusClear, startDrawZone = false, onDrawZoneStarted, isActive = true }) => {
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const userCity = user?.city || 'marrakech';
  const cityConfig = getCityMapConfig(userCity);

  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [showThermals, setShowThermals] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('Toutes');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [selectedZone, setSelectedZone] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingPolygon, setPendingPolygon] = useState(null);
  const [createForm, setCreateForm] = useState({ nom: '', priority: 'modere', notes: '', couleur: '#C1440E' });
  const [pendingInsideRemarks, setPendingInsideRemarks] = useState([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [nameWarning, setNameWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: null, type: 'success' });
  const mapRef = useRef(null);
  const drawerRef = useRef(null);

  const handleDrawerReady = useCallback((drawer) => {
    drawerRef.current = drawer;
  }, []);

  const [zoneName, setZoneName] = useState('');
  const [zoneColor, setZoneColor] = useState('#C1440E');
  const [selectedZoneForEdit, setSelectedZoneForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: 'success' }), 3500);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setDataReady(false);
    try {
      const [resZones, resRemarks] = await Promise.all([getZones(), getRemarks()]);
      const fetchedZones = unwrap(resZones);
      const fetchedRemarks = unwrap(resRemarks);
      const cityZones = userCity
        ? fetchedZones.filter(z => z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim())
        : fetchedZones;
      setZones(cityZones.filter(z => isValidCoords(z.coordonnees_geojson)));
      setRemarks(fetchedRemarks);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données.');
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
      setDataReady(true);
    }
  }, [showToast, userCity]);

  useEffect(() => {
    if (isActive) fetchData();
  }, [isActive, fetchData]);

  useEffect(() => {
    if (startDrawZone) {
      setIsDrawing(true);
      setPendingPolygon(null);
      onDrawZoneStarted?.();
    }
  }, [startDrawZone, onDrawZoneStarted]);

  useEffect(() => {
    if (!zoneFocus?.lat || !zoneFocus?.lng) return;
    const map = mapRef.current;
    if (map) map.flyTo([zoneFocus.lat, zoneFocus.lng], 16, { animate: true });
    setShowThermals(false);
    showToast('Signalement ciblé — dessinez une zone autour de ce cluster');
  }, [zoneFocus, showToast]);

  const remarksInCity = useMemo(() => {
    const zoneIds = zones.map(z => z.id);
    return remarks.filter(r => {
      if (r.zone_id && zoneIds.includes(r.zone_id)) return true;
      const coords = getRemarkCoords(r);
      if (!coords || !cityConfig.bounds) return !!r.zone_id;
      const [[south, west], [north, east]] = cityConfig.bounds;
      return coords[0] >= south && coords[0] <= north && coords[1] >= west && coords[1] <= east;
    });
  }, [remarks, zones, cityConfig.bounds]);

  const visibleRemarks = useMemo(() => {
    let list = remarksInCity;
    if (urgencyFilter === 'low') list = list.filter(r => (parseInt(r.urgency, 10) || 3) <= 2);
    else if (urgencyFilter === 'medium') list = list.filter(r => (parseInt(r.urgency, 10) || 3) === 3);
    else if (urgencyFilter === 'high') list = list.filter(r => (parseInt(r.urgency, 10) || 3) >= 4);
    return list;
  }, [remarksInCity, urgencyFilter]);

  const remarksCountByZone = useMemo(() => {
    const counts = {};
    remarksInCity.forEach(r => {
      if (r.zone_id) counts[r.zone_id] = (counts[r.zone_id] || 0) + 1;
      else {
        zones.forEach(z => {
          const c = getRemarkCoords(r);
          if (c && isValidCoords(z.coordonnees_geojson) && pointInPolygon(c, z.coordonnees_geojson)) {
            counts[z.id] = (counts[z.id] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [remarksInCity, zones]);

  const remarksByZone = useMemo(() => {
    const byZone = {};
    zones.forEach(z => { byZone[z.id] = []; });
    remarksInCity.forEach(r => {
      if (r.zone_id && byZone[r.zone_id]) byZone[r.zone_id].push(r);
      else {
        const c = getRemarkCoords(r);
        zones.forEach(z => {
          if (c && isValidCoords(z.coordonnees_geojson) && pointInPolygon(c, z.coordonnees_geojson)) {
            byZone[z.id].push(r);
          }
        });
      }
    });
    return byZone;
  }, [remarksInCity, zones]);

  const avgUrgencyByZone = useMemo(() => {
    const avg = {};
    Object.entries(remarksByZone).forEach(([id, list]) => {
      if (!list.length) { avg[id] = 0; return; }
      avg[id] = (list.reduce((s, r) => s + (parseInt(r.urgency, 10) || 3), 0) / list.length).toFixed(1);
    });
    return avg;
  }, [remarksByZone]);

  const assignedCount = useMemo(() => remarksInCity.filter(r => isRemarkAssigned(r, zones)).length, [remarksInCity, zones]);
  const unassignedCount = remarksInCity.length - assignedCount;
  const coveragePct = remarksInCity.length ? Math.round((assignedCount / remarksInCity.length) * 100) : 0;
  const criticalZonesCount = zones.filter(z => parseFloat(avgUrgencyByZone[z.id] || 0) >= 3.5 || (remarksCountByZone[z.id] || 0) >= 6).length;

  const duplicateZoneNames = useMemo(() => {
    const counts = {};
    zones.forEach(z => { const k = z.nom.toLowerCase().trim(); counts[k] = (counts[k] || 0) + 1; });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [zones]);

  const dynamicAlert = useMemo(() => {
    const candidates = zones.map(z => {
      const trend = getWeeklyTrend(z.id, remarksInCity);
      const avg = parseFloat(avgUrgencyByZone[z.id]) || 0;
      const count = remarksCountByZone[z.id] || 0;
      if (count === 0) return null;
      const score = trend + avg * 10;
      if (trend >= 20 || (trend >= 15 && avg >= 3.5) || (trend >= 50)) {
        return { nom: z.nom, trend, avg, score };
      }
      return null;
    }).filter(Boolean);
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];
    return `${top.nom} : +${top.trend}% signalements cette semaine, urgence moy. ${top.avg} — intervention recommandée.`;
  }, [zones, remarksInCity, avgUrgencyByZone, remarksCountByZone]);

  const sortedZones = useMemo(() => {
    let zList = [...zones];
    if (zoneFilter === 'Critiques') {
      zList = zList.filter(z => parseFloat(avgUrgencyByZone[z.id] || 0) >= 3.5 || (remarksCountByZone[z.id] || 0) >= 6);
    } else if (zoneFilter === 'Cette semaine') {
      const now = Date.now();
      zList = zList.filter(z => remarksInCity.some(r => {
        const inZone = r.zone_id === z.id || (getRemarkCoords(r) && pointInPolygon(getRemarkCoords(r), z.coordonnees_geojson));
        return inZone && now - new Date(r.created_at).getTime() < 7 * 86400000;
      }));
    }
    return zList.sort((a, b) => (remarksCountByZone[b.id] || 0) - (remarksCountByZone[a.id] || 0));
  }, [zones, remarksCountByZone, zoneFilter, remarksInCity, avgUrgencyByZone]);

  const handleZoneClick = useCallback((zone) => {
    setSelectedZone(zone);
    const center = zone.coordonnees_geojson.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    const c = [center[0] / zone.coordonnees_geojson.length, center[1] / zone.coordonnees_geojson.length];
    mapRef.current?.flyTo(c, 15, { animate: true });
  }, []);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1&accept-language=fr`,
        { headers: { 'Accept-Language': 'fr' } },
      );
      const data = await res.json();
      const a = data.address || {};
      const place = a.neighbourhood || a.suburb || a.quarter || a.city_district
        || a.village || a.town || a.residential || a.hamlet || a.road;
      if (place) return place;
      return (data.display_name || '').split(',')[0].trim();
    } catch {
      return '';
    }
  };

  const getRemarksInsidePolygon = useCallback((coords) => (
    remarksInCity.filter(r => {
      const c = getRemarkCoords(r);
      return c && pointInPolygon(c, coords);
    })
  ), [remarksInCity]);

  const handlePolygonCreated = useCallback(async (coords) => {
    setIsDrawing(false);
    setPendingPolygon(coords);
    setGeocodeLoading(true);
    setCreateForm({ nom: '', priority: 'modere', notes: '', couleur: '#C1440E' });
    setNameWarning('');

    const lat = coords.reduce((s, p) => s + p[0], 0) / coords.length;
    const lng = coords.reduce((s, p) => s + p[1], 0) / coords.length;
    const inside = getRemarksInsidePolygon(coords);
    setPendingInsideRemarks(inside);

    const avgUrg = inside.length
      ? inside.reduce((s, r) => s + (parseInt(r.urgency, 10) || 3), 0) / inside.length
      : 3;
    const priority = suggestPriority(avgUrg);
    const prioColor = PRIORITY_OPTIONS.find(p => p.value === priority)?.color || '#C1440E';
    const geoName = await reverseGeocode(lat, lng);
    const cityLabel = userCity ? userCity.charAt(0).toUpperCase() + userCity.slice(1) : '';
    const suggestedName = geoName
      ? (geoName.toLowerCase().includes(userCity?.toLowerCase() || '') ? geoName : `${geoName}${cityLabel ? `, ${cityLabel}` : ''}`)
      : `Zone ${zones.length + 1}`;

    setCreateForm({ nom: suggestedName, priority, notes: '', couleur: prioColor });
    setGeocodeLoading(false);
  }, [getRemarksInsidePolygon, zones.length, userCity]);

  const handleStartDraw = (centerRemark = null) => {
    setPendingPolygon(null);
    setPendingInsideRemarks([]);
    setCreateForm({ nom: '', priority: 'modere', notes: '', couleur: '#C1440E' });
    setGeocodeLoading(false);
    setIsDrawing(true);
    if (centerRemark) {
      const c = getRemarkCoords(centerRemark);
      if (c) mapRef.current?.flyTo(c, 16, { animate: true });
    }
  };

  const handleCancelDraw = () => {
    drawerRef.current?.disable?.();
    drawerRef.current = null;
    setIsDrawing(false);
  };

  const handleDeleteLastPoint = () => {
    if (!drawerRef.current) return;
    if (!drawerRef.current._markers || drawerRef.current._markers.length <= 0) {
      handleCancelDraw();
      return;
    }
    drawerRef.current.deleteLastVertex();
  };

  const handleClearDraw = () => {
    drawerRef.current?.disable?.();
    drawerRef.current = null;
    setIsDrawing(false);
    window.setTimeout(() => setIsDrawing(true), 0);
  };

  const handleCancelPendingZone = () => {
    setPendingPolygon(null);
    setPendingInsideRemarks([]);
    setCreateForm({ nom: '', priority: 'modere', notes: '', couleur: '#C1440E' });
    setGeocodeLoading(false);
    setSaveError(null);
  };

  const handleRedrawZone = () => {
    handleCancelPendingZone();
    handleStartDraw();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (pendingPolygon) handleCancelPendingZone();
        else if (isDrawing) handleCancelDraw();
      }
      if (e.key === 'Backspace' && isDrawing && !pendingPolygon) {
        e.preventDefault();
        handleDeleteLastPoint();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawing, pendingPolygon]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkDuplicateName = (name) => {
    const exists = zones.some(z => z.nom.toLowerCase().trim() === name.toLowerCase().trim());
    setNameWarning(exists ? 'Une zone avec ce nom existe déjà' : '');
    return exists;
  };

  const handleSaveZone = async () => {
    if (!pendingPolygon || !createForm.nom.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const lat = pendingPolygon.reduce((s, p) => s + p[0], 0) / pendingPolygon.length;
      const lng = pendingPolygon.reduce((s, p) => s + p[1], 0) / pendingPolygon.length;
      const prioColor = PRIORITY_OPTIONS.find(p => p.value === createForm.priority)?.color || createForm.couleur;
      const remarkIds = pendingInsideRemarks.map(r => r.id);
      const assignedCount = remarkIds.length;
      const result = await createZone({
        nom: createForm.nom.trim(),
        ville: userCity,
        couleur: prioColor,
        coordonnees_geojson: pendingPolygon,
        centre_lat: lat,
        centre_lng: lng,
        notes: createForm.notes.trim() || null,
        remark_ids: remarkIds,
      });
      setPendingPolygon(null);
      setPendingInsideRemarks([]);
      setCreateForm({ nom: '', priority: 'modere', notes: '', couleur: '#C1440E' });
      const notified = result?.notified_admins ?? 0;
      const parts = [];
      if (assignedCount) parts.push(`${assignedCount} signalement(s) assigné(s)`);
      if (notified) parts.push(`${notified} administrateur(s) notifié(s)`);
      showToast('Zone créée — ' + parts.join(', '));
      await fetchData();
    } catch (err) {
      console.error(err);
      const message = formatApiError(err, 'Impossible de créer la zone. Vérifiez votre connexion et réessayez.');
      setSaveError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateZone = async () => {
    if (!zoneName.trim() || zoneName.length < 2) return;
    try {
      await updateZone(selectedZoneForEdit.id, { nom: zoneName, couleur: zoneColor, ville: selectedZoneForEdit.ville, coordonnees_geojson: selectedZoneForEdit.coordonnees_geojson, centre_lat: selectedZoneForEdit.centre_lat, centre_lng: selectedZoneForEdit.centre_lng });
      showToast('Zone mise à jour');
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      showToast('Erreur de mise à jour', 'error');
    }
  };

  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      await deleteZone(zoneToDelete.id);
      showToast('Zone supprimée');
      setShowDeleteModal(false);
      fetchData();
    } catch (err) {
      showToast('Erreur de suppression', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#060403', color: '#F2EDE6', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
  .leaflet-container:focus { outline: none !important; }
  .admin-zones-map *:focus { outline: none !important; }

.zone-draw-toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(6,4,3,0.92);
  border: 0.5px solid rgba(242,237,230,0.1);
  border-radius: 8px;
  padding: 6px 10px;
  backdrop-filter: blur(12px);
  box-shadow: none !important;
  flex-wrap: wrap;
  max-width: calc(100vw - 32px);
  justify-content: center;
}

.zone-draw-toolbar__group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.zone-draw-toolbar__active {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #C1440E;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(193,68,14,0.1);
  border: 0.5px solid rgba(193,68,14,0.3);
  font-family: 'DM Sans', sans-serif;
}

.zone-draw-toolbar__divider {
  width: 0.5px;
  height: 18px;
  background: rgba(242,237,230,0.1);
  margin: 0 2px;
}

.zone-draw-toolbar__btn {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 10px !important;
  padding: 4px 8px !important;
  font-family: 'DM Sans', sans-serif !important;
  font-weight: 500 !important;
  padding: 5px 10px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: 0.5px solid rgba(242,237,230,0.12) !important;
  color: rgba(242,237,230,0.5) !important;
  box-shadow: none !important;
  text-shadow: none !important;
  white-space: nowrap !important;
}

.zone-draw-toolbar__btn:hover {
  background: rgba(255,255,255,0.06) !important;
  background-color: rgba(255,255,255,0.06) !important;
  border-color: rgba(242,237,230,0.25) !important;
  color: rgba(242,237,230,0.85) !important;
}

.zone-draw-toolbar__btn--cancel {
  border-color: rgba(239,68,68,0.3) !important;
  color: rgba(239,68,68,0.6) !important;
}

.zone-draw-toolbar__btn--cancel:hover {
  background: rgba(239,68,68,0.08) !important;
  background-color: rgba(239,68,68,0.08) !important;
  border-color: rgba(239,68,68,0.5) !important;
  color: #ef4444 !important;
}
`}</style>
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#DC2626', fontSize: '13px', marginBottom: '12px' }}>{error}</div>
      )}

      {zoneFocus && (
        <div style={{ padding: '10px 16px', marginBottom: '12px', background: 'rgba(193,68,14,0.1)', border: '0.5px solid rgba(193,68,14,0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#E8B87A', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} style={{flexShrink:0}} /> Signalement ciblé — {zoneFocus.label}</span>
          <button type="button" onClick={onZoneFocusClear} style={{ padding: '4px 10px', borderRadius: '4px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.5)', fontSize: '11px', cursor: 'pointer' }}>Fermer</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '44px', background: 'rgba(255,255,255,0.02)', borderBottom: '0.5px solid rgba(242,237,230,0.07)', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={() => setShowThermals(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer',
            background: showThermals ? 'rgba(193,68,14,0.15)' : 'rgba(255,255,255,0.04)',
            border: showThermals ? '0.5px solid rgba(193,68,14,0.5)' : '0.5px solid rgba(242,237,230,0.12)',
            color: showThermals ? '#E8B87A' : 'rgba(242,237,230,0.5)', fontSize: '12px',
          }}>
            <Thermometer size={13} style={{flexShrink:0}} />
            {!isMobile && ' Thermique'}
          </button>
          <button type="button" onClick={() => handleStartDraw()} disabled={isDrawing} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            cursor: isDrawing ? 'not-allowed' : 'pointer',
            background: isDrawing
              ? 'rgba(193,68,14,0.08)'
              : 'transparent',
            border: '0.5px solid rgba(193,68,14,0.5)',
            color: isDrawing
              ? 'rgba(193,68,14,0.45)'
              : '#C1440E',
            transition: 'all 0.2s',
            fontFamily: 'DM Sans, sans-serif',
            whiteSpace: 'nowrap',
            minWidth: isMobile ? 'auto' : '130px',
          }}
          onMouseEnter={e => {
            if (!isDrawing) {
              e.currentTarget.style.background = '#C1440E'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = '#C1440E'
            }
          }}
          onMouseLeave={e => {
            if (!isDrawing) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#C1440E'
              e.currentTarget.style.borderColor = 'rgba(193,68,14,0.5)'
            }
          }}>
            {isDrawing ? (
              <>
                <span style={{fontSize:'11px', opacity:0.7}}>✏</span>
                {!isMobile && ' Dessin en cours…'}
              </>
            ) : (
              <>＋{!isMobile && ' Nouvelle zone'}</>
            )}
          </button>
        </div>
        {!isMobile && (
        <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.45)' }}>
          Couverture : <strong style={{ color: '#E8B87A' }}>{assignedCount}/{remarksInCity.length}</strong> ({coveragePct}%)
        </div>
        )}
      </div>

      {isDrawing && (
        <div style={{ padding: '8px 16px', background: 'rgba(193,68,14,0.08)', borderBottom: '0.5px solid rgba(193,68,14,0.2)', fontSize: '12px', color: '#E8B87A' }}>
          Mode dessin actif — cliquez sur la carte pour placer les points, puis fermez sur le premier point.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 'calc(100vh - 200px)', position: 'relative' }}>
        {/* MAP */}
        <div className={`admin-zones-map${isDrawing ? ' draw-mode' : ''}`} style={{ flex: 1, height: isMobile ? '380px' : 'calc(100vh - 200px)', minHeight: '420px' }}>
          <MapContainer
            ref={mapRef}
            center={cityConfig.center}
            zoom={cityConfig.zoom}
            minZoom={cityConfig.minZoom || 11}
            maxBounds={cityConfig.bounds}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%', outline: 'none' }}
            zoomControl={false}
          >
            <MapResizeHandler isActive={isActive} />
            <MapBoundsController bounds={cityConfig.bounds} minZoom={cityConfig.minZoom} />
            <AutoFitBounds
              remarks={remarksInCity}
              zones={zones}
              isActive={isActive && !zoneFocus && !isDrawing && !pendingPolygon}
              dataReady={dataReady}
              cityCenter={cityConfig.center}
              cityZoom={cityConfig.zoom}
            />
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
              attribution="© Stadia Maps"
            />

            {zones.map(zone => {
              const avg = parseFloat(avgUrgencyByZone[zone.id] || 0);
              const fillColor = getSeverityColor(avg);
              const isSelected = selectedZone?.id === zone.id;
              return (
                <Polygon
                  key={zone.id}
                  positions={zone.coordonnees_geojson}
                  pathOptions={{
                    color: isSelected ? '#F2EDE6' : fillColor,
                    fillColor,
                    fillOpacity: 0,
                    weight: 2.5,
                  }}
                  eventHandlers={{ click: () => handleZoneClick(zone) }}
                >
                  <Tooltip permanent direction="center" className="zone-label-tooltip">
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{zone.nom}</span>
                  </Tooltip>
                </Polygon>
              );
            })}

            {showThermals && <HeatmapLayer remarks={visibleRemarks} />}

              {visibleRemarks.map(remark => {
              const coords = getRemarkCoords(remark);
              if (!coords) return null;
              const cat = getCategoryMeta(remark.categorie || remark.building_type);
              const unassigned = !isRemarkAssigned(remark, zones);

              return (
                <React.Fragment key={remark.id}>
                  <CircleMarker
                    center={coords}
                    radius={5}
                    pathOptions={{ color: '#ffffff', fillColor: cat.color, weight: 0.5, opacity: 0.6, fillOpacity: 0.85 }}
                  >
                    <Tooltip direction="top" offset={[0, -4]}>
                      <div style={{ fontSize: '11px', color: '#111' }}>
                        <strong>{cat.label}</strong><br />
                        Urgence {remark.urgency}/5 · {formatDate(remark.created_at)}
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ minWidth: '180px', fontSize: '12px' }}>
                        <strong>{cat.label}</strong>
                        <p style={{ margin: '6px 0', color: '#475569', fontSize: '11px' }}>
                          {(remark.opinion || 'Sans description').slice(0, 120)}
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#94a3b8' }}>
                          Urgence {remark.urgency}/5 · {formatDate(remark.created_at)}
                        </p>
                        <button type="button" onClick={() => handleStartDraw(remark)} style={{
                          width: '100%', padding: '6px', borderRadius: '4px', border: 'none',
                          background: '#C1440E', color: '#fff', fontSize: '11px', cursor: 'pointer',
                        }}>
                          Dessiner une zone autour
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              );
            })}

            {pendingPolygon && (
              <Polygon positions={pendingPolygon} pathOptions={{ color: '#C1440E', fillColor: '#C1440E', fillOpacity: 0.2, weight: 2, dashArray: '6 4' }} />
            )}

            <ZoneDrawManager
              isDrawing={isDrawing}
              color="#C1440E"
              onShapeCreated={handlePolygonCreated}
              onCancel={handleCancelDraw}
              onDrawerReady={handleDrawerReady}
            />
          </MapContainer>

          <div className="admin-zones-map__ui">
          {isDrawing && (
            <div className="zone-draw-toolbar">
              <div className="zone-draw-toolbar__group">
                <span className="zone-draw-toolbar__active" title="Dessin de polygone">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
                  Polygone
                </span>
              </div>
              <div className="zone-draw-toolbar__divider" />
              <button type="button" className="zone-draw-toolbar__btn" onClick={handleDeleteLastPoint} title="Supprimer le dernier point">
                ↩ Dernier point
              </button>
              <button type="button" className="zone-draw-toolbar__btn" onClick={handleClearDraw} title="Effacer et recommencer">
                🗑 Tout effacer
              </button>
              <button type="button" className="zone-draw-toolbar__btn zone-draw-toolbar__btn--cancel" onClick={handleCancelDraw}>
                ✕ Annuler
              </button>
            </div>
          )}

          <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ background: 'rgba(6,4,3,0.9)', border: '0.5px solid rgba(242,237,230,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '11px', color: 'rgba(242,237,230,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={10} style={{flexShrink:0, opacity:0.6}} /> {userCity ? userCity.charAt(0).toUpperCase() + userCity.slice(1) : 'Ville'} · {coveragePct}% couverture
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button type="button" onClick={() => mapRef.current?.zoomIn()} style={{ width: '32px', height: '32px', background: 'rgba(8,6,3,0.85)', border: '0.5px solid rgba(242,237,230,0.15)', borderRadius: '6px', color: 'rgba(242,237,230,0.7)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>+</button>
            <button type="button" onClick={() => mapRef.current?.zoomOut()} style={{ width: '32px', height: '32px', background: 'rgba(8,6,3,0.85)', border: '0.5px solid rgba(242,237,230,0.15)', borderRadius: '6px', color: 'rgba(242,237,230,0.7)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>−</button>
            <button type="button" onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const points = remarksInCity.map(getRemarkCoords).filter(Boolean);
              const zonePts = zones.flatMap(z => z.coordonnees_geojson || []);
              const all = [...points, ...zonePts];
              if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [48, 48], maxZoom: 15, animate: true });
              else map.setView(cityConfig.center, cityConfig.zoom);
            }} style={{ width: '32px', height: '32px', background: 'rgba(8,6,3,0.85)', border: '0.5px solid rgba(242,237,230,0.15)', borderRadius: '6px', color: 'rgba(242,237,230,0.7)', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} title="Ajuster la vue">⊡</button>
          </div>
          </div>
        </div>

        {/* Create zone panel — above map + sidebar */}
        {pendingPolygon && (
          <div className="admin-zones-create-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Amiri, serif', fontSize: '18px', color: '#F2EDE6' }}>Nouvelle zone</h3>
              <button type="button" onClick={handleRedrawZone} style={{ padding: '4px 8px', borderRadius: '4px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.55)', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ↻ Redessiner
              </button>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase' }}>Nom de la zone</label>
              <input
                type="text"
                value={createForm.nom}
                placeholder={geocodeLoading ? 'Recherche du quartier…' : 'Nom du quartier'}
                disabled={geocodeLoading}
                onChange={e => { setCreateForm(f => ({ ...f, nom: e.target.value })); checkDuplicateName(e.target.value); }}
                style={{ width: '100%', marginTop: '6px', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px', color: '#F2EDE6', fontSize: '13px', boxSizing: 'border-box' }}
              />
              {!geocodeLoading && createForm.nom && (
                <p style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', margin: '6px 0 0' }}>Suggestion basée sur le lieu sur la carte</p>
              )}
              {nameWarning && <p style={{
                fontSize: '11px', color: '#f59e0b',
                margin: '6px 0 0',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <AlertTriangle size={10} style={{flexShrink:0}} />
                {nameWarning}
              </p>}
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase' }}>Priorité (auto-suggérée)</label>
              <div className="admin-zones-priority-pills" style={{ marginTop: '8px' }}>
                {PRIORITY_OPTIONS.map(p => {
                  const active = createForm.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      className={`admin-zones-priority-pill${active ? ' admin-zones-priority-pill--active' : ''}`}
                      onClick={() => setCreateForm(f => ({ ...f, priority: p.value, couleur: p.color }))}
                      style={{ '--pill-color': p.color }}
                    >
                      <span className="admin-zones-priority-pill__dot" />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase' }}>Notes (optionnel)</label>
              <textarea
                value={createForm.notes}
                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                style={{ width: '100%', marginTop: '6px', padding: '9px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px', color: '#F2EDE6', fontSize: '12px', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(242,237,230,0.4)', margin: 0 }}>
              <strong style={{ color: '#E8B87A' }}>{pendingInsideRemarks.length}</strong> signalement(s) seront assignés à cette zone
            </p>
            {saveError && (
              <div className="admin-zones-save-error" role="alert">
                {saveError}
              </div>
            )}
            <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
              <button type="button" onClick={handleCancelPendingZone} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.5)', cursor: 'pointer' }}>Annuler</button>
              <button type="button" onClick={handleSaveZone} disabled={saving || geocodeLoading || !createForm.nom.trim()} style={{ flex: 2, padding: '10px', borderRadius: '6px', border: 'none', background: '#C1440E', color: '#fff', cursor: saving ? 'wait' : 'pointer', opacity: saving || geocodeLoading ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : 'Confirmer'}</button>
            </div>
          </div>
        )}

        {/* SIDEBAR */}
        <div style={{ width: isMobile ? '100%' : '290px', flexShrink: 0, borderLeft: isMobile ? 'none' : '0.5px solid rgba(242,237,230,0.07)', overflowY: 'auto', maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>Tableau de bord</div>
            <div style={{ fontSize: '16px', fontFamily: 'Amiri, serif', fontWeight: 700, marginBottom: '14px' }}>Zones · {userCity || 'Ville'}</div>

            {/* 4 KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'Signalements', value: remarksInCity.length, color: '#E8B87A' },
                { label: 'Zones critiques', value: criticalZonesCount, color: '#E8B87A' },
                { label: 'Zones total', value: zones.length, color: 'rgba(242,237,230,0.7)' },
                { label: 'Non assignés', value: unassignedCount, color: '#C1440E' },
              ].map(card => (
                <div key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '6px', padding: '10px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: card.color }} />
                  <div style={{ fontSize: '9px', color: 'rgba(242,237,230,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{card.label}</div>
                  <div style={{
                    fontSize: '20px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: '600',
                    letterSpacing: '-0.02em',
                    color: card.color,
                    lineHeight: 1,
                    marginTop: '2px',
                  }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Coverage */}
            <div style={{ marginBottom: '14px', padding: '10px', background: 'rgba(193,68,14,0.06)', border: '0.5px solid rgba(193,68,14,0.2)', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', marginBottom: '6px' }}>Couverture des signalements</div>
              <div style={{ fontSize: '13px', color: '#F2EDE6' }}>
                <strong style={{ color: '#E8B87A' }}>{assignedCount}</strong> sur <strong>{remarksInCity.length}</strong> dans une zone ({coveragePct}%)
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${coveragePct}%`, background: coveragePct >= 80 ? '#52BE80' : coveragePct >= 50 ? '#f59e0b' : '#C1440E', borderRadius: '2px' }} />
              </div>
            </div>

            {/* Interactive urgency bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                {[
                  { key: 'low', color: '#22c55e', flex: 1 },
                  { key: 'medium', color: '#f59e0b', flex: 1 },
                  { key: 'high', color: '#ef4444', flex: 1 },
                ].map(seg => (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => setUrgencyFilter(f => f === seg.key ? '' : seg.key)}
                    style={{
                      flex: seg.flex, border: 'none', cursor: 'pointer', padding: 0,
                      background: seg.color,
                      opacity: urgencyFilter && urgencyFilter !== seg.key ? 0.35 : 1,
                      outline: urgencyFilter === seg.key ? '2px solid #F2EDE6' : 'none',
                    }}
                    title={seg.key === 'low' ? 'Mineur (1-2)' : seg.key === 'medium' ? 'Significatif (3)' : 'Dangereux (4-5)'}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(242,237,230,0.4)' }}>
                <span>Faible</span><span>Moyen</span><span>Élevé</span>
              </div>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {['Toutes', 'Critiques', 'Cette semaine'].map(f => (
                <button key={f} type="button" onClick={() => setZoneFilter(f)} style={{
                  padding: '4px 10px', borderRadius: '100px', fontSize: '10px', cursor: 'pointer',
                  background: zoneFilter === f ? 'rgba(242,237,230,0.1)' : 'transparent',
                  border: zoneFilter === f ? '0.5px solid rgba(242,237,230,0.2)' : '0.5px solid rgba(242,237,230,0.05)',
                  color: zoneFilter === f ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
                }}>{f}</button>
              ))}
            </div>

            {/* Dynamic alert */}
            {dynamicAlert && (
              <div style={{ background: 'rgba(193,68,14,0.06)', border: '0.5px solid rgba(193,68,14,0.25)', borderRadius: '6px', padding: '10px', marginBottom: '14px' }}>
                <div style={{
                  fontSize: '9px', color: '#C1440E',
                  textTransform: 'uppercase', marginBottom: '4px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <AlertTriangle size={10} style={{flexShrink:0}} /> Alerte</div>
                <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.65)', lineHeight: 1.4 }}>{dynamicAlert}</div>
              </div>
            )}

            {duplicateZoneNames.size > 0 && (
              <div style={{ fontSize: '10px', color: '#f59e0b', marginBottom: '12px', padding: '8px', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={10} style={{marginRight:'4px', flexShrink:0}} /> {duplicateZoneNames.size} nom(s) de zone en double détecté(s)
              </div>
            )}

            {/* Zone list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedZones.map(z => {
                const count = remarksCountByZone[z.id] || 0;
                const trend = getWeeklyTrend(z.id, remarksInCity);
                const avgUrg = avgUrgencyByZone[z.id] || '0.0';
                const zoneRemarks = remarksByZone[z.id] || [];
                const isDup = duplicateZoneNames.has(z.nom.toLowerCase().trim());
                let severity = 'Stable';
                let sevColor = '#22c55e';
                if (parseFloat(avgUrg) >= 3.5 || count >= 6) { severity = 'Critique'; sevColor = '#ef4444'; }
                else if (parseFloat(avgUrg) >= 2.5 || count >= 3) { severity = 'Modéré'; sevColor = '#f59e0b'; }

                return (
                  <div
                    key={z.id}
                    onClick={() => handleZoneClick(z)}
                    style={{
                      background: selectedZone?.id === z.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: selectedZone?.id === z.id ? '0.5px solid rgba(242,237,230,0.2)' : '0.5px solid rgba(242,237,230,0.05)',
                      borderRadius: '6px', padding: '10px', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{z.nom}{isDup ? ' ⚠' : ''}</span>
                      <span style={{ fontSize: '9px', color: sevColor, background: `${sevColor}18`, padding: '2px 6px', borderRadius: '4px' }}>{severity}</span>
                    </div>
                    <CategoryBreakdownBar remarks={zoneRemarks} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: 'rgba(242,237,230,0.4)' }}>
                      <span>{count} signalements · Urg. moy. {avgUrg}</span>
                      <span style={{ color: trend > 0 ? '#ef4444' : trend < 0 ? '#22c55e' : 'inherit' }}>
                        {trend > 0 ? `↗ +${trend}%` : trend < 0 ? `↘ ${trend}%` : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedZoneForEdit(z);
                          setZoneName(z.nom);
                          setZoneColor(z.couleur);
                          setShowEditModal(true);
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '5px 12px',
                          borderRadius: '4px',
                          border: '0.5px solid rgba(242,237,230,0.15)',
                          background: 'transparent',
                          color: 'rgba(242,237,230,0.5)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(242,237,230,0.35)'
                          e.currentTarget.style.color = '#F2EDE6'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(242,237,230,0.15)'
                          e.currentTarget.style.color = 'rgba(242,237,230,0.5)'
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoneToDelete(z);
                          setShowDeleteModal(true);
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '5px 12px',
                          borderRadius: '4px',
                          border: '0.5px solid rgba(239,68,68,0.35)',
                          background: 'transparent',
                          color: 'rgba(239,68,68,0.65)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)'
                          e.currentTarget.style.color = '#ef4444'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                          e.currentTarget.style.color = 'rgba(239,68,68,0.65)'
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
              {sortedZones.length === 0 && !loading && (
                <p style={{ fontSize: '12px', color: 'rgba(242,237,230,0.35)', textAlign: 'center', padding: '20px' }}>Aucune zone pour ce filtre</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && selectedZoneForEdit && (
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowEditModal(false)}>
          <div role="dialog" onClick={e => e.stopPropagation()} style={{ background: '#0f0c09', maxWidth: '400px', width: '100%', borderRadius: '12px', padding: '24px', border: '0.5px solid rgba(242,237,230,0.1)' }}>
            <h3 style={{ margin: '0 0 16px', color: '#F2EDE6' }}>Modifier la zone</h3>
            <input type="text" value={zoneName} onChange={e => setZoneName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '8px', color: '#F2EDE6', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.6)', cursor: 'pointer' }}>Annuler</button>
              <button type="button" onClick={handleUpdateZone} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#C1440E', color: '#fff', cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && zoneToDelete && (
        <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setShowDeleteModal(false)}>
          <div role="alertdialog" onClick={e => e.stopPropagation()} style={{ background: '#0f0c09', maxWidth: '380px', width: '100%', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '0.5px solid rgba(242,237,230,0.1)' }}>
            <p style={{ color: '#F2EDE6', marginBottom: '8px' }}>Supprimer <strong>{zoneToDelete.nom}</strong> ?</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} style={{ padding: '8px 20px', borderRadius: '6px', border: '0.5px solid rgba(242,237,230,0.15)', background: 'transparent', color: 'rgba(242,237,230,0.6)', cursor: 'pointer' }}>Annuler</button>
              <button type="button" onClick={handleDeleteZone} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {toast.message && (
        <div className={`admin-zones-toast admin-zones-toast--${toast.type}${pendingPolygon ? ' admin-zones-toast--panel-open' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminZonesTab;
