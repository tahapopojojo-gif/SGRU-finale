import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { useAuth } from '../../context/AuthContext';
import { getZonesWithStats, getValidatedRemarks } from '../../services/urbanApi';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';
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

// Forces Leaflet to recalculate container size after mount
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

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
      div.style.cssText = 'background:rgba(8,6,3,0.9);padding:12px 14px;border-radius:8px;border:0.5px solid rgba(242,237,230,0.08);backdrop-filter:blur(8px);font-size:12px;line-height:1.8;';
      div.innerHTML = `
        <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(242,237,230,0.22);margin-bottom:10px;font-weight:600;">Légende</div>
        <div style="color:rgba(242,237,230,0.45);font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#EF4444;margin-right:6px;" aria-hidden="true"></span>Urgent</div>
        <div style="color:rgba(242,237,230,0.45);font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#3B82F6;margin-right:6px;" aria-hidden="true"></span>Actif</div>
        <div style="color:rgba(242,237,230,0.45);font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#F59E0B;margin-right:6px;" aria-hidden="true"></span>Planifié</div>
        <div style="margin-top:8px;border-top:0.5px solid rgba(242,237,230,0.08);padding-top:8px;color:rgba(242,237,230,0.35);font-size:10px;">
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

// Zone polygon wrapper — handles per-polygon events
function ZonePolygon({ zone, isSelected, onZoneClick }) {
  const fillOpacity = isSelected === null ? 0.3 : (isSelected ? 0.6 : 0.1);
  const [hovered, setHovered] = useState(false);

  // Guard: skip rendering if coordonnees are missing or malformed
  if (!isValidCoords(zone.coordonnees_geojson)) return null;

  const pathOptions = {
    color: zone.couleur || '#6366F1',
    fillColor: zone.couleur || '#6366F1',
    fillOpacity: hovered && !isSelected ? 0.5 : fillOpacity,
    weight: isSelected ? 3 : 2,
  };

  return (
    <Polygon
      positions={zone.coordonnees_geojson}
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
  const { user } = useAuth();
  const { selectedZone, setSelectedZone, clearSelectedZone } = useUrbanZone();

  // Get city-locked map config from user.city
  const cityConfig = getCityMapConfig(user?.city);
  const initialCenter = cityConfig.center;
  const initialZoom   = cityConfig.zoom;
  const cityBounds    = cityConfig.bounds;
  const cityMinZoom   = cityConfig.minZoom;
  const userCity = user?.city?.toLowerCase() || null;

  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [displayMode, setDisplayMode] = useState('markers');
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  const loadZones = useCallback(async () => {
    try {
      const response = await getZonesWithStats(userCity);
      const data = unwrap(response);
      // Pre-filter to only zones with valid coordinates to prevent Leaflet crashes
      setZones(data.filter(z => isValidCoords(z.coordonnees_geojson)));
    } catch (err) {
      console.error('Error loading zones:', err);
    }
  }, [userCity]);

  const loadRemarks = useCallback(async (zoneId) => {
    try {
      // Pass userCity when loading all remarks (no zone selected)
      const cityFilter = zoneId ? null : userCity;
      const response = await getValidatedRemarks(zoneId, cityFilter);
      const data = unwrap(response);
      setRemarks(data);
    } catch (err) {
      console.error('Error loading remarks:', err);
    }
  }, [userCity]);

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
    page: { fontFamily: "'DM Sans', sans-serif", color: '#F2EDE6' },
    banner: (color) => ({
      padding: isMobile ? '12px 16px' : '12px 20px',
      borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderLeft: `4px solid ${color || '#C1440E'}`,
      marginBottom: 16,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: isMobile ? '12px' : '0',
    }),
    bannerText: { fontWeight: 600, fontSize: 14, color: '#F2EDE6' },
    clearBtn: {
      background: 'transparent', border: '0.5px solid rgba(242,237,230,0.12)',
      padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
      fontSize: 13, fontWeight: 500, color: '#ef4444',
      width: isMobile ? '100%' : 'auto',
      minHeight: isMobile ? '48px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'DM Sans, sans-serif',
    },
    toggleRow: { display: 'flex', gap: 8, marginBottom: 12 },
    toggleBtn: (active) => ({
      flex: isMobile ? 1 : 'none',
      padding: '7px 14px',
      borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
      border: active ? 'none' : '0.5px solid rgba(242,237,230,0.12)',
      background: active ? '#C1440E' : 'transparent',
      color: active ? '#fff' : 'rgba(242,237,230,0.5)',
      transition: 'all 0.2s',
      minHeight: isMobile ? '44px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
      fontFamily: 'DM Sans, sans-serif',
    }),
    mapPanelRow: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 },
    mapWrapper: {
      flex: 1,
      width: '100%',
      height: '420px',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '0.5px solid rgba(242,237,230,0.08)',
      background: '#080604',
      position: 'relative',
    },
    infoPanel: {
      width: isMobile ? '100%' : 280,
      flexShrink: 0,
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: 10,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      boxSizing: 'border-box'
    },
    zoneName: (couleur) => ({
      fontSize: 18, fontWeight: 700, color: couleur, marginBottom: 4
    }),
    statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid rgba(242,237,230,0.08)' },
    statLabel: { fontSize: 13, color: 'rgba(242,237,230,0.4)', fontWeight: 500 },
    urgentBadge: { padding: '3px 10px', borderRadius: 20, background: 'rgba(193,68,14,0.15)', color: '#C1440E', fontSize: 12, fontWeight: 700, border: '0.5px solid rgba(193,68,14,0.3)' },
    actionBtn: (bg, color) => ({
      width: '100%', padding: '10px 16px', borderRadius: 8,
      border: '0.5px solid rgba(242,237,230,0.08)',
      cursor: 'pointer',
      background: bg, color: color || '#F2EDE6', fontWeight: 500, fontSize: 13, textAlign: 'center',
      minHeight: isMobile ? '44px' : 'auto',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: 'DM Sans, sans-serif',
    }),
    instructionPanel: {
      textAlign: 'center', padding: '32px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: 10,
      width: isMobile ? '100%' : 280, boxSizing: 'border-box'
    },
    popupGrid: { display: 'grid', gap: 4 },
    popupRow: { fontSize: 13 },
    loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'rgba(242,237,230,0.4)' },
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
            center={initialCenter}
            zoom={initialZoom}
            minZoom={cityMinZoom}
            maxBounds={cityBounds}
            maxBoundsViscosity={1.0}
            style={{ width: '100%', height: '100%', zIndex: 1 }}
            scrollWheelZoom={true}
          >
            <InvalidateSize />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {/* Force map to city center and respect bounds on mount */}
            <MapController center={initialCenter} zoom={initialZoom} bounds={cityBounds} minZoom={cityMinZoom} />
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
                <div style={{ fontSize: 12, color: 'rgba(242,237,230,0.35)' }}>{selectedZone.ville || 'Marrakech'}</div>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Total Remarques</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, fontSize: 18, color: '#E8B87A' }}>{selectedZone.totalRemarks}</span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Cas Urgents</span>
                <span style={s.urgentBadge}><span aria-hidden="true">🚨</span> {selectedZone.urgentCount}</span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Catégorie Dom.</span>
                <span style={{ fontWeight: 500, fontSize: 13, color: '#F2EDE6' }}>
                  <span aria-hidden="true">{CAT_EMOJI[selectedZone.dominantCategory?.toLowerCase()] || '📌'}</span> {selectedZone.dominantCategory}
                </span>
              </div>

              <div style={s.statRow}>
                <span style={s.statLabel}>Urgence Moy.</span>
                <UrgencyBadge value={selectedZone.avgUrgency} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button style={s.actionBtn('rgba(193,68,14,0.15)', '#C1440E')} onClick={() => onSwitchTab && onSwitchTab('statistiques')} aria-label={`Voir les statistiques pour ${selectedZone.nom}`}>
                  Voir les statistiques →
                </button>
                <button style={s.actionBtn('transparent', 'rgba(242,237,230,0.4)')} onClick={clearSelectedZone} aria-label="Désélectionner la zone">
                  ✕ Désélectionner
                </button>
              </div>
            </>
          ) : (
            <div style={s.instructionPanel}>
              <div style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">🗺️</div>
              <div style={{ fontWeight: 500, fontSize: 14, color: '#F2EDE6', marginBottom: 8 }}>
                Sélectionnez une zone
              </div>
              <div style={{ fontSize: 12, color: 'rgba(242,237,230,0.4)', lineHeight: 1.5 }}>
                Cliquez sur une zone colorée sur la carte pour afficher ses détails et filtrer tous les onglets.
              </div>

              {/* Zone quick-select list */}
              <nav style={{ marginTop: 14, textAlign: 'left' }} aria-label="Sélection rapide de zone">
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(242,237,230,0.22)', margin: '14px 0 8px', fontWeight: 600 }}>
                  Zones disponibles
                </div>
                {zones.map(z => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZone(z)}
                    aria-label={`Sélectionner la zone ${z.nom}, ${z.totalRemarks} remarques`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 0',
                      border: 'none',
                      borderBottom: '0.5px solid rgba(242,237,230,0.05)',
                      background: 'transparent', cursor: 'pointer',
                      textAlign: 'left', fontSize: 12, fontWeight: 400,
                      color: 'rgba(242,237,230,0.6)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F2EDE6'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,237,230,0.6)'}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: z.couleur, flexShrink: 0 }} aria-hidden="true"></span>
                    {z.nom}
                    <span style={{ marginLeft: 'auto', color: 'rgba(242,237,230,0.3)', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>{z.totalRemarks}</span>
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
