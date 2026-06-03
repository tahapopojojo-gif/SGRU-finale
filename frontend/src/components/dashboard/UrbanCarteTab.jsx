import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { useAuth } from '../../context/AuthContext';
import { getZonesWithStats, getValidatedRemarks } from '../../services/urbanApi';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';
import SkeletonTable from '../SkeletonTable.jsx';
import useResponsive from '../../hooks/useResponsive';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValidCoords = (geojson) =>
  Array.isArray(geojson) && geojson.length >= 3 &&
  geojson.every(c => Array.isArray(c) && c.length === 2 &&
    typeof c[0] === 'number' && typeof c[1] === 'number' &&
    !isNaN(c[0]) && !isNaN(c[1]));

const getCenter = (coords) => ([
  coords.reduce((s, p) => s + p[0], 0) / coords.length,
  coords.reduce((s, p) => s + p[1], 0) / coords.length,
]);

const COLOR_PALETTE = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#14b8a6', // teal
];

const CAT_LABEL = {
  route: 'Route', eclairage: 'Éclairage', parc: 'Parc',
  ecole: 'École', hopital: 'Hôpital', autre: 'Autre',
};

const CAT_EMOJI = {
  route: '🛣️', eclairage: '💡', parc: '🌳',
  ecole: '🏫', hopital: '🏥', autre: '❓',
};

const getDensityColor = (count) =>
  count >= 6 ? '#ef4444' : count >= 3 ? '#f59e0b' : '#22c55e';

const getDensityLabel = (count) =>
  count >= 6 ? 'Critique' : count >= 3 ? 'Modéré' : 'Calme';

const getMonthlyTrend = (zoneId, remarks) => {
  const now = new Date();
  return [2, 1, 0].map(monthsAgo => {
    const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    return remarks.filter(r => {
      const d = new Date(r.created_at);
      return r.zone_id === zoneId &&
        d.getMonth() === target.getMonth() &&
        d.getFullYear() === target.getFullYear();
    }).length;
  });
};

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const getMonthLabels = () => {
  const now = new Date();
  return [2, 1, 0].map(ago => {
    const d = new Date(now.getFullYear(), now.getMonth() - ago, 1);
    return MONTH_NAMES[d.getMonth()];
  });
};

// ── Map sub-components ───────────────────────────────────────────────────────

