import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { getZones, createZone, updateZone, deleteZone, getRemarks } from '../../services/adminApi';
import SkeletonTable from '../SkeletonTable.jsx';
import { validateZoneName } from '../../services/validationService.js';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';

// Validate that a zone has renderable coordinates for Leaflet
const isValidCoords = (coordonnees) => {
  return (
    Array.isArray(coordonnees) &&
    coordonnees.length >= 3 &&
    coordonnees.every(
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

const ZoneRowMemo = React.memo(({ zone, remarksCount, onEdit, onDelete }) => (
  <article className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow" aria-label={`Zone ${zone.nom}`}>
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full shadow-inner" style={{ backgroundColor: zone.couleur }} aria-hidden="true"></div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{zone.nom}</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{zone.ville}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onEdit(zone)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors" aria-label={`Modifier la zone ${zone.nom}`}>Edit</button>
        <button onClick={() => onDelete(zone)} className="px-3 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-sm font-medium transition-colors" aria-label={`Supprimer la zone ${zone.nom}`}>Delete</button>
      </div>
    </div>
    
    <div className="flex gap-4 border-t border-gray-100 pt-3">
      <div className="flex-1">
        <p className="text-xs text-gray-500">Remarks</p>
        <p className="font-bold text-gray-800">{remarksCount}</p>
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">Created</p>
        <p className="font-bold text-gray-800">
          {new Date(zone.created_at).toLocaleDateString('en-GB')}
        </p>
      </div>
    </div>
  </article>
));

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

  // Load Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedZones, fetchedRemarks] = await Promise.all([
        getZones(),
        getRemarks()
      ]);
      setZones(fetchedZones.filter(z => isValidCoords(z.coordonnees)));
      setRemarks(fetchedRemarks);
    } catch (err) {
      setError("Failed to load data.");
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
    
    try {
      await createZone({
        nom: zoneName,
        couleur: zoneColor,
        coordonnees: drawnPolygon
      });
      showToast("Zone created successfully");
      setShowZoneForm(false);
      setDrawnPolygon(null);
      fetchData();
    } catch (err) {
      showToast("Failed to create zone", "error");
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
    height: isMobile ? 'auto' : '700px',
    width: '100%',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  };

  const mapStyle = {
    width: isMobile ? '100%' : '50%',
    height: isMobile ? '300px' : '100%',
    position: 'relative',
    borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
    borderBottom: isMobile ? '1px solid #e5e7eb' : 'none'
  };

  const listStyle = {
    width: isMobile ? '100%' : '50%',
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
          center={[31.6295, -8.0083]} 
          zoom={13} 
          style={{ width: '100%', height: '100%', zIndex: 10 }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          
          <ZoneDrawManager onShapeCreated={handleShapeCreated} />

          {/* Render Existing Zones */}
          {zones.map(zone => (
            <Polygon 
              key={zone.id}
              positions={zone.coordonnees}
              pathOptions={{ 
                color: zone.couleur, 
                fillColor: zone.couleur, 
                fillOpacity: 0.35,
                weight: 3
              }}
            />
          ))}
        </MapContainer>
        
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6', fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }} aria-live="polite">
          <span aria-hidden="true">📍</span> Use the toolbar on the right to draw zones.
        </div>
      </div>

      {/* SECTION B: ZONES LIST */}
      <div style={listStyle} role="region" aria-label="Liste des zones">
        <div style={{ padding: '24px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>Existing Zones</h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Manage defined perimeters for Marrakech</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {loading ? (
            <div style={{ padding: '32px' }}><SkeletonTable rows={3} columns={4} /></div>
          ) : zones.length === 0 ? (
            <EmptyState 
              icon="📍"
              title="Aucune zone définie"
              subtitle="L'administrateur doit créer les zones officielles"
            />
          ) : (
            zones.map(zone => (
              <ZoneRowMemo 
                key={zone.id} 
                zone={zone} 
                remarksCount={remarksCountByZone[zone.id] || 0} 
                onEdit={openEditModal} 
                onDelete={openDeleteModal} 
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL 1: Create Zone */}
      {showZoneForm && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center" style={{ padding: isMobile ? '0' : '16px', alignItems: isMobile ? 'flex-end' : 'center' }} role="presentation">
          <div ref={createModalRef} className="bg-white shadow-xl" style={{ width: '100%', maxWidth: '450px', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: '24px' }} role="dialog" aria-modal="true" aria-labelledby="create-zone-title">
            <h3 id="create-zone-title" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Name New Zone</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="create-zone-name" className="block text-sm font-bold text-gray-700 mb-1">Zone Name <span aria-hidden="true">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    id="create-zone-name"
                    type="text" 
                    value={zoneName} 
                    onChange={handleZoneNameChange}
                    onBlur={handleZoneNameBlur}
                    style={zoneNameTouched ? (zoneNameError ? validationStyles.errorInput : validationStyles.validInput) : {}}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Gueliz Center"
                    required
                    aria-required="true"
                    aria-invalid={zoneNameTouched && !!zoneNameError}
                    aria-describedby={zoneNameTouched && zoneNameError ? 'create-zone-name-error' : 'create-zone-name-counter'}
                  />
                  {zoneNameTouched && !zoneNameError && <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div id="create-zone-name-error" style={validationStyles.errorText} role="alert">{zoneNameTouched && zoneNameError ? zoneNameError : ''}</div>
                  <div id="create-zone-name-counter" style={validationStyles.charCounter} aria-live="polite">{zoneName.length}/50</div>
                </div>
              </div>
              <div>
                <label htmlFor="create-zone-color" className="block text-sm font-bold text-gray-700 mb-1">Zone Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    id="create-zone-color"
                    type="color" 
                    value={zoneColor} 
                    onChange={e => setZoneColor(e.target.value)}
                    className="w-12 h-12 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    aria-label="Sélectionner la couleur de la zone"
                  />
                  <span className="text-gray-500 text-sm uppercase">{zoneColor}</span>
                  <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end" style={{ flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button onClick={cancelDrawing} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100" style={{ minHeight: isMobile ? '48px' : 'auto' }}>Cancel</button>
              <button onClick={handleCreateZone} disabled={!!zoneNameError || !zoneName || !zoneColor} aria-disabled={!!zoneNameError || !zoneName || !zoneColor} className={`px-5 py-2 rounded-lg font-medium shadow-md ${!!zoneNameError || !zoneName || !zoneColor ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`} style={{ minHeight: isMobile ? '48px' : 'auto' }}>Create Zone</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Zone */}
      {showEditModal && selectedZoneForEdit && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center" style={{ padding: isMobile ? '0' : '16px', alignItems: isMobile ? 'flex-end' : 'center' }} role="presentation">
          <div ref={editModalRef} className="bg-white shadow-xl" style={{ width: '100%', maxWidth: '450px', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: '24px' }} role="dialog" aria-modal="true" aria-labelledby="edit-zone-title">
            <h3 id="edit-zone-title" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Edit Zone</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="edit-zone-name" className="block text-sm font-bold text-gray-700 mb-1">Zone Name <span aria-hidden="true">*</span></label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input 
                    id="edit-zone-name"
                    type="text" 
                    value={zoneName} 
                    onChange={handleZoneNameChange}
                    onBlur={handleZoneNameBlur}
                    style={zoneNameTouched ? (zoneNameError ? validationStyles.errorInput : validationStyles.validInput) : {}}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                    aria-required="true"
                    aria-invalid={zoneNameTouched && !!zoneNameError}
                    aria-describedby={zoneNameTouched && zoneNameError ? 'edit-zone-name-error' : 'edit-zone-name-counter'}
                  />
                  {zoneNameTouched && !zoneNameError && <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div id="edit-zone-name-error" style={validationStyles.errorText} role="alert">{zoneNameTouched && zoneNameError ? zoneNameError : ''}</div>
                  <div id="edit-zone-name-counter" style={validationStyles.charCounter} aria-live="polite">{zoneName.length}/50</div>
                </div>
              </div>
              <div>
                <label htmlFor="edit-zone-color" className="block text-sm font-bold text-gray-700 mb-1">Zone Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    id="edit-zone-color"
                    type="color" 
                    value={zoneColor} 
                    onChange={e => setZoneColor(e.target.value)}
                    className="w-12 h-12 p-1 border border-gray-300 rounded-lg cursor-pointer"
                    aria-label="Sélectionner la couleur de la zone"
                  />
                  <span className="text-gray-500 text-sm uppercase">{zoneColor}</span>
                  <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end" style={{ flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button onClick={() => { setShowEditModal(false); previousFocusRef.current?.focus(); }} className="px-5 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100" style={{ minHeight: isMobile ? '48px' : 'auto' }}>Cancel</button>
              <button onClick={handleUpdateZone} disabled={!!zoneNameError || !zoneName || !zoneColor} aria-disabled={!!zoneNameError || !zoneName || !zoneColor} className={`px-5 py-2 rounded-lg font-medium shadow-md ${!!zoneNameError || !zoneName || !zoneColor ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`} style={{ minHeight: isMobile ? '48px' : 'auto' }}>Update Zone</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {showDeleteModal && zoneToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center" style={{ padding: isMobile ? '0' : '16px', alignItems: isMobile ? 'flex-end' : 'center' }} role="presentation">
          <div ref={deleteModalRef} className="bg-white shadow-xl" style={{ width: '100%', maxWidth: '450px', borderRadius: isMobile ? '24px 24px 0 0' : '16px', padding: '24px' }} role="alertdialog" aria-modal="true" aria-labelledby="delete-zone-title" aria-describedby="delete-zone-desc">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl" aria-hidden="true">!</div>
              <h3 id="delete-zone-title" className="text-xl font-bold text-gray-900 mb-2">Delete Zone?</h3>
              <p id="delete-zone-desc" className="text-gray-600">
                Are you sure you want to delete <strong className="text-gray-900">{zoneToDelete.nom}</strong>? 
                This will also delete all remarks associated with this zone. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 justify-center" style={{ flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button onClick={() => { setShowDeleteModal(false); previousFocusRef.current?.focus(); }} className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 border border-gray-200" style={{ minHeight: isMobile ? '48px' : 'auto' }}>Cancel</button>
              <button onClick={handleDeleteZone} className="px-6 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200" style={{ minHeight: isMobile ? '48px' : 'auto' }}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.message && (
        <div role="status" aria-live="polite" className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg font-bold text-white z-[9999] transition-all animate-in slide-in-from-bottom-4 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminZonesTab;
