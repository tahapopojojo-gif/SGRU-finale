import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap, LayersControl, ScaleControl, ZoomControl } from 'react-leaflet';
import { getZones, createZone, updateZone, deleteZone, getRemarks } from '../../services/adminApi';
import SkeletonTable from '../SkeletonTable.jsx';
import { validateZoneName } from '../../services/validationService.js';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';

// Forces the map to fly to city center on mount and enforces bounds
function MapController({ center, zoom, bounds, minZoom }) {
  const map = useMap();
  useEffect(() => {
    if (minZoom) map.setMinZoom(minZoom);
    if (bounds) map.setMaxBounds(bounds);
    if (center && zoom) {
      map.setView(center, zoom, { animate: false });
    }
  }, [map, center, zoom, bounds, minZoom]);
  return null;
}

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

// Custom Draw Manager using Leaflet.Draw directly to avoid react-leaflet-draw compatibility issues
function ZoneDrawManager({ onShapeCreated }) {
  const map = useMap();
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    let drawer;
    if (isDrawing) {
      drawer = new L.Draw.Polygon(map, {
        shapeOptions: {
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.3,
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
        layer.remove(); // Remove temp layer, we'll render from state
        setIsDrawing(false);
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      if (drawer) drawer.disable();
      map.off(L.Draw.Event.CREATED, handleCreated);
    };
  }, [isDrawing, map, onShapeCreated]);

  return (
    <div className="leaflet-top leaflet-right z-[1000] absolute right-4 top-4 mt-2 mr-2">
      <div className="leaflet-control leaflet-bar">
        {!isDrawing ? (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDrawing(true); }}
            className="bg-white hover:bg-gray-100 text-gray-700 w-[34px] h-[34px] flex items-center justify-center border-b border-gray-300"
            title="Draw a polygon"
            aria-label="Dessiner un polygone de zone"
          >
            <span style={{ fontSize: '18px' }} aria-hidden="true">⬟</span>
          </button>
        ) : (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsDrawing(false); }}
            className="bg-red-50 hover:bg-red-100 text-red-600 w-[34px] h-[34px] flex items-center justify-center font-bold text-xs"
            title="Cancel drawing"
            aria-label="Annuler le dessin"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

const AdminZonesTab = () => {
  const { isMobile } = useResponsive();
  const { user } = useAuth();
  const userCity = user?.city || null;
  // City-locked map config: bounds, center, zoom, minZoom
  const cityConfig = getCityMapConfig(userCity);

  // State from prompt requirements
  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [zoneNameError, setZoneNameError] = useState("");
  const [zoneNameTouched, setZoneNameTouched] = useState(false);
  const [zoneColor, setZoneColor] = useState("#FF5733");

  const handleZoneNameChange = (e) => {
    const name = e.target.value;
    setZoneName(name);
    const { error } = validateZoneName(name);
    setZoneNameError(error || "");
  };

  const handleZoneNameBlur = () => {
    setZoneNameTouched(true);
  };

  const validationStyles = {
    errorInput: { border: '2px solid #DC2626', backgroundColor: '#FEE2E2' },
    validInput: { border: '2px solid #10B981', backgroundColor: '#DCFCE7' },
    errorText: { color: '#DC2626', fontSize: '12px', marginTop: '4px' },
    successCheckmark: { color: '#10B981', fontSize: '16px', marginLeft: '8px' },
    charCounter: { fontSize: '12px', color: '#6B7280', marginTop: '4px' }
  };

  // Zone card container
  const zoneCardStyle = {
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s ease'
  };

  // Top row: color dot + name + action buttons
  const zoneCardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  };

  // Left side of header: color dot + name
  const zoneNameRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  // Color dot
  const colorDotStyle = (color) => ({
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: color || '#6366F1',
    flexShrink: 0,
    border: '2px solid rgba(0,0,0,0.1)'
  });

  // Zone name
  const zoneNameStyle = {
    fontSize: '15px',
    fontWeight: '600',
    color: '#111827'
  };

  // City label
  const zoneCityStyle = {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '10px',
    marginLeft: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  // Divider
  const dividerStyle = {
    height: '1px',
    backgroundColor: '#F3F4F6',
    marginBottom: '10px'
  };

  // Footer row: remarks count + date
  const zoneCardFooterStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  // Stats badge
  const statBadgeStyle = {
    fontSize: '12px',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  // Date text
  const dateTextStyle = {
    fontSize: '12px',
    color: '#9CA3AF'
  };

  // Action buttons container
  const actionButtonsStyle = {
    display: 'flex',
    gap: '8px'
  };

  // Edit button
  const editButtonStyle = {
    padding: '5px 12px',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  };

  // Delete button
  const deleteButtonStyle = {
    padding: '5px 12px',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500'
  };

  const [selectedZoneForEdit, setSelectedZoneForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ message: null, type: 'success' });

  const createModalRef = useRef(null);
  const editModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const previousFocusRef = useRef(null);
  
  const mapRef = useRef(null);

  // Generic focus trap + Escape handler for modals
  const useModalFocusTrap = (modalRef, isOpen, onClose) => {
    useEffect(() => {
      if (!isOpen || !modalRef.current) return;

      const modal = modalRef.current;
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
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
    }, [isOpen]);
  };

  useModalFocusTrap(createModalRef, showZoneForm, () => setShowZoneForm(false));
  useModalFocusTrap(editModalRef, showEditModal, () => setShowEditModal(false));
  useModalFocusTrap(deleteModalRef, showDeleteModal, () => setShowDeleteModal(false));

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: null, type: 'success' }), 3000);
  }, []);

  // Load Data — filtered to user's city
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resZones, resRemarks] = await Promise.all([
        getZones(),
        getRemarks()
      ]);
      
      const fetchedZones = unwrap(resZones);
      const fetchedRemarks = unwrap(resRemarks);

      // Filter zones to admin's assigned city
      const cityZones = userCity
        ? fetchedZones.filter(z =>
            z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim()
          )
        : fetchedZones;
      setZones(cityZones.filter(z => isValidCoords(z.coordonnees_geojson)));
      setRemarks(fetchedRemarks);
    } catch (err) {
      setError("Failed to load data.");
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, userCity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const remarksCountByZone = useMemo(() => {
    const counts = {};
    remarks.forEach(r => {
      counts[r.zone_id] = (counts[r.zone_id] || 0) + 1;
    });
    return counts;
  }, [remarks]);

  // --- Map Drawing Handlers ---
  const handleShapeCreated = useCallback((coords) => {
    setDrawnPolygon(coords);
    setZoneName("");
    setZoneNameError("Zone name is required");
    setZoneNameTouched(false);
    setZoneColor("#" + Math.floor(Math.random()*16777215).toString(16)); // Random color
    previousFocusRef.current = document.activeElement;
    setShowZoneForm(true);
  }, []);

  const cancelDrawing = () => {
    setShowZoneForm(false);
    setDrawnPolygon(null);
    previousFocusRef.current?.focus();
  };

  // --- CRUD Operations ---
  const handleCreateZone = async () => {
    if (!zoneName.trim() || zoneName.length < 3) {
      alert("Zone name is required and must be at least 3 characters.");
      return;
    }
    
    // Calculate center of polygon for backend
    let centerLat = 0, centerLng = 0;
    if (drawnPolygon && drawnPolygon.length > 0) {
      centerLat = drawnPolygon.reduce((sum, p) => sum + p[0], 0) / drawnPolygon.length;
      centerLng = drawnPolygon.reduce((sum, p) => sum + p[1], 0) / drawnPolygon.length;
    }

    try {
      await createZone({
        nom: zoneName,
        couleur: zoneColor,
        coordonnees_geojson: drawnPolygon, // Correct key for backend
        ville: userCity || 'Marrakech',
        centre_lat: centerLat,
        centre_lng: centerLng
      });
      showToast("Zone created successfully");
      setShowZoneForm(false);
      setDrawnPolygon(null);
      fetchData();
    } catch (err) {
      console.error("Zone creation error:", err.response?.data);
      showToast(err.response?.data?.message || "Failed to create zone", "error");
    }
  };

  const openEditModal = useCallback((zone) => {
    previousFocusRef.current = document.activeElement;
    setSelectedZoneForEdit(zone);
    setZoneName(zone.nom);
    setZoneNameError("");
    setZoneNameTouched(false);
    setZoneColor(zone.couleur);
    setShowEditModal(true);
  }, []);

  const handleUpdateZone = async () => {
    if (!zoneName.trim() || zoneName.length < 3) return;
    
    try {
      await updateZone(selectedZoneForEdit.id, {
        nom: zoneName,
        couleur: zoneColor
      });
      showToast("Zone updated successfully");
      setShowEditModal(false);
      setSelectedZoneForEdit(null);
      previousFocusRef.current?.focus();
      fetchData();
    } catch (err) {
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
      showToast("Failed to delete zone", "error");
    }
  };

  const mainStyle = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    height: isMobile ? 'auto' : '750px',
    width: '100%',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  };

  const mapStyle = {
    width: isMobile ? '100%' : '60%',
    height: isMobile ? '420px' : '100%',
    position: 'relative',
    borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
    borderBottom: isMobile ? '1px solid #e5e7eb' : 'none'
  };

  const listStyle = {
    width: isMobile ? '100%' : '40%',
    height: isMobile ? '400px' : '100%',
    overflowY: 'auto',
    background: '#f9fafb',
    padding: '24px'
  };

  return (
    <div style={mainStyle}>
      
      {/* SECTION A: MAP */}
      <div style={mapStyle} role="region" aria-label="Carte des zones">
        <MapContainer 
          center={cityConfig.center}
          zoom={15}
          zoomControl={false}
          minZoom={cityConfig.minZoom}
          maxBounds={cityConfig.bounds}
          maxBoundsViscosity={1.0}
          style={{ width: '100%', height: '100%', zIndex: 10 }}
          ref={mapRef}
        >
          {/* Street/Satellite layer switcher */}
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="🗺️ Plan détaillé">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="🛰️ Satellite">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="🏙️ Topo">
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                maxZoom={17}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Explicit Zoom Control to prevent duplicates */}
          <ZoomControl position="topleft" />

          {/* Scale bar for precision drawing */}
          <ScaleControl position="bottomleft" imperial={false} />

          {/* Force map to the admin's city on load and enforce bounds */}
          <MapController center={cityConfig.center} zoom={15} bounds={cityConfig.bounds} minZoom={cityConfig.minZoom} />

          <ZoneDrawManager onShapeCreated={handleShapeCreated} />

          {/* Render Existing Zones with name tooltip */}
          {zones.map(zone => (
            <Polygon 
              key={zone.id}
              positions={zone.coordonnees_geojson}
              pathOptions={{ 
                color: zone.couleur, 
                fillColor: zone.couleur, 
                fillOpacity: 0.3,
                weight: 3
              }}
            >
              <Tooltip sticky direction="top">
                <strong>{zone.nom}</strong>
              </Tooltip>
            </Polygon>
          ))}
        </MapContainer>
        
        {/* Drawing instruction bar */}
        <div style={{
          position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)',
          padding: '8px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
          color: 'white', whiteSpace: 'nowrap', pointerEvents: 'none'
        }} aria-live="polite">
          ⬟ Cliquez sur l'outil polygone → dessinez les coins de la zone → cliquez sur le 1er point pour fermer
        </div>
      </div>

      {/* SECTION B: ZONES LIST */}
      <div style={listStyle} role="region" aria-label="Liste des zones">
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: '4px'
          }}>
            Existing Zones
          </h3>
          <p style={{ 
            fontSize: '13px', 
            color: '#6B7280' 
          }}>
            {zones.length} zone(s) définie(s) 
            {user?.city ? ` pour ${user.city}` : ''}
          </p>
        </div>

        <div style={{ 
          overflowY: 'auto', 
          maxHeight: '500px',
          paddingRight: '4px'
        }}>
          {loading ? (
            <div style={{ padding: '32px' }}><SkeletonTable rows={3} columns={4} /></div>
          ) : zones.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#9CA3AF', 
              padding: '40px 20px' 
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📍</div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                Aucune zone définie
              </div>
              <div style={{ fontSize: '13px' }}>
                Dessinez une zone sur la carte pour commencer
              </div>
            </div>
          ) : (
            zones.map(zone => (
              <div key={zone.id} style={zoneCardStyle}>
                
                {/* Header: color + name + buttons */}
                <div style={zoneCardHeaderStyle}>
                  <div style={zoneNameRowStyle}>
                    <div style={colorDotStyle(zone.couleur)} />
                    <span style={zoneNameStyle}>{zone.nom}</span>
                  </div>
                  <div style={actionButtonsStyle}>
                    <button 
                      style={editButtonStyle}
                      onClick={() => openEditModal(zone)}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      style={deleteButtonStyle}
                      onClick={() => openDeleteModal(zone)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* City label */}
                <div style={zoneCityStyle}>
                  📍 {zone.ville || 'Ville non définie'}
                </div>

                {/* Divider */}
                <div style={dividerStyle} />

                {/* Footer: stats */}
                <div style={zoneCardFooterStyle}>
                  <span style={statBadgeStyle}>
                    💬 {remarksCountByZone[zone.id] || 0} remarque(s)
                  </span>
                  <span style={dateTextStyle}>
                    Créée le {
                      zone.created_at 
                        ? new Date(zone.created_at).toLocaleDateString('fr-FR')
                        : '—'
                    }
                  </span>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: Create Zone — pure inline styles, no Tailwind */}
      {showZoneForm && (
        <div
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '16px',
          }}
        >
          <div
            ref={createModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-zone-title"
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '460px',
              borderRadius: isMobile ? '24px 24px 0 0' : '16px',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <h3 id="create-zone-title" style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
              ✏️ Nommer la nouvelle zone
            </h3>

            {/* City badge */}
            <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#1E40AF', marginBottom: '20px', fontWeight: '600' }}>
              📍 Ville : <strong>{userCity ? userCity.charAt(0).toUpperCase() + userCity.slice(1) : 'Non définie'}</strong>
            </div>

            {/* Zone name */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="create-zone-name" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Nom de la zone <span aria-hidden="true">*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="create-zone-name"
                  type="text"
                  value={zoneName}
                  onChange={handleZoneNameChange}
                  onBlur={handleZoneNameBlur}
                  placeholder="ex : Gueliz Centre"
                  required
                  aria-required="true"
                  aria-invalid={zoneNameTouched && !!zoneNameError}
                  aria-describedby={zoneNameTouched && zoneNameError ? 'create-zone-name-error' : 'create-zone-name-counter'}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: '14px',
                    border: zoneNameTouched ? (zoneNameError ? '2px solid #DC2626' : '2px solid #10B981') : '1px solid #d1d5db',
                    borderRadius: '8px', outline: 'none',
                    backgroundColor: zoneNameTouched ? (zoneNameError ? '#FEF2F2' : '#F0FDF4') : '#fff',
                  }}
                />
                {zoneNameTouched && !zoneNameError && <span style={{ color: '#10B981', fontWeight: '700' }}>✓</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span id="create-zone-name-error" role="alert" style={{ color: '#DC2626', fontSize: '12px' }}>
                  {zoneNameTouched && zoneNameError ? zoneNameError : ''}
                </span>
                <span id="create-zone-name-counter" aria-live="polite" style={{ color: '#9ca3af', fontSize: '12px' }}>{zoneName.length}/50</span>
              </div>
            </div>

            {/* Zone color */}
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="create-zone-color" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Couleur de la zone
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="create-zone-color"
                  type="color"
                  value={zoneColor}
                  onChange={e => setZoneColor(e.target.value)}
                  aria-label="Sélectionner la couleur de la zone"
                  style={{ width: '48px', height: '48px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#374151', fontWeight: '600', textTransform: 'uppercase' }}>{zoneColor}</span>
                <span style={{ color: '#10B981', fontWeight: '700' }}>✓</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDrawing}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto' }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateZone}
                disabled={!!zoneNameError || !zoneName || !zoneColor}
                aria-disabled={!!zoneNameError || !zoneName || !zoneColor}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: (!!zoneNameError || !zoneName || !zoneColor) ? '#9ca3af' : '#2563EB',
                  color: 'white', fontWeight: '700', cursor: (!!zoneNameError || !zoneName || !zoneColor) ? 'not-allowed' : 'pointer',
                  fontSize: '14px', minHeight: isMobile ? '48px' : 'auto',
                  boxShadow: (!!zoneNameError || !zoneName || !zoneColor) ? 'none' : '0 4px 12px rgba(37,99,235,0.3)'
                }}
              >
                ✅ Créer la zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Zone */}
      {showEditModal && selectedZoneForEdit && (
        <div
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '16px',
          }}
        >
          <div
            ref={editModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-zone-title"
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '460px',
              borderRadius: isMobile ? '24px 24px 0 0' : '16px',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
          >
            <h3 id="edit-zone-title" style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>
              ✏️ Modifier la zone
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="edit-zone-name" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Nom de la zone <span aria-hidden="true">*</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="edit-zone-name"
                  type="text"
                  value={zoneName}
                  onChange={handleZoneNameChange}
                  onBlur={handleZoneNameBlur}
                  required
                  aria-required="true"
                  aria-invalid={zoneNameTouched && !!zoneNameError}
                  aria-describedby={zoneNameTouched && zoneNameError ? 'edit-zone-name-error' : 'edit-zone-name-counter'}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: '14px',
                    border: zoneNameTouched ? (zoneNameError ? '2px solid #DC2626' : '2px solid #10B981') : '1px solid #d1d5db',
                    borderRadius: '8px', outline: 'none',
                    backgroundColor: zoneNameTouched ? (zoneNameError ? '#FEF2F2' : '#F0FDF4') : '#fff',
                  }}
                />
                {zoneNameTouched && !zoneNameError && <span style={{ color: '#10B981', fontWeight: '700' }}>✓</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span id="edit-zone-name-error" role="alert" style={{ color: '#DC2626', fontSize: '12px' }}>{zoneNameTouched && zoneNameError ? zoneNameError : ''}</span>
                <span id="edit-zone-name-counter" aria-live="polite" style={{ color: '#9ca3af', fontSize: '12px' }}>{zoneName.length}/50</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="edit-zone-color" style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Couleur</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="edit-zone-color"
                  type="color"
                  value={zoneColor}
                  onChange={e => setZoneColor(e.target.value)}
                  aria-label="Sélectionner la couleur de la zone"
                  style={{ width: '48px', height: '48px', padding: '2px', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#374151', fontWeight: '600', textTransform: 'uppercase' }}>{zoneColor}</span>
                <span style={{ color: '#10B981', fontWeight: '700' }}>✓</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowEditModal(false); previousFocusRef.current?.focus(); }}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto' }}
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateZone}
                disabled={!!zoneNameError || !zoneName || !zoneColor}
                aria-disabled={!!zoneNameError || !zoneName || !zoneColor}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: (!!zoneNameError || !zoneName || !zoneColor) ? '#9ca3af' : '#2563EB',
                  color: 'white', fontWeight: '700', cursor: (!!zoneNameError || !zoneName || !zoneColor) ? 'not-allowed' : 'pointer',
                  fontSize: '14px', minHeight: isMobile ? '48px' : 'auto',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
                }}
              >
                💾 Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {showDeleteModal && zoneToDelete && (
        <div
          role="presentation"
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            backgroundColor: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? '0' : '16px',
          }}
        >
          <div
            ref={deleteModalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-zone-title"
            aria-describedby="delete-zone-desc"
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '420px',
              borderRadius: isMobile ? '24px 24px 0 0' : '16px',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div style={{ width: '64px', height: '64px', background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }} aria-hidden="true">
              🗑️
            </div>
            <h3 id="delete-zone-title" style={{ fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
              Supprimer la zone ?
            </h3>
            <p id="delete-zone-desc" style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Voulez-vous vraiment supprimer <strong style={{ color: '#111827' }}>{zoneToDelete.nom}</strong> ?<br/>
              Toutes les remarques associées seront supprimées. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button
                onClick={() => { setShowDeleteModal(false); previousFocusRef.current?.focus(); }}
                style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: '600', cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto' }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteZone}
                style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '14px', minHeight: isMobile ? '48px' : 'auto', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
              >
                🗑️ Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.message && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
            padding: '12px 20px', borderRadius: '12px',
            background: toast.type === 'success' ? '#16A34A' : '#DC2626',
            color: 'white', fontWeight: '700', fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminZonesTab;

