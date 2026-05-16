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
    updatePreview();
    // Reset success message when filters change
    setExportSuccess(null);
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
    if (filters.dateStart || filters.dateEnd) {
      const { error } = validateDateRange(filters.dateStart, filters.dateEnd);
      setDateError(error || '');
    } else {
      setDateError('');
    }
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

  return (
    <div style={s.page}>
      
      {/* PageHeader */}
      <header style={s.header}>
        <h2 style={s.title}>Export des Données</h2>
        <p style={s.subtitle}>Filtrez et téléchargez les données en format CSV</p>
      </header>

      {/* FilterPanel */}
      <section style={s.card} aria-label="Filtres d'export">
        <div style={s.filterGrid}>
          <div style={s.inputGroup}>
            <label htmlFor="export-zone" style={s.label}>Zone géographique</label>
            <select id="export-zone" name="zone_id" value={filters.zone_id} onChange={handleFilterChange} style={s.input}>
              <option value="">Toutes les zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          </div>
          <div style={s.inputGroup}>
            <label htmlFor="export-category" style={s.label}>Catégorie</label>
            <select id="export-category" name="category" value={filters.category} onChange={handleFilterChange} style={s.input}>
              <option value="">Toutes</option>
              {categories.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select>
          </div>
          <div style={s.inputGroup}>
            <label htmlFor="export-date-start" style={s.label}>Date début</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                id="export-date-start"
                type="date"
                name="dateStart"
                value={filters.dateStart}
                onChange={handleFilterChange}
                onBlur={handleDateBlur}
                style={{...s.input, ...(dateTouched && dateError ? validationStyles.errorInput : (dateTouched && filters.dateStart && !dateError ? validationStyles.validInput : {}))}}
                aria-invalid={dateTouched && !!dateError}
                aria-describedby={dateTouched && dateError ? 'export-date-error' : undefined}
              />
              {dateTouched && filters.dateStart && !dateError && <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>}
            </div>
          </div>
          <div style={s.inputGroup}>
            <label htmlFor="export-date-end" style={s.label}>Date fin</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                id="export-date-end"
                type="date"
                name="dateEnd"
                value={filters.dateEnd}
                onChange={handleFilterChange}
                onBlur={handleDateBlur}
                style={{...s.input, ...(dateTouched && dateError ? validationStyles.errorInput : (dateTouched && filters.dateEnd && !dateError ? validationStyles.validInput : {}))}}
                aria-invalid={dateTouched && !!dateError}
                aria-describedby={dateTouched && dateError ? 'export-date-error' : undefined}
              />
              {dateTouched && filters.dateEnd && !dateError && <span style={validationStyles.successCheckmark} aria-hidden="true">✓</span>}
            </div>
            {dateTouched && dateError && <div id="export-date-error" role="alert" style={validationStyles.errorText}>{dateError}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button style={s.clearBtn} onClick={handleClearFilters} aria-label="Effacer tous les filtres">Effacer les filtres</button>
        </div>
      </section>

      {/* PreviewPanel */}
      <section style={s.previewCard} aria-label="Aperçu de l'export" aria-live="polite">
        <h3 style={s.previewTitle}>Aperçu de l'export</h3>
        
        {isLoading ? (
          <SkeletonCard lines={3} />
        ) : previewData && previewData.total > 0 ? (
          <div>
            <div style={s.previewGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={s.totalCount} aria-label={`${previewData.total} remarques`}>{previewData.total}</div>
                <div style={s.totalLabel}>Remarques</div>
              </div>
              
              <div style={s.statsGrid}>
                <div style={s.statBox}>
                  <div style={s.statTitle}>Par Statut</div>
                  <div style={s.badgeContainer}>
                    <span style={s.badge('#FEE2E2', '#991B1B')}>Urgent: {previewData.byStatus.urgent}</span>
                    <span style={s.badge('#DBEAFE', '#1E40AF')}>Actif: {previewData.byStatus.actif}</span>
                    <span style={s.badge('#FEF9C3', '#854D0E')}>Planifié: {previewData.byStatus.planifie}</span>
                    <span style={s.badge('#F3F4F6', '#374151')}>Rejeté: {previewData.byStatus.rejete}</span>
                  </div>
                </div>
                
                <div style={s.statBox}>
                  <div style={s.statTitle}>Top Catégories</div>
                  <div>
                    {previewData.topCategories.map(c => (
                      <div key={c.name} style={s.catItem}>
                        <span>{c.name}</span>
                        <span style={{ fontWeight: 'bold' }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {previewData.dateRange && (
              <div style={s.dateRange}>
                <span aria-hidden="true">📅</span> Période des données : du <strong>{previewData.dateRange.earliest}</strong> au <strong>{previewData.dateRange.latest}</strong>
              </div>
            )}
          </div>
        ) : (
          <EmptyState 
            icon="📊"
            title="Aucune remarque"
            subtitle="Essayez d'élargir votre plage de dates ou vos catégories"
            action={{ 
              label: "Réinitialiser les filtres", 
              onClick: handleClearFilters
            }}
          />
        )}
      </section>

      {/* ExportSection */}
      <div style={s.exportSection}>
        <button 
          disabled={isExportDisabled}
          aria-disabled={isExportDisabled}
          style={isExportDisabled ? s.btnDisabled : (hoverBtn ? { ...s.btnNormal, background: '#059669' } : s.btnNormal)}
          onMouseEnter={() => setHoverBtn(true)}
          onMouseLeave={() => setHoverBtn(false)}
          onClick={handleExport}
          aria-label={isExporting ? 'Génération en cours' : `Télécharger le CSV avec ${previewData?.total || 0} remarques`}
        >
          {isExporting ? 'Génération en cours...' : '📥 Télécharger le CSV'}
        </button>
        <br />
        {exportSuccess !== null && (
          <div style={s.successMsg} role="status" aria-live="polite">
            ✅ Export réussi — {exportSuccess} remarques exportées
          </div>
        )}
      </div>

    </div>
  );
}
