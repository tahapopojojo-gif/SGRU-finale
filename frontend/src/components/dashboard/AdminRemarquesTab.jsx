import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Truck, Lightbulb, Trash2, Droplets, Trees, School, Bus, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRemarks, getZones } from '../../services/adminApi';
import SkeletonTable from '../SkeletonTable.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { unwrap } from '../../utils/unwrap';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BACKEND_URL = 'http://localhost:8000';

const CITY_PREFIX = {
  marrakech: 'MRK', marrakesh: 'MRK', casablanca: 'CASA', rabat: 'RBT',
  fes: 'FES', tanger: 'TNG', agadir: 'AGD', meknes: 'MKN',
};

const CATEGORIES = [
  { value: 'road',      label: 'Route ou trottoir',         icon: <Truck size={12} /> },
  { value: 'lighting',  label: 'Éclairage public',          icon: <Lightbulb size={12} /> },
  { value: 'waste',     label: 'Déchets et propreté',       icon: <Trash2 size={12} /> },
  { value: 'water',     label: 'Eau ou drainage',           icon: <Droplets size={12} /> },
  { value: 'parks',     label: 'Parcs et espaces verts',    icon: <Trees size={12} /> },
  { value: 'schools',   label: 'Écoles ou bâtiments publics', icon: <School size={12} /> },
  { value: 'transport', label: 'Transports en commun',      icon: <Bus size={12} /> },
  { value: 'other',     label: 'Autre',                     icon: <MapPin size={12} /> },
];

const DURATION_LABELS = {
  days: 'Vient d\'apparaître (quelques jours)',
  months: 'Quelques mois',
  year: 'Plus d\'un an',
  always: 'Depuis longtemps',
};

const getCategoryMeta = (value) => {
  const key = (value || 'other').toLowerCase();
  return CATEGORIES.find(c => c.value === key) || CATEGORIES.find(c => c.value === 'other');
};

