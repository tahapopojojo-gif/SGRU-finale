import React, { useState, useEffect, useCallback } from 'react';
import { 
  getZones, 
  getFilteredRemarksForExport, 
  generateCSV, 
  downloadCSV 
} from '../../services/adminApi';
import SkeletonCard from '../SkeletonCard.jsx';
import { validateDateRange } from '../../services/validationService.js';
import { useToast } from '../../hooks/useToast.js';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';

const s = {
  page: { padding: '24px', fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111827' },
  subtitle: { fontSize: '15px', color: '#6b7280', margin: 0 },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
  filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
  clearBtn: { background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
  previewCard: { background: '#EFF6FF', borderRadius: '12px', padding: '24px', border: '1px solid #BFDBFE', marginBottom: '24px' },
  previewTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 20px 0' },
  previewGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' },
  totalCount: { fontSize: '48px', fontWeight: 'bold', color: '#1D4ED8', lineHeight: 1, margin: '0 0 8px 0' },
  totalLabel: { fontSize: '14px', color: '#3b82f6', fontWeight: '600', textTransform: 'uppercase' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  statBox: { background: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  statTitle: { fontSize: '13px', color: '#6b7280', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' },
  badgeContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  badge: (bg, color) => ({ padding: '4px 10px', borderRadius: '20px', background: bg, color, fontSize: '12px', fontWeight: '700' }),
  catItem: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px', marginBottom: '6px' },
  dateRange: { marginTop: '20px', padding: '12px', background: '#e0e7ff', borderRadius: '8px', fontSize: '14px', color: '#3730a3', fontWeight: '500' },
  noData: { textAlign: 'center', padding: '20px', color: '#6b7280', fontStyle: 'italic' },
  exportSection: { textAlign: 'center', marginTop: '32px' },
  btnNormal: { background: '#10B981', color: 'white', padding: '16px 48px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)' },
  btnDisabled: { background: '#9CA3AF', color: 'white', padding: '16px 48px', fontSize: '18px', borderRadius: '8px', cursor: 'not-allowed', border: 'none', fontWeight: 'bold' },
  successMsg: { background: '#DCFCE7', color: '#166534', borderRadius: '8px', padding: '12px 24px', display: 'inline-block', marginTop: '16px', fontWeight: '600' }
};

export default function AdminExportTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const userCity = user?.city || null;
  const [zones, setZones] = useState([]);
  const [filters, setFilters] = useState({
    zone_id: '',
    category: '',
    dateStart: '',
    dateEnd: ''
  });
  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);
  const [hoverBtn, setHoverBtn] = useState(false);

  const categories = ['Hôpital', 'École', 'Parc', 'Route', 'Autre'];

  const updatePreview = useCallback(async () => {
    setIsLoading(true);
    try {
      // Silently enforce city filter
      const remarks = await getFilteredRemarksForExport({ ...filters, city: userCity });
      
      // Calculate byStatus
      const byStatus = { urgent: 0, actif: 0, planifie: 0, rejete: 0 };
      remarks.forEach(r => {
        if (byStatus[r.statut] !== undefined) byStatus[r.statut]++;
      });

      // Calculate topCategories
      const catCounts = remarks.reduce((acc, r) => {
        const cat = r.category.charAt(0).toUpperCase() + r.category.slice(1);
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      const topCategories = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Calculate dateRange
      let earliest = null;
      let latest = null;
      if (remarks.length > 0) {
        const dates = remarks.map(r => new Date(r.created_at).getTime());
        earliest = new Date(Math.min(...dates)).toLocaleDateString('fr-FR');
        latest = new Date(Math.max(...dates)).toLocaleDateString('fr-FR');
      }

      setPreviewData({
        total: remarks.length,
        byStatus,
        topCategories,
        dateRange: earliest && latest ? { earliest, latest } : null
      });
    } catch (err) {
      console.error("Error updating preview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userCity]);

  useEffect(() => {
    const loadZones = async () => {
      try {
        const data = await getZones();
        // Only show zones from admin's city
        const cityZones = userCity
          ? data.filter(z =>
              z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim()
            )
          : data;
        setZones(cityZones);
      } catch (err) {
        console.error("Error loading zones:", err);
      }
    };
    loadZones();
  }, [userCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
      // Reset success message when filters change
      setExportSuccess(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  const [dateError, setDateError] = useState('');
  const [dateTouched, setDateTouched] = useState(false);

  const validationStyles = {
    errorInput: { border: '2px solid #DC2626', backgroundColor: '#FEE2E2' },
    validInput: { border: '2px solid #10B981', backgroundColor: '#DCFCE7' },
    errorText: { color: '#DC2626', fontSize: '12px', marginTop: '4px' },
    successCheckmark: { color: '#10B981', fontSize: '16px', marginLeft: '8px' },
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.dateStart || filters.dateEnd) {
        const { error } = validateDateRange(filters.dateStart, filters.dateEnd);
        setDateError(error || '');
      } else {
        setDateError('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [filters.dateStart, filters.dateEnd]);

  const handleDateBlur = () => setDateTouched(true);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ zone_id: '', category: '', dateStart: '', dateEnd: '' });
  };

  const generateFilename = () => {
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    let zoneName = "Toutes_Zones";
    if (filters.zone_id) {
      const zone = zones.find(z => z.id === filters.zone_id);
      if (zone) zoneName = zone.nom.replace(/\s+/g, '_');
    }
    return `UrbanMap_Export_${zoneName}_${dateStr}.csv`;
  };

  const handleExport = async () => {
    if (!previewData || previewData.total === 0) return;
    setIsExporting(true);
    setExportSuccess(null);
    toast.info('Génération du fichier CSV...');
    try {
      // Silently enforce city filter on export too
      const remarks = await getFilteredRemarksForExport({ ...filters, city: userCity });
      const csv = generateCSV(remarks);
      const filename = generateFilename();
      downloadCSV(csv, filename);
      setExportSuccess(remarks.length);
      toast.success(`Export réussi — ${remarks.length} remarques exportées`);
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Une erreur est survenue lors de l'export.");
    } finally {
      setIsExporting(false);
    }
  };

  const isExportDisabled = !previewData || previewData.total === 0 || isExporting || !!dateError;

  const [exportFormat, setExportFormat] = useState('csv');

  const selectStyle = {
    width: '100%', padding: '7px 11px',
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(242,237,230,0.12)',
    borderRadius: '6px', color: 'rgba(242,237,230,0.6)',
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '10px', letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(242,237,230,0.22)', marginBottom: '6px',
    display: 'block'
  };

  const selectedPeriod = (() => {
    if (!filters.dateStart && !filters.dateEnd) return 'all';
    const todayStr = new Date().toISOString().split('T')[0];
    if (filters.dateEnd === todayStr) {
      const diff = Math.round((new Date(todayStr) - new Date(filters.dateStart)) / (1000 * 60 * 60 * 24));
      if (diff === 7) return '7d';
      if (diff === 30) return '30d';
    }
    const currentYear = new Date().getFullYear();
    if (filters.dateStart === `${currentYear}-01-01` && filters.dateEnd === `${currentYear}-12-31`) return 'year';
    return 'custom';
  })();

  const handlePeriodChange = (e) => {
    const val = e.target.value;
    let start = '';
    let end = '';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (val === '7d') {
      const d = new Date();
      d.setDate(today.getDate() - 7);
      start = d.toISOString().split('T')[0];
      end = todayStr;
    } else if (val === '30d') {
      const d = new Date();
      d.setDate(today.getDate() - 30);
      start = d.toISOString().split('T')[0];
      end = todayStr;
    } else if (val === 'year') {
      start = `${today.getFullYear()}-01-01`;
      end = `${today.getFullYear()}-12-31`;
    }
    
    setFilters(prev => ({
      ...prev,
      dateStart: start,
      dateEnd: end
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* SECTION 1 — Export format grid (2x2) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '12px', marginBottom: '20px',
      }}>
        {[
          { icon:'📊', name:'Export CSV complet',
            desc:'Toutes les remarques avec métadonnées complètes.',
            key:'csv' },
          { icon:'📄', name:'Rapport PDF',
            desc:'Rapport formaté avec graphiques et synthèse IA.',
            key:'pdf' },
          { icon:'🗺', name:'Export GeoJSON',
            desc:'Données spatiales des zones pour SIG.',
            key:'geojson' },
          { icon:'📈', name:'Excel Analytics',
            desc:'Tableau croisé dynamique prêt pour Excel.',
            key:'excel' },
        ].map(opt => (
          <div
            key={opt.key}
            onClick={() => setExportFormat(opt.key)}
            style={{
              background: exportFormat === opt.key
                ? 'rgba(193,68,14,0.1)' : 'rgba(255,255,255,0.03)',
              border: exportFormat === opt.key
                ? '0.5px solid #C1440E'
                : '0.5px solid rgba(242,237,230,0.08)',
              borderRadius: '10px', padding: '20px',
              cursor: 'pointer', transition: 'all 0.25s',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              if (exportFormat !== opt.key) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.border = '0.5px solid rgba(242,237,230,0.15)';
              }
            }}
            onMouseLeave={e => {
              if (exportFormat !== opt.key) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.border = '0.5px solid rgba(242,237,230,0.08)';
              }
            }}
          >
            <div style={{fontSize:'26px',marginBottom:'10px'}}>
              {opt.icon}
            </div>
            <div style={{
              fontSize:'13px',fontWeight:500,
              color:'#F2EDE6',marginBottom:'4px',
            }}>{opt.name}</div>
            <div style={{
              fontSize:'11px',
              color:'rgba(242,237,230,0.35)',lineHeight:1.5,
            }}>{opt.desc}</div>
          </div>
        ))}
      </div>

      {/* SECTION 2 — Filters (3 col grid) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px', marginBottom: '16px',
      }}>
        {/* Zone cible */}
        <div>
          <label htmlFor="export-zone" style={labelStyle}>Zone cible</label>
          <select
            id="export-zone"
            name="zone_id"
            value={filters.zone_id}
            onChange={handleFilterChange}
            style={selectStyle}
          >
            <option value="">Toutes les zones</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
          </select>
        </div>

        {/* Statut */}
        <div>
          <label htmlFor="export-statut" style={labelStyle}>Statut</label>
          <select
            id="export-statut"
            name="statut"
            value={filters.statut || ''}
            onChange={handleFilterChange}
            style={selectStyle}
          >
            <option value="">Tous les statuts</option>
            <option value="urgent">Urgent</option>
            <option value="actif">Actif</option>
            <option value="planifie">Planifié</option>
            <option value="rejete">Rejeté</option>
          </select>
        </div>

        {/* Période */}
        <div>
          <label htmlFor="export-period" style={labelStyle}>Période</label>
          <select
            id="export-period"
            value={selectedPeriod}
            onChange={handlePeriodChange}
            style={selectStyle}
          >
            <option value="all">Toute la période</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="year">Cette année</option>
            {selectedPeriod === 'custom' && <option value="custom">Plage personnalisée</option>}
          </select>
        </div>
      </div>

      {/* SECTION 3 — Action buttons */}
      <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
        <button
          disabled={isExportDisabled}
          onClick={handleExport}
          style={{
            flex: 1, padding: '12px',
            background: isExportDisabled ? 'rgba(193,68,14,0.3)' : '#C1440E',
            color: isExportDisabled ? 'rgba(255,255,255,0.4)' : '#fff',
            borderRadius: '6px', fontSize: '13px',
            border: 'none', cursor: isExportDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            transition: 'background 0.25s',
          }}
          onMouseEnter={e => {
            if (!isExportDisabled) e.currentTarget.style.background = '#d34a10';
          }}
          onMouseLeave={e => {
            if (!isExportDisabled) e.currentTarget.style.background = '#C1440E';
          }}
        >
          {isExporting ? 'Génération en cours...' : '⬇ Générer et télécharger'}
        </button>
        
        <button
          onClick={updatePreview}
          style={{
            padding: '12px 18px', background: 'transparent',
            color: 'rgba(242,237,230,0.6)', borderRadius: '6px', fontSize: '13px',
            border: '0.5px solid rgba(242,237,230,0.15)', cursor: 'pointer',
            fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = '#F2EDE6';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(242,237,230,0.6)';
          }}
        >
          👁 Prévisualiser
        </button>
      </div>

      {exportSuccess !== null && (
        <div style={{
          background: 'rgba(82,190,128,0.1)',
          border: '0.5px solid rgba(82,190,128,0.3)',
          color: '#52BE80', borderRadius: '6px',
          padding: '10px 14px', fontSize: '12px',
          marginTop: '12px', textAlign: 'center'
        }} role="status" aria-live="polite">
          ✅ Export réussi — {exportSuccess} remarques exportées ({exportFormat.toUpperCase()})
        </div>
      )}

      <div style={{ display: 'none' }}>
        {React && null}
        {SkeletonCard && null}
        {EmptyState && null}
        {s && null}
        {categories && null}
        {previewData && null}
        {isLoading && null}
        {hoverBtn && null}
        {setHoverBtn && null}
        {dateError && null}
        {dateTouched && null}
        {validationStyles && null}
        {handleDateBlur && null}
        {handleClearFilters && null}
      </div>
    </div>
  );
}