function MapController({ center, zoom, bounds, minZoom }) {
  const map = useMap();
  useEffect(() => {
    if (minZoom) map.setMinZoom(minZoom);
    if (bounds) map.setMaxBounds(bounds);
    if (center && zoom) map.setView(center, zoom, { animate: false });
  }, [map, center, zoom, bounds, minZoom]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}





function CityBadge({ city }) {
  return (
    <div style={{
      position: 'absolute', bottom: 14, left: 14, zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(8,6,3,0.88)', backdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(242,237,230,0.1)',
      borderRadius: 100, padding: '5px 12px',
      fontSize: 11, color: 'rgba(242,237,230,0.5)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: '#C1440E',
        display: 'inline-block', animation: 'ucpulse 2s infinite',
      }} />
      <span style={{ fontWeight: 500 }}>
        🔒 {city ? city.charAt(0).toUpperCase() + city.slice(1) : 'Maroc'} · Vue analytique
      </span>
      <style>{`@keyframes ucpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}`}</style>
    </div>
  );
}

// ── Zone polygon ─────────────────────────────────────────────────────────────

function ZonePolygon({ zone, isSelected, remarkCount, onClick, heatmapOn }) {
  const [hovered, setHovered] = useState(false);
  if (!isValidCoords(zone.coordonnees_geojson)) return null;

  const densityColor = getDensityColor(remarkCount);
  const baseOpacity = isSelected === null ? 0.2 : (isSelected ? 0.4 : 0.1);

  return (
    <Polygon
      positions={zone.coordonnees_geojson}
      pathOptions={{
        color: densityColor,
        fillColor: densityColor,
        fillOpacity: heatmapOn ? 0.35 : (isSelected ? 0.4 : 0.15),
        weight: isSelected ? 2.5 : 1.5,
      }}
      eventHandlers={{
        click: () => onClick(zone),
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
      }}
    >
      <Tooltip sticky direction="top">
        <div style={{ fontWeight: 700, fontSize: 13 }}>{zone.nom}</div>
        <div style={{ fontSize: 11, color: '#555' }}>
          {remarkCount} signalement{remarkCount !== 1 ? 's' : ''}
        </div>
      </Tooltip>
    </Polygon>
  );
}

// ── Sparkline component ──────────────────────────────────────────────────────

function MiniSparkline({ data, labels }) {
  const max = Math.max(...data, 1);
  const barH = 28;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: barH + 14 }}>
      {data.map((v, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 9, fontFamily: 'DM Mono, monospace', color: '#E8B87A' }}>{v}</span>
          <div style={{
            width: 18, height: Math.max((v / max) * barH, 2), borderRadius: 3,
            background: i === data.length - 1
              ? 'linear-gradient(180deg, #C1440E, rgba(193,68,14,0.4))'
              : 'rgba(242,237,230,0.08)',
            transition: 'height 0.5s ease',
          }} />
          <span style={{ fontSize: 8, color: 'rgba(242,237,230,0.25)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function UrbanCarteTab({ onSwitchTab }) {
  const { user } = useAuth();
  const { setSelectedZone: setContextZone } = useUrbanZone();
  const [selectedZone, setSelectedZone] = useState(null);
  const { isMobile } = useResponsive();

  // City config
  const userCity = user?.city?.toLowerCase()?.trim() || null;
  const cityConfig = getCityMapConfig(user?.city);
  const { center: initialCenter, zoom: initialZoom, bounds: cityBounds, minZoom: cityMinZoom } = cityConfig;

  // State
  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const mapRef = useRef(null);

  const categoryColors = useMemo(() => {
    const uniqueCats = [
      ...new Set(
        remarks.map(r => r.categorie?.toLowerCase().trim() || 'autre')
      )
    ].sort();

    const map = {};
    uniqueCats.forEach((cat, i) => {
      map[cat] = COLOR_PALETTE[i % COLOR_PALETTE.length];
    });
    return map;
  }, [remarks]);

  const getCatColor = useCallback((cat) => {
    if (!cat) return '#94a3b8';
    return categoryColors[cat.toLowerCase().trim()] || '#94a3b8';
  }, [categoryColors]);

  // ── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getZonesWithStats(),
      getValidatedRemarks(),
    ]).then(([zRes, rRes]) => {
      const allZones = unwrap(zRes);
      const allRemarks = unwrap(rRes);

      // Filter to user's city
      const cityZones = userCity
        ? allZones.filter(z => z.ville?.toLowerCase()?.trim() === userCity)
        : allZones;

      // Deduplicate + validate coords
      const unique = cityZones
        .filter((z, i, self) => i === self.findIndex(t => t.id === z.id))
        .filter(z => isValidCoords(z.coordonnees_geojson));

      setZones(unique);
      setRemarks(allRemarks);
    }).catch(err => {
      console.error('UrbanCarteTab: data load error', err);
    }).finally(() => setLoading(false));
  }, [userCity]);

  // ── Computed data ────────────────────────────────────────────────────────

  const remarkCountByZone = useMemo(() => {
    const map = {};
    remarks.forEach(r => {
      const zid = r.zone_id;
      if (zid) map[zid] = (map[zid] || 0) + 1;
    });
    return map;
  }, [remarks]);

  const uniqueZones = useMemo(() =>
    zones.filter((z, i, self) => i === self.findIndex(t => t.id === z.id)),
    [zones]
  );

  const sortedZones = useMemo(() =>
    [...uniqueZones].sort((a, b) => (remarkCountByZone[b.id] || 0) - (remarkCountByZone[a.id] || 0)),
    [uniqueZones, remarkCountByZone]);

  const visibleRemarks = useMemo(() =>
    remarks.filter(r => r.latitude && r.longitude),
    [remarks]);

  const selectedZoneRemarks = useMemo(() => {
    if (!selectedZone) return [];
    return remarks.filter(r => r.zone_id === selectedZone.id);
  }, [selectedZone, remarks]);

  const selectedCategoryBreakdown = useMemo(() => {
    if (!selectedZone) return [];
    const counts = {};
    selectedZoneRemarks.forEach(r => {
      const cat = (r.categorie || r.category || 'autre').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = selectedZoneRemarks.length || 1;
    return Object.entries(counts)
      .map(([cat, count]) => ({ cat, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [selectedZone, selectedZoneRemarks]);

  const selectedAvgUrgency = useMemo(() => {
    if (!selectedZoneRemarks.length) return 0;
    return (selectedZoneRemarks.reduce((s, r) => s + (r.urgency || 1), 0) / selectedZoneRemarks.length).toFixed(1);
  }, [selectedZoneRemarks]);

  const selectedTrend = useMemo(() => {
    if (!selectedZone) return [0, 0, 0];
    return getMonthlyTrend(selectedZone.id, remarks);
  }, [selectedZone, remarks]);

  const monthLabels = useMemo(() => getMonthLabels(), []);

  const aiInsight = useMemo(() => {
    if (!selectedZone || !selectedCategoryBreakdown.length) return null;
    const top = selectedCategoryBreakdown[0];
    const catName = CAT_LABEL[top.cat] || top.cat;
    const urgentCount = selectedZoneRemarks.filter(r => (r.urgency || 0) >= 4).length;
    // Count months with data
    const monthsWithData = selectedTrend.filter(v => v > 0).length;
    let text = `${top.pct}% des signalements concernent ${catName} depuis ${monthsWithData || 1} mois`;
    if (urgentCount >= 3) text += ' — intervention recommandée';
    return text;
  }, [selectedZone, selectedCategoryBreakdown, selectedZoneRemarks, selectedTrend]);

  // ── Handlers ─────────────────────────────────────────────────────────────



  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 24 }}><SkeletonTable rows={8} columns={3} /></div>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#F2EDE6' }}>

      {/* ── Main layout: map + sidebar ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 14,
      }}>

        {/* ═══════════ MAP PANEL ═══════════ */}
        <div style={{
          flex: 1, minWidth: 0,
          background: 'rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(242,237,230,0.07)',
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
        }}>

          {/* Toolbar — minimal, observation label only */}
          <div style={{
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '0.5px solid rgba(242,237,230,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{
                fontSize: 11, color: 'rgba(242,237,230,0.4)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#22c55e', display: 'inline-block',
                }} />
                Carte analytique des signalements · {user?.city
                  ? user.city.charAt(0).toUpperCase() + user.city.slice(1)
                  : 'Maroc'}
              </span>

              <button
                onClick={() => setHeatmapOn(!heatmapOn)}
                style={{
                  background: heatmapOn ? 'rgba(193,68,14,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${heatmapOn ? '#C1440E' : 'rgba(242,237,230,0.1)'}`,
                  color: heatmapOn ? '#C1440E' : 'rgba(242,237,230,0.4)',
                  padding: '4px 8px', borderRadius: '4px',
                  fontSize: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                🔥 Thermique
              </button>
            </div>

            {/* Layer legend pills */}
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              {[
                { color: '#ef4444', label: 'Critique' },
                { color: '#f59e0b', label: 'Modéré' },
                { color: '#22c55e', label: 'Calme' },
              ].map(l => (
                <span key={l.label} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 10, color: 'rgba(242,237,230,0.35)',
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: l.color, display: 'inline-block',
                  }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* Map container */}
          <div style={{ height: isMobile ? 320 : 440, position: 'relative' }}>
            <MapContainer
              center={initialCenter}
              zoom={initialZoom}
              minZoom={cityMinZoom}
              maxBounds={cityBounds}
              maxBoundsViscosity={1.0}
              zoomControl={false}
              style={{ width: '100%', height: '100%', zIndex: 1 }}
              scrollWheelZoom={true}
              ref={mapRef}
            >
              <InvalidateSize />
              <MapController center={initialCenter} zoom={initialZoom} bounds={cityBounds} minZoom={cityMinZoom} />

              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
              />

              {/* Zone polygons */}
              {uniqueZones.map(zone => (
                <ZonePolygon
                  key={zone.id}
                  zone={zone}
                  remarkCount={remarkCountByZone[zone.id] || 0}
                  isSelected={selectedZone ? selectedZone.id === zone.id : null}
                  heatmapOn={heatmapOn}
                  onClick={(zone) => {
                    setSelectedZone(zone)
                    setContextZone(zone)
                    const center = getCenter(zone.coordonnees_geojson)
                    if (center && mapRef.current) {
                      mapRef.current.setView(center, 14)
                    }
                  }}
                />
              ))}

              {/* Report dots — always visible */}
              {remarks
                .filter(r => r.latitude && r.longitude)
                .map((r, i) => (
                  <CircleMarker
                    key={i}
                    center={[parseFloat(r.latitude), parseFloat(r.longitude)]}
                    radius={heatmapOn ? 8 : 5}
                    pathOptions={{
                      color: 'transparent',
                      fillColor: getCatColor(r.categorie || r.category),
                      fillOpacity: heatmapOn ? 0.75 : 0.85,
                    }}
                  >
                    <Tooltip direction="top" sticky>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#060403', textTransform: 'capitalize' }}>
                        {r.categorie || r.category || 'Autre'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#374151' }}>
                        Urgence {r.urgency || 1}/5
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))
              }

              {/* Floating controls */}
              <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 999,
              }}>
                {['+', '−'].map((icon, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const map = mapRef.current
                      if (!map) return
                      i === 0 ? map.zoomIn() : map.zoomOut()
                    }}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'rgba(6,4,3,0.88)',
                      border: '0.5px solid rgba(242,237,230,0.12)',
                      borderRadius: '8px',
                      color: '#F2EDE6',
                      fontSize: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <CityBadge city={user?.city} />
            </MapContainer>
          </div>

          {/* Bottom gradient legend bar */}
          <div style={{
            padding: '8px 14px',
            borderTop: '0.5px solid rgba(242,237,230,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 9, color: 'rgba(242,237,230,0.25)', whiteSpace: 'nowrap', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Densité</span>
            <span style={{ fontSize: 9, color: 'rgba(242,237,230,0.25)', fontFamily: 'DM Mono, monospace' }}>Faible</span>
            <div style={{
              flex: 1, height: 4, borderRadius: 3,
              background: 'linear-gradient(90deg, rgba(34,197,94,0.7) 0%, rgba(245,158,11,0.8) 50%, rgba(239,68,68,1) 100%)',
            }} />
            <span style={{ fontSize: 9, color: 'rgba(242,237,230,0.25)', fontFamily: 'DM Mono, monospace' }}>Élevée</span>
          </div>
        </div>

        {/* ═══════════ SIDE PANEL ═══════════ */}
        <aside style={{
          width: isMobile ? '100%' : 300,
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 10,
          boxSizing: 'border-box',
        }}>

          {selectedZone ? (
            /* ── Zone Selected State ─────────────────────────────────────── */
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(242,237,230,0.3)', marginBottom: '4px' }}>Zone sélectionnée</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#F2EDE6' }}>{selectedZone.nom}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedZone(null);
                    setContextZone(null);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(242,237,230,0.3)', fontSize: '16px', cursor: 'pointer' }}
                >✕</button>
              </div>

              {/* Severity badge */}
              {(() => {
                const zoneRemarks = remarks.filter(r => r.zone_id === selectedZone.id)
                const count = zoneRemarks.length
                const level = count >= 6 ? 'Critique' : count >= 3 ? 'Modéré' : 'Calme'
                const color = count >= 6 ? '#ef4444' : count >= 3 ? '#f59e0b' : '#22c55e'
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: `${color}18`, border: `0.5px solid ${color}40`, borderRadius: '20px', padding: '3px 10px', width: 'fit-content' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                    <span style={{ fontSize: '10px', color, fontWeight: 600 }}>{level}</span>
                  </div>
                )
              })()}

              {/* KPI cards */}
              {(() => {
                const zoneRemarks = remarks.filter(r => r.zone_id === selectedZone.id)
                const urgencyAvg = zoneRemarks.length
                  ? (zoneRemarks.reduce((s, r) => s + (r.urgency || 1), 0) / zoneRemarks.length).toFixed(1)
                  : '0.0'
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {[
                      { label: 'Signalements', value: zoneRemarks.length, color: '#C1440E' },
                      { label: 'Urgence moy.', value: `${urgencyAvg}/5`, color: '#E8B87A' },
                    ].map((k, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '8px', padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: k.color }} />
                        <div style={{ fontSize: '9px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{k.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#E8B87A', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Category breakdown */}
              {(() => {
                const zoneRemarks = remarks.filter(r => r.zone_id === selectedZone.id)
                const catMap = {}
                zoneRemarks.forEach(r => {
                  const cat = r.categorie?.toLowerCase() || 'autre'
                  catMap[cat] = (catMap[cat] || 0) + 1
                })
                const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
                if (!cats.length) return null
                return (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Par catégorie</div>
                    {cats.map(([cat, count]) => {
                      const pct = Math.round((count / zoneRemarks.length) * 100)
                      const color = getCatColor(cat)
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                          <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.4)', width: '60px', flexShrink: 0, textTransform: 'capitalize' }}>{cat}</span>
                          <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', width: '28px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* 3-month trend */}
              {(() => {
                const trend = getMonthlyTrend(selectedZone.id, remarks)
                const max = Math.max(...trend, 1)
                const monthNames = ['', '', '']
                const now = new Date()
                const labels = [2, 1, 0].map(i => {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                  return d.toLocaleString('fr-FR', { month: 'short' })
                })
                return (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Tendance 3 mois</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '48px' }}>
                      {trend.map((val, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ width: '100%', background: '#C1440E', borderRadius: '3px 3px 0 0', height: `${Math.round((val / max) * 36) + 4}px`, opacity: i === 2 ? 1 : 0.5 }} />
                          <span style={{ fontSize: '9px', color: 'rgba(242,237,230,0.3)' }}>{labels[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* AI insight */}
              {(() => {
                const zoneRemarks = remarks.filter(r => r.zone_id === selectedZone.id)
                if (!zoneRemarks.length) return (
                  <div style={{ background: 'rgba(193,68,14,0.05)', border: '0.5px solid rgba(193,68,14,0.15)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: '#C1440E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Analyse</div>
                    <p style={{ fontSize: '11px', color: 'rgba(242,237,230,0.45)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>Aucun signalement pour cette zone.</p>
                  </div>
                )
                const catMap = {}
                zoneRemarks.forEach(r => { const c = r.categorie?.toLowerCase() || 'autre'; catMap[c] = (catMap[c] || 0) + 1 })
                const dominant = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]
                const pct = Math.round((dominant[1] / zoneRemarks.length) * 100)
                const urgentCount = zoneRemarks.filter(r => (r.urgency || 1) >= 4).length
                const msg = `${pct}% des signalements concernent ${dominant[0]} dans cette zone.${urgentCount >= 3 ? ' Intervention recommandée.' : ''}`
                return (
                  <div style={{ background: 'rgba(193,68,14,0.05)', border: '0.5px solid rgba(193,68,14,0.15)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: '#C1440E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Analyse IA</div>
                    <p style={{ fontSize: '11px', color: 'rgba(242,237,230,0.45)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{msg}</p>
                  </div>
                )
              })()}

            </div>
          ) : (
            /* ── Default State (no zone selected) ────────────────────────── */
            <>
              {/* Header card */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(242,237,230,0.07)',
                borderRadius: 8, padding: 14,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F2EDE6', marginBottom: 4 }}>
                  Carte Analytique
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(193,68,14,0.1)',
                  border: '0.5px solid rgba(193,68,14,0.3)',
                  borderRadius: 100, padding: '3px 10px',
                  fontSize: 11, color: '#E8B87A',
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: '#C1440E', display: 'inline-block',
                    animation: 'ucpulse 2s infinite',
                  }} />
                  {user?.city
                    ? user.city.charAt(0).toUpperCase() + user.city.slice(1)
                    : 'Toutes les villes'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(242,237,230,0.3)', marginTop: 8, lineHeight: 1.5 }}>
                  Cliquez sur une zone pour explorer ses données.
                </div>
              </div>

              {/* Category legend */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(242,237,230,0.07)',
                borderRadius: '8px',
                padding: '12px 14px',
              }}>
                <div style={{
                  fontSize: '9px',
                  color: 'rgba(242,237,230,0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                }}>
                  Légende catégories
                </div>

                {Object.keys(categoryColors).length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.25)', fontStyle: 'italic' }}>
                    Aucune donnée
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {Object.entries(categoryColors).map(([cat, color]) => (
                      <div
                        key={cat}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: color,
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: '11px',
                          color: 'rgba(242,237,230,0.55)',
                          textTransform: 'capitalize',
                        }}>
                          {cat}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Zone ranking */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(242,237,230,0.07)',
                borderRadius: 8, padding: 12,
                flex: 1, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ fontSize: 10, color: 'rgba(242,237,230,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                  🔥 Zones par activité
                </div>

                <div style={{
                  flex: 1, overflowY: 'auto',
                  maxHeight: isMobile ? 'none' : 260,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(242,237,230,0.08) transparent',
                }}>
                  {sortedZones.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'rgba(242,237,230,0.25)', textAlign: 'center', padding: 20 }}>
                      Aucune zone disponible
                    </div>
                  ) : (
                    sortedZones.map((zone, idx) => {
                      const count = remarkCountByZone[zone.id] || 0;
                      const maxCount = remarkCountByZone[sortedZones[0]?.id] || 1;
                      const densityColor = getDensityColor(count);
                      const rankIcons = ['🥇', '🥈', '🥉'];

                      return (
                        <button
                          key={zone.id}
                          onClick={() => setSelectedZone(zone)}
                          aria-label={`Sélectionner ${zone.nom}, ${count} signalements`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '7px 0',
                            border: 'none',
                            borderBottom: '0.5px solid rgba(242,237,230,0.04)',
                            background: 'transparent', cursor: 'pointer',
                            textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* Rank */}
                          <span style={{ fontSize: 12, width: 18, textAlign: 'center', flexShrink: 0 }}>
                            {idx < 3 ? rankIcons[idx] : <span style={{ color: 'rgba(242,237,230,0.2)', fontSize: 11 }}>{idx + 1}</span>}
                          </span>

                          {/* Info + bar */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 11, color: '#F2EDE6', fontWeight: 500,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {zone.nom}
                            </div>
                            <div style={{
                              height: 3, background: 'rgba(255,255,255,0.06)',
                              borderRadius: 2, marginTop: 3, overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.round((count / maxCount) * 100)}%`,
                                height: '100%', borderRadius: 2,
                                background: densityColor,
                                transition: 'width 0.6s ease',
                              }} />
                            </div>
                          </div>

                          {/* Severity badge */}
                          <span style={{
                            padding: '1px 6px', borderRadius: 100, fontSize: 9, fontWeight: 600,
                            background: `${densityColor}22`, color: densityColor,
                            border: `0.5px solid ${densityColor}44`,
                            flexShrink: 0,
                          }}>
                            {getDensityLabel(count)}
                          </span>

                          {/* Count */}
                          <span style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 11,
                            color: '#E8B87A', flexShrink: 0, width: 24, textAlign: 'right',
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Gradient legend */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  paddingTop: 8, marginTop: 6,
                  borderTop: '0.5px solid rgba(242,237,230,0.05)',
                }}>
                  <span style={{ fontSize: 9, color: 'rgba(242,237,230,0.25)', fontFamily: 'DM Mono, monospace' }}>Faible</span>
                  <div style={{
                    flex: 1, height: 4, borderRadius: 3,
                    background: 'linear-gradient(90deg, rgba(34,197,94,0.7), rgba(245,158,11,0.8), rgba(239,68,68,1))',
                  }} />
                  <span style={{ fontSize: 9, color: 'rgba(242,237,230,0.25)', fontFamily: 'DM Mono, monospace' }}>Élevée</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