const formatRef = (remark, city) => {
  const prefix = CITY_PREFIX[(city || '').toLowerCase()] || 'RPT';
  return `${prefix}-${String(remark.id).padStart(5, '0')}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isInCityBounds = (remark, bounds) => {
  if (!bounds || remark.latitude == null || remark.longitude == null) return true;
  const lat = parseFloat(remark.latitude);
  const lng = parseFloat(remark.longitude);
  const [[south, west], [north, east]] = bounds;
  return lat >= south && lat <= north && lng >= west && lng <= east;
};

const getUrgencyStyle = (urgency) => {
  const u = parseInt(urgency, 10) || 1;
  if (u >= 4) return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: u === 5 ? 'Critique' : 'Dangereux' };
  if (u === 3) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', label: 'Significatif' };
  return { color: '#52BE80', bg: 'rgba(82,190,128,0.12)', border: 'rgba(82,190,128,0.35)', label: 'Mineur' };
};

function UrgencyBadge({ urgency }) {
  const style = getUrgencyStyle(urgency);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      fontSize: '11px', padding: '3px 8px', borderRadius: '100px',
      background: style.bg, border: `0.5px solid ${style.border}`, color: style.color,
    }}>
      <span style={{ display: 'inline-flex', gap: '2px' }} aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: i <= urgency ? style.color : 'rgba(242,237,230,0.15)',
          }} />
        ))}
      </span>
      {urgency}/5
    </span>
  );
}

function DetailMiniMap({ lat, lng }) {
  const center = [lat, lng];
  return (
    <div style={{ height: '180px', borderRadius: '8px', overflow: 'hidden', border: '0.5px solid rgba(242,237,230,0.1)' }}>
      <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM" />
        <Marker position={center} />
      </MapContainer>
    </div>
  );
}

function RemarkDetailPanel({ remark, city, onClose, onCreateZone, panelRef }) {
  const cat = getCategoryMeta(remark.categorie || remark.building_type);
  const zoneName = remark.zone?.nom || null;
  const lat = parseFloat(remark.latitude);
  const lng = parseFloat(remark.longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng);
  const durationKey = remark.duration || remark.residence_duration;
  const photoUrl = remark.photo_path ? `${BACKEND_URL}/storage/${remark.photo_path}` : null;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, top: '60px', background: 'rgba(0,0,0,0.45)', zIndex: 1400 }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remark-panel-title"
        style={{
          position: 'fixed', top: '60px', right: 0, bottom: 0, width: 'min(400px, 100vw)',
          background: 'rgba(8,6,3,0.98)', borderLeft: '0.5px solid rgba(242,237,230,0.1)',
          zIndex: 1500, display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.3s ease',
        }}
      >
        <div style={{ padding: '18px 20px', borderBottom: '0.5px solid rgba(242,237,230,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#E8B87A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
              {formatRef(remark, city)}
            </div>
            <h2 id="remark-panel-title" style={{ margin: 0, fontFamily: 'Amiri, serif', fontSize: '20px', color: '#F2EDE6', fontWeight: 700 }}>
              {cat.icon} {cat.label}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{
            background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(242,237,230,0.1)',
            borderRadius: '6px', width: '32px', height: '32px', color: 'rgba(242,237,230,0.5)', cursor: 'pointer',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {hasCoords && <DetailMiniMap lat={lat} lng={lng} />}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <UrgencyBadge urgency={parseInt(remark.urgency, 10) || 1} />
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.1)', color: 'rgba(242,237,230,0.55)' }}>
              {DURATION_LABELS[durationKey] || durationKey || 'Durée non précisée'}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Description</div>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'rgba(242,237,230,0.75)', fontStyle: remark.opinion ? 'normal' : 'italic' }}>
              {remark.opinion || 'Aucune description fournie.'}
            </p>
          </div>

          {photoUrl && (
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Photo</div>
              <img src={photoUrl} alt="Photo du signalement" style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', objectFit: 'cover', border: '0.5px solid rgba(242,237,230,0.1)' }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', marginBottom: '4px' }}>Signaleur</div>
              <div style={{ fontSize: '13px', color: '#F2EDE6' }}>{remark.user?.nom || 'Citoyen'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', marginBottom: '4px' }}>Profil</div>
              <div style={{ fontSize: '13px', color: '#F2EDE6' }}>{remark.profile || 'Non précisé'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', marginBottom: '4px' }}>Zone</div>
              <div style={{ fontSize: '13px', color: zoneName ? '#F2EDE6' : '#E8B87A' }}>{zoneName || 'Non assignée'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', marginBottom: '4px' }}>Date</div>
              <div style={{ fontSize: '13px', color: '#F2EDE6', fontFamily: 'DM Mono, monospace' }}>{formatDate(remark.created_at)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '0.5px solid rgba(242,237,230,0.08)' }}>
          <button
            type="button"
            disabled={!hasCoords}
            onClick={() => onCreateZone(remark)}
            style={{
              width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
              background: hasCoords ? '#C1440E' : 'rgba(255,255,255,0.08)',
              color: hasCoords ? '#fff' : 'rgba(242,237,230,0.35)',
              fontSize: '13px', fontWeight: 600, cursor: hasCoords ? 'pointer' : 'not-allowed',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Créer une zone autour de ce point
          </button>
        </div>
      </aside>
    </>
  );
}

const AdminRemarquesTab = ({ isActive = true, onCreateZoneAround }) => {
  const [remarks, setRemarks] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRemark, setSelectedRemark] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const panelRef = useRef(null);
  const { user } = useAuth();
  const userCity = user?.city || null;
  const cityConfig = useMemo(() => getCityMapConfig(userCity), [userCity]);
  const { isMobile } = useResponsive();
  const itemsPerPage = 10;

  const [filters, setFilters] = useState({
    urgency: '',
    category: '',
    duration: '',
    zone: '',
    dateStart: '',
    dateEnd: '',
  });

  const fetchData = useCallback(async () => {
    if (!isActive) return;
    setLoading(true);
    try {
      const [zonesRes, remarksRes] = await Promise.all([getZones(), getRemarks()]);
      const zonesArray = unwrap(zonesRes);
      const cityZones = userCity
        ? zonesArray.filter(z => z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim())
        : zonesArray;
      setZones(cityZones);

      const data = unwrap(remarksRes);
      const cityZoneIds = cityZones.map(z => z.id);
      const cityRemarks = userCity
        ? data.filter(r => {
            if (r.zone_id) return cityZoneIds.includes(r.zone_id);
            return isInCityBounds(r, cityConfig.bounds);
          })
        : data;
      setRemarks(cityRemarks.map(r => ({
        ...r,
        zone_nom: r.zone?.nom || cityZones.find(z => z.id === r.zone_id)?.nom || null,
      })));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les signalements.');
    } finally {
      setLoading(false);
    }
  }, [isActive, userCity, cityConfig]);

  useEffect(() => {
    if (isActive) {
      fetchData();
    }
  }, [isActive, fetchData]);

  const stats = useMemo(() => {
    const now = Date.now();
    const week = 7 * 86400000;
    const categories = new Set(remarks.map(r => (r.categorie || r.building_type || 'other').toLowerCase()));
    return {
      total: remarks.length,
      urgent: remarks.filter(r => (parseInt(r.urgency, 10) || 0) >= 4).length,
      thisWeek: remarks.filter(r => now - new Date(r.created_at).getTime() < week).length,
      categoriesCount: categories.size,
    };
  }, [remarks]);

  const filteredRemarks = useMemo(() => {
    let result = [...remarks];

    if (filters.urgency === '5') result = result.filter(r => parseInt(r.urgency, 10) === 5);
    else if (filters.urgency === '4') result = result.filter(r => parseInt(r.urgency, 10) === 4);
    else if (filters.urgency === '3') result = result.filter(r => parseInt(r.urgency, 10) === 3);
    else if (filters.urgency === '1-2') result = result.filter(r => (parseInt(r.urgency, 10) || 1) <= 2);

    if (filters.category) {
      result = result.filter(r => (r.categorie || r.building_type || '').toLowerCase() === filters.category);
    }

    if (filters.duration === 'recent') {
      result = result.filter(r => (r.duration || r.residence_duration) === 'days');
    } else if (filters.duration === 'months') {
      result = result.filter(r => (r.duration || r.residence_duration) === 'months');
    } else if (filters.duration === 'chronic') {
      result = result.filter(r => ['year', 'always'].includes(r.duration || r.residence_duration));
    }

    if (filters.zone === 'unassigned') {
      result = result.filter(r => !r.zone_id);
    } else if (filters.zone) {
      result = result.filter(r => String(r.zone_id) === String(filters.zone));
    }

    if (filters.dateStart) {
      const start = new Date(filters.dateStart).getTime();
      result = result.filter(r => new Date(r.created_at).getTime() >= start);
    }
    if (filters.dateEnd) {
      const end = new Date(filters.dateEnd).getTime() + 86400000;
      result = result.filter(r => new Date(r.created_at).getTime() <= end);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.opinion && r.opinion.toLowerCase().includes(q)) ||
        formatRef(r, userCity).toLowerCase().includes(q) ||
        (r.zone?.nom && r.zone.nom.toLowerCase().includes(q)) ||
        (r.user?.nom && r.user.nom.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [remarks, filters, searchQuery, userCity]);

  const paginatedRemarks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRemarks.slice(start, start + itemsPerPage);
  }, [filteredRemarks, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRemarks.length / itemsPerPage));

  useEffect(() => { setCurrentPage(1); }, [filters, searchQuery]);

  const clearFilters = () => {
    setFilters({ urgency: '', category: '', duration: '', zone: '', dateStart: '', dateEnd: '' });
    setSearchQuery('');
  };

  const getZoneLabel = (remark) => {
    if (remark.zone?.nom) return remark.zone.nom;
    return 'Non assignée';
  };

  if (loading && remarks.length === 0) {
    return <div style={{ padding: '24px' }}><SkeletonTable rows={5} columns={8} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Total signalements', value: stats.total, color: '#C1440E' },
          { label: 'Urgents (4-5)', value: stats.urgent, color: '#ef4444' },
          { label: 'Cette semaine', value: stats.thisWeek, color: '#E8B87A' },
          { label: 'Catégories', value: stats.categoriesCount, color: '#52BE80' },
        ].map((card) => (
          <div key={card.label} style={{
            background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(242,237,230,0.07)',
            borderRadius: '8px', padding: '14px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: card.color }} />
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.28)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px' }}>{card.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '26px', color: '#E8B87A', fontWeight: 500 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(242,237,230,0.07)',
        borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{ position: 'relative', maxWidth: '320px' }}>
          <input
            type="search"
            placeholder="Rechercher référence, description, zone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '6px',
              color: '#F2EDE6', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', marginRight: '4px' }}>Urgence</span>
          {[
            { value: '', label: 'Toutes' },
            { value: '5', label: '🔴 Critique (5)' },
            { value: '4', label: '🟠 Dangereux (4)' },
            { value: '3', label: '🟡 Significatif (3)' },
            { value: '1-2', label: '🟢 Mineur (1-2)' },
          ].map(opt => (
            <button key={opt.value || 'all'} type="button" onClick={() => setFilters(f => ({ ...f, urgency: opt.value }))} style={{
              padding: '4px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer',
              border: filters.urgency === opt.value ? '0.5px solid rgba(193,68,14,0.5)' : '0.5px solid rgba(242,237,230,0.1)',
              background: filters.urgency === opt.value ? 'rgba(193,68,14,0.12)' : 'transparent',
              color: filters.urgency === opt.value ? '#F2EDE6' : 'rgba(242,237,230,0.45)',
            }}>{opt.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', marginRight: '4px' }}>Catégorie</span>
          <button type="button" onClick={() => setFilters(f => ({ ...f, category: '' }))} style={{
            padding: '4px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer',
            border: !filters.category ? '0.5px solid rgba(193,68,14,0.5)' : '0.5px solid rgba(242,237,230,0.1)',
            background: !filters.category ? 'rgba(193,68,14,0.12)' : 'transparent',
            color: !filters.category ? '#F2EDE6' : 'rgba(242,237,230,0.45)',
          }}>Toutes</button>
          {CATEGORIES.map(cat => (
            <button key={cat.value} type="button" onClick={() => setFilters(f => ({ ...f, category: cat.value }))} style={{
              padding: '4px 10px', borderRadius: '100px', fontSize: '11px', cursor: 'pointer',
              border: filters.category === cat.value ? '0.5px solid rgba(193,68,14,0.5)' : '0.5px solid rgba(242,237,230,0.1)',
              background: filters.category === cat.value ? 'rgba(193,68,14,0.12)' : 'transparent',
              color: filters.category === cat.value ? '#F2EDE6' : 'rgba(242,237,230,0.45)',
            }}>{cat.icon} {cat.label.split(' ')[0]}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', display: 'block', marginBottom: '4px' }}>Durée</label>
            <select value={filters.duration} onChange={e => setFilters(f => ({ ...f, duration: e.target.value }))} style={{
              padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
            }}>
              <option value="">Toutes</option>
              <option value="recent">Récent (quelques jours)</option>
              <option value="months">Quelques mois</option>
              <option value="chronic">Chronique (1 an+)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', display: 'block', marginBottom: '4px' }}>Zone</label>
            <select value={filters.zone} onChange={e => setFilters(f => ({ ...f, zone: e.target.value }))} style={{
              padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: '#F2EDE6', fontSize: '12px', minWidth: '160px',
            }}>
              <option value="">Toutes les zones</option>
              <option value="unassigned">Non assignés</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', display: 'block', marginBottom: '4px' }}>Du</label>
            <input type="date" value={filters.dateStart} onChange={e => setFilters(f => ({ ...f, dateStart: e.target.value }))} style={{
              padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
            }} />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', display: 'block', marginBottom: '4px' }}>Au</label>
            <input type="date" value={filters.dateEnd} onChange={e => setFilters(f => ({ ...f, dateEnd: e.target.value }))} style={{
              padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
            }} />
          </div>
          <button type="button" onClick={clearFilters} style={{
            padding: '7px 12px', background: 'transparent', border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '6px', color: 'rgba(242,237,230,0.45)', fontSize: '11px', cursor: 'pointer',
          }}>Effacer</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(242,237,230,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
        {error ? (
          <EmptyState icon="❌" title="Erreur" subtitle={error} action={{ label: 'Réessayer', onClick: fetchData }} />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr>
                    {['Référence', 'Catégorie', 'Urgence', 'Durée', 'Signaleur', 'Zone', 'Date', ''].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontSize: '10px', letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'rgba(242,237,230,0.28)',
                        borderBottom: '0.5px solid rgba(242,237,230,0.06)', fontWeight: 500, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRemarks.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px' }}>
                        <EmptyState icon="📋" title="Aucun signalement" subtitle="Modifiez vos filtres pour élargir la recherche." action={{ label: 'Effacer les filtres', onClick: clearFilters }} />
                      </td>
                    </tr>
                  ) : paginatedRemarks.map(remark => {
                    const cat = getCategoryMeta(remark.categorie || remark.building_type);
                    const durationKey = remark.duration || remark.residence_duration;
                    const zoneLabel = getZoneLabel(remark);
                    const isUnassigned = !remark.zone_id;

                    return (
                      <tr
                        key={remark.id}
                        onClick={() => setSelectedRemark(remark)}
                        style={{ borderBottom: '0.5px solid rgba(242,237,230,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(193,68,14,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '11px 14px', fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#E8B87A' }}>
                          {formatRef(remark, userCity)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'rgba(242,237,230,0.7)' }}>
                          {cat.icon} {cat.label}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <UrgencyBadge urgency={parseInt(remark.urgency, 10) || 1} />
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '11px', color: 'rgba(242,237,230,0.5)', maxWidth: '140px' }}>
                          {DURATION_LABELS[durationKey] || '—'}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#F2EDE6' }}>
                          {remark.user?.nom || remark.profile || 'Citoyen'}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: isUnassigned ? '#E8B87A' : 'rgba(242,237,230,0.65)' }}>
                          {zoneLabel}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '11px', color: 'rgba(242,237,230,0.35)', fontFamily: 'DM Mono, monospace' }}>
                          {formatDate(remark.created_at)}
                        </td>
                        <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                          <button type="button" onClick={() => setSelectedRemark(remark)} style={{
                            padding: '4px 10px', borderRadius: '4px', fontSize: '11px',
                            background: 'transparent', border: '0.5px solid rgba(242,237,230,0.15)',
                            color: 'rgba(242,237,230,0.55)', cursor: 'pointer',
                          }}>Voir détails</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderTop: '0.5px solid rgba(242,237,230,0.06)',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.25)' }}>
                {filteredRemarks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredRemarks.length)} sur {filteredRemarks.length}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{
                  width: '28px', height: '28px', borderRadius: '4px', border: '0.5px solid rgba(242,237,230,0.1)',
                  background: 'transparent', color: 'rgba(242,237,230,0.4)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}>‹</button>
                <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.4)', padding: '0 8px', lineHeight: '28px' }}>{currentPage}/{totalPages}</span>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{
                  width: '28px', height: '28px', borderRadius: '4px', border: '0.5px solid rgba(242,237,230,0.1)',
                  background: 'transparent', color: 'rgba(242,237,230,0.4)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}>›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedRemark && (
        <RemarkDetailPanel
          remark={selectedRemark}
          city={userCity}
          panelRef={panelRef}
          onClose={() => setSelectedRemark(null)}
          onCreateZone={(remark) => {
            setSelectedRemark(null);
            onCreateZoneAround?.(remark);
          }}
        />
      )}
    </div>
  );
};

export default AdminRemarquesTab;
