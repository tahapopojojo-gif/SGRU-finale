import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getZonesWithStats, getValidatedRemarks } from '../../services/urbanApi';
import SkeletonTable from '../SkeletonTable.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';

// Fix Leaflet's default marker icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MARRAKECH_CENTER = [31.6295, -7.9811];
const MARRAKECH_ZOOM = 13;

const CAT_EMOJI = {
  hopital: '🏥', ecole: '🏫', parc: '🌳', route: '🛣️', autre: '❓'
};
const CAT_LABEL = {
  hopital: 'Hôpital', ecole: 'École', parc: 'Parc', route: 'Route', autre: 'Autre'
};
const STATUT_COLOR = {
  urgent: '#EF4444', actif: '#3B82F6', planifie: '#F59E0B'
};

// Urgency badge helper
function UrgencyBadge({ value }) {
  let bg, color;
  if (value >= 4) { bg = '#FEE2E2'; color = '#991B1B'; }
  else if (value >= 2.5) { bg = '#FEF9C3'; color = '#854D0E'; }
  else { bg = '#DCFCE7'; color = '#166534'; }
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, background: bg, color, fontSize: 12, fontWeight: 700 }}>
      {value} / 5
    </span>
  );
}

// Map legend component (positioned as Leaflet control via custom element)
function MapLegend() {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.setAttribute('role', 'region');
      div.setAttribute('aria-label', 'Légende de la carte');
      div.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);font-size:12px;line-height:1.6;';
      div.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:#374151">Légende</div>
        <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#EF4444;margin-right:6px;" aria-hidden="true"></span>Urgent</div>
        <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3B82F6;margin-right:6px;" aria-hidden="true"></span>Actif</div>
        <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#F59E0B;margin-right:6px;" aria-hidden="true"></span>Planifié</div>
        <div style="margin-top:6px;border-top:1px solid #f3f4f6;padding-top:6px;">
          🏥 Hôpital &nbsp; 🏫 École<br/>🌳 Parc &nbsp;&nbsp;&nbsp; 🛣️ Route &nbsp; ❓ Autre
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    return () => legend.remove();
  }, [map]);

  return null;
}

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

// Zone polygon wrapper — handles per-polygon events
function ZonePolygon({ zone, isSelected, onZoneClick }) {
  const fillOpacity = isSelected === null ? 0.3 : (isSelected ? 0.6 : 0.1);
  const [hovered, setHovered] = useState(false);

  // Guard: skip rendering if coordonnees are missing or malformed
  if (!isValidCoords(zone.coordonnees)) return null;

  const pathOptions = {
    color: zone.couleur || '#6366F1',
    fillColor: zone.couleur || '#6366F1',
    fillOpacity: hovered && !isSelected ? 0.5 : fillOpacity,
    weight: isSelected ? 3 : 2,
  };

  return (
    <Polygon
      positions={zone.coordonnees}
      pathOptions={pathOptions}
      eventHandlers={{
        click: () => onZoneClick(zone),
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
      }}
    >
      <Tooltip sticky direction="top">
        <div style={{ fontWeight: 700 }}>{zone.nom}</div>
        <div style={{ fontSize: 12 }}>{zone.totalRemarks} remarques</div>
      </Tooltip>
    </Polygon>
  );
}

// Simulated heatmap using large semi-transparent circles
function HeatmapLayer({ remarks }) {
  return (
    <>
      {remarks.map(r => (
        <CircleMarker
          key={`heat-${r.id}`}
          center={[r.latitude, r.longitude]}
          radius={20 + (r.urgency * 5)}
          pathOptions={{
            color: 'transparent',
            fillColor: '#EF4444',
            fillOpacity: 0.04 * r.urgency,
          }}
        />
      ))}
    </>
  );
}

export default function UrbanCarteTab({ onSwitchTab }) {
  const { selectedZone, setSelectedZone, clearSelectedZone } = useUrbanZone();
  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [displayMode, setDisplayMode] = useState('markers');
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  const loadZones = useCallback(async () => {
    try {
      const data = await getZonesWithStats();
      // Pre-filter to only zones with valid coordinates to prevent Leaflet crashes
      setZones(data.filter(z => isValidCoords(z.coordonnees)));
    } catch (err) {
      console.error('Error loading zones:', err);
    }
  }, []);

  const loadRemarks = useCallback(async (zoneId) => {
    try {
      const data = await getValidatedRemarks(zoneId);
      setRemarks(data);
    } catch (err) {
      console.error('Error loading remarks:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadZones(), loadRemarks(null)]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    loadRemarks(selectedZone?.id ?? null);
  }, [selectedZone, loadRemarks]);

  const handleZoneClick = (zone) => {
    if (selectedZone?.id === zone.id) {
      clearSelectedZone();
    } else {
      setSelectedZone(zone);
    }
  };

  const getStyles = (isMobile) => ({
    page: { fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
    banner: (color) => ({
      padding: isMobile ? '12px 16px' : '12px 20px',
      borderRadius: 8,
      background: 'white',
      borderLeft: `4px solid ${color || '#6366F1'}`,
      marginBottom: 16,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: isMobile ? '12px' : '0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }),
    bannerText: { fontWeight: 600, fontSize: 14, color: '#374151' },
    clearBtn: {
      background: 'transparent', border: '1px solid #e5e7eb',
      padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 600, color: '#ef4444',
      width: isMobile ? '100%' : 'auto',
      minHeight: isMobile ? '48px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    },
    toggleRow: { display: 'flex', gap: 8, marginBottom: 12 },
    toggleBtn: (active) => ({
      flex: isMobile ? 1 : 'none',
      padding: isMobile ? '12px 16px' : '8px 20px', 
      borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
      border: active ? '1px solid #6366F1' : '1px solid #e5e7eb',
      background: active ? '#6366F1' : 'white',
      color: active ? 'white' : '#374151',
      transition: 'all 0.2s',
      minHeight: isMobile ? '48px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
    }),
    mapPanelRow: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 },
    mapWrapper: { flex: 1, borderRadius: 12, overflow: 'hidden', minHeight: isMobile ? 350 : 500, position: 'relative', width: '100%' },
    infoPanel: {
      width: isMobile ? '100%' : 280, flexShrink: 0, background: 'white', borderRadius: 12,
      padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex', flexDirection: 'column', gap: 12,
      boxSizing: 'border-box'
    },
    zoneName: (couleur) => ({
      fontSize: 20, fontWeight: 900, color: couleur, marginBottom: 4
    }),
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
    statLabel: { fontSize: 13, color: '#6b7280', fontWeight: 500 },
    urgentBadge: { padding: '3px 10px', borderRadius: 20, background: '#FEE2E2', color: '#991B1B', fontSize: 12, fontWeight: 700 },
    actionBtn: (bg, color) => ({
      width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: bg, color, fontWeight: 700, fontSize: 13, textAlign: 'center',
      minHeight: isMobile ? '48px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }),
    instructionPanel: { textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 12, width: isMobile ? '100%' : 280, boxSizing: 'border-box' },
    popupGrid: { display: 'grid', gap: 4 },
    popupRow: { fontSize: 13 },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#6b7280' },
  });

  const s = useMemo(() => getStyles(isMobile), [isMobile]);

  if (loading) {
    return <div style={{padding: '24px'}}><SkeletonTable rows={10} columns={3} /></div>;
  }

  if (zones.length === 0) {
    return (
      <EmptyState 
        icon="📍"
        title="Aucune zone définie"
        subtitle="L'administrateur doit créer les zones officielles"
      />
    );
  }

  return (
    <div style={s.page}>
      {/* Selected Zone Banner */}
      {selectedZone ? (
        <div style={s.banner(selectedZone.couleur)} role="status" aria-live="polite">
          <span style={s.bannerText}>
            <span aria-hidden="true">📍</span> Zone sélectionnée : <strong>{selectedZone.nom}</strong> — {selectedZone.totalRemarks} remarques
          </span>
          <button style={s.clearBtn} onClick={clearSelectedZone} aria-label="Effacer la sélection de zone">✕ Effacer</button>
        </div>
      ) : (
        <div style={s.banner('#6366F1')} role="status">
          <span style={s.bannerText}><span aria-hidden="true">🗺️</span> Toutes les zones affichées — cliquez sur une zone pour filtrer</span>
        </div>
      )}

      {/* Display Mode Toggle */}
      <div style={s.toggleRow} role="radiogroup" aria-label="Mode d'affichage de la carte">
        <button style={s.toggleBtn(displayMode === 'markers')} onClick={() => setDisplayMode('markers')} role="radio" aria-checked={displayMode === 'markers'} aria-label="Affichage par marqueurs"><span aria-hidden="true">🗺️</span> Markers</button>
        <button style={s.toggleBtn(displayMode === 'heatmap')} onClick={() => setDisplayMode('heatmap')} role="radio" aria-checked={displayMode === 'heatmap'} aria-label="Affichage carte de chaleur"><span aria-hidden="true">🔥</span> Heatmap</button>
      </div>

      {/* Map + Info Panel Row */}
      <div style={s.mapPanelRow}>
        {/* Map */}
        <div style={s.mapWrapper} role="region" aria-label="Carte interactive des zones urbaines">
          <MapContainer
            center={MARRAKECH_CENTER}
            zoom={MARRAKECH_ZOOM}
            style={{ height: '100%', minHeight: isMobile ? 350 : 500, width: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapLegend />

            {/* Zone Polygons */}
            {zones.map(zone => (
              <ZonePolygon
                key={zone.id}
                zone={zone}
                isSelected={selectedZone ? (selectedZone.id === zone.id) : null}
                onZoneClick={handleZoneClick}
              />
            ))}

            {/* Remark Markers */}
            {displayMode === 'markers' && remarks.map(r => (
              r.latitude && r.longitude ? (
                <CircleMarker
                  key={r.id}
                  center={[r.latitude, r.longitude]}
                  radius={8}
                  pathOptions={{
                    color: STATUT_COLOR[r.statut] || '#6b7280',
                    fillColor: STATUT_COLOR[r.statut] || '#6b7280',
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={s.popupGrid}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{r.zone_nom}</div>
                      <div style={s.popupRow}><span aria-hidden="true">{CAT_EMOJI[r.categorie] || '❓'}</span> {CAT_LABEL[r.categorie] || r.categorie}</div>
                      <div style={s.popupRow}>⚡ Urgence : <strong>{r.urgency}/5</strong></div>
                      <div style={s.popupRow}>👤 {r.profile}</div>
                      <div style={{ ...s.popupRow, color: '#9ca3af', fontSize: 11 }}>
                        {new Date(r.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null
            ))}

            {/* Heatmap Layer (simulated) */}
            {displayMode === 'heatmap' && <HeatmapLayer remarks={remarks.filter(r => r.latitude && r.longitude)} />}
          </MapContainer>
        </div>

        {/* Zone Info Panel */}
        <aside style={s.infoPanel} aria-label="Détails de la zone sélectionnée" aria-live="polite">
          {selectedZone ? (
            <>
              <div>
                <div style={s.zoneName(selectedZone.couleur)}>{selectedZone.nom}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Marrakech</div>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Total Remarques</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#1e293b' }}>{selectedZone.totalRemarks}</span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Cas Urgents</span>
                <span style={s.urgentBadge}><span aria-hidden="true">🚨</span> {selectedZone.urgentCount}</span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Catégorie Dom.</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  <span aria-hidden="true">{CAT_EMOJI[selectedZone.dominantCategory?.toLowerCase()] || '📌'}</span> {selectedZone.dominantCategory}
                </span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Urgence Moy.</span>
                <UrgencyBadge value={selectedZone.avgUrgency} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button style={s.actionBtn(selectedZone.couleur + '18', selectedZone.couleur)} onClick={() => onSwitchTab && onSwitchTab('statistiques')} aria-label={`Voir les statistiques pour ${selectedZone.nom}`}>
                  Voir les statistiques →
                </button>
                <button style={s.actionBtn('#f3f4f6', '#374151')} onClick={clearSelectedZone} aria-label="Désélectionner la zone">
                  ✕ Désélectionner
                </button>
              </div>
            </>
          ) : (
            <div style={s.instructionPanel}>
              <div style={{ fontSize: 36, marginBottom: 12 }} aria-hidden="true">🗺️</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 8 }}>
                Sélectionnez une zone
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>
                Cliquez sur une zone colorée sur la carte pour afficher ses détails et filtrer tous les onglets.
              </div>

              {/* Zone quick-select list */}
              <nav style={{ marginTop: 20, textAlign: 'left' }} aria-label="Sélection rapide de zone">
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Zones disponibles
                </div>
                {zones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    aria-label={`Sélectionner la zone ${z.nom}, ${z.totalRemarks} remarques`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 12px', borderRadius: 6,
                      border: '1px solid #f3f4f6', background: 'white', cursor: 'pointer',
                      marginBottom: 6, textAlign: 'left', fontSize: 13, fontWeight: 600,
                      color: '#374151',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: z.couleur, flexShrink: 0 }} aria-hidden="true"></span>
                    {z.nom}
                    <span style={{ marginLeft: 'auto', color: '#9ca3af', fontWeight: 400 }}>{z.totalRemarks}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
