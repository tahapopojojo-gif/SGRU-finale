import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getZones, getRemarks } from '../../services/adminApi';
import { useToast } from '../../hooks/useToast.js';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';
import { FileSpreadsheet, Globe, BarChart2, FileText } from 'lucide-react'
import {
  CATEGORIES,
  filterRemarksForExport,
  exportCSV,
  exportGeoJSON,
  exportExcel,
  exportPDF,
} from '../../services/exportService';

const labelStyle = {
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(242,237,230,0.22)',
  marginBottom: '6px',
  display: 'block',
};

const selectStyle = {
  width: '100%',
  padding: '7px 11px',
  background: 'rgba(255,255,255,0.04)',
  border: '0.5px solid rgba(242,237,230,0.12)',
  borderRadius: '6px',
  color: '#F2EDE6',
  fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
};

const optionStyle = {
  background: '#1a1614',
  color: '#F2EDE6',
};

const EXPORT_FORMATS = [
  { icon: FileSpreadsheet, iconColor: '#52BE80', name: 'Export CSV complet', desc: 'Une ligne par signalement — anonyme, prêt pour Excel ou QGIS.', key: 'csv' },
  { icon: Globe, iconColor: '#5DADE2', name: 'Export GeoJSON', desc: 'Polygones de zones + points signalements pour SIG.', key: 'geojson' },
  { icon: BarChart2, iconColor: '#E8B87A', name: 'Excel Analytics', desc: '3 feuilles : données brutes, croisement catégorie×zone, urgence.', key: 'excel' },
  { icon: FileText, iconColor: '#C1440E', name: 'Rapport PDF', desc: 'Rapport structuré avec indicateurs, tableaux et synthèse.', key: 'pdf' },
];

const getPeriodLabel = (filters) => {
  if (!filters.dateStart && !filters.dateEnd) return 'Toute la période';
  if (filters.dateStart && filters.dateEnd) {
    const s = new Date(filters.dateStart).toLocaleDateString('fr-FR');
    const e = new Date(filters.dateEnd).toLocaleDateString('fr-FR');
    return `${s} → ${e}`;
  }
  if (filters.dateStart) return `Depuis le ${new Date(filters.dateStart).toLocaleDateString('fr-FR')}`;
  return `Jusqu'au ${new Date(filters.dateEnd).toLocaleDateString('fr-FR')}`;
};

export default function AdminExportTab({ isActive = true }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const userCity = user?.city || 'marrakech';
  const cityConfig = getCityMapConfig(userCity);

  const [zones, setZones] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);

  const [filters, setFilters] = useState({
    zone_id: '',
    category: '',
    urgency: '',
    dateStart: '',
    dateEnd: '',
  });
  const [periodMode, setPeriodMode] = useState('all');

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
      setRemarks(data);
      setError(null);
    } catch (err) {
      console.error('Export load failed:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [isActive, userCity]);

  useEffect(() => {
    if (isActive) {
      fetchData();
    }
  }, [isActive, fetchData]);

  const filteredRemarks = useMemo(
    () => filterRemarksForExport(remarks, zones, filters, cityConfig.bounds),
    [remarks, zones, filters, cityConfig.bounds],
  );

  const filteredZones = useMemo(() => {
    if (!filters.zone_id) return zones;
    const zid = parseInt(filters.zone_id, 10);
    return zones.filter(z => z.id === zid);
  }, [zones, filters.zone_id]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setExportSuccess(null);
  };

  const handleClearFilters = () => {
    setFilters({ zone_id: '', category: '', urgency: '', dateStart: '', dateEnd: '' });
    setPeriodMode('all');
    setExportSuccess(null);
  };

  const selectedPeriod = periodMode;

  const handlePeriodChange = (e) => {
    const val = e.target.value;
    setPeriodMode(val);
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
    } else if (val === 'custom') {
      start = filters.dateStart;
      end = filters.dateEnd;
    } else if (val === 'all') {
      start = '';
      end = '';
    }

    setFilters(prev => ({ ...prev, dateStart: start, dateEnd: end }));
    setExportSuccess(null);
  };

  const handleExport = useCallback(async () => {
    if (!filteredRemarks.length) return;
    setIsExporting(true);
    setExportSuccess(null);

    const labels = { csv: 'CSV', geojson: 'GeoJSON', excel: 'Excel', pdf: 'PDF' };
    toast.info(`Génération du fichier ${labels[exportFormat]}…`);

    try {
      let count = 0;
      if (exportFormat === 'csv') {
        count = exportCSV(filteredRemarks, filteredZones, userCity);
      } else if (exportFormat === 'geojson') {
        count = exportGeoJSON(filteredRemarks, filteredZones, userCity);
      } else if (exportFormat === 'excel') {
        count = exportExcel(filteredRemarks, filteredZones, userCity);
      } else if (exportFormat === 'pdf') {
        count = exportPDF(filteredRemarks, filteredZones, userCity, getPeriodLabel(filters));
      }

      setExportSuccess(count);
      toast.success(`Export réussi — ${count} signalement${count !== 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      toast.error('Une erreur est survenue lors de l\'export.');
    } finally {
      setIsExporting(false);
    }
  }, [filteredRemarks, filteredZones, exportFormat, filters, userCity, toast]);

  const isExportDisabled = loading || isExporting || filteredRemarks.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Format grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {EXPORT_FORMATS.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => { setExportFormat(opt.key); setExportSuccess(null); }}
            onFocus={e => e.currentTarget.style.outline = 'none'}
            style={{
              flex: '1 1 200px',
              minWidth: '180px',
              background: exportFormat === opt.key ? 'rgba(193,68,14,0.08)' : 'rgba(255,255,255,0.02)',
              border: exportFormat === opt.key
                ? `0.5px solid ${opt.iconColor}`
                : '0.5px solid rgba(242,237,230,0.07)',
              borderRadius: '10px',
              padding: '20px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              outline: 'none',
              boxShadow: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {exportFormat === opt.key && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '1.5px', background: opt.iconColor,
              }} />
            )}
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '10px',
              background: `${opt.iconColor}18`,
              border: `0.5px solid ${opt.iconColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <opt.icon size={22} color={opt.iconColor} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#F2EDE6', marginBottom: '4px' }}>{opt.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', lineHeight: 1.5 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Filters — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div>
          <label htmlFor="export-zone" style={labelStyle}>Zone cible</label>
          <select id="export-zone" name="zone_id" value={filters.zone_id} onChange={handleFilterChange} style={selectStyle}>
            <option value="" style={optionStyle}>Toutes les zones</option>
            {zones.map(z => <option key={z.id} value={z.id} style={optionStyle}>{z.nom}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="export-category" style={labelStyle}>Catégorie</label>
          <select id="export-category" name="category" value={filters.category} onChange={handleFilterChange} style={selectStyle}>
            <option value="" style={optionStyle}>Toutes les catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value} style={optionStyle}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="export-urgency" style={labelStyle}>Urgence</label>
          <select id="export-urgency" name="urgency" value={filters.urgency} onChange={handleFilterChange} style={selectStyle}>
            <option value="" style={optionStyle}>Tous les niveaux</option>
            <option value="low" style={optionStyle}>Faible (1-2)</option>
            <option value="medium" style={optionStyle}>Significatif (3)</option>
            <option value="high" style={optionStyle}>Dangereux (4-5)</option>
          </select>
        </div>

        <div>
          <label htmlFor="export-period" style={labelStyle}>Période</label>
          <select id="export-period" value={selectedPeriod} onChange={handlePeriodChange} style={selectStyle}>
            <option value="all" style={optionStyle}>Toute la période</option>
            <option value="7d" style={optionStyle}>7 derniers jours</option>
            <option value="30d" style={optionStyle}>30 derniers jours</option>
            <option value="year" style={optionStyle}>Cette année</option>
            <option value="custom" style={optionStyle}>Personnalisée…</option>
          </select>
        </div>
      </div>

      {(selectedPeriod === 'custom' || filters.dateStart || filters.dateEnd) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label htmlFor="export-date-start" style={labelStyle}>Date début</label>
            <input
              id="export-date-start"
              type="date"
              name="dateStart"
              value={filters.dateStart}
              onChange={handleFilterChange}
              style={{ ...selectStyle, colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label htmlFor="export-date-end" style={labelStyle}>Date fin</label>
            <input
              id="export-date-end"
              type="date"
              name="dateEnd"
              value={filters.dateEnd}
              onChange={handleFilterChange}
              style={{ ...selectStyle, colorScheme: 'dark' }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleClearFilters}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            color: 'rgba(242,237,230,0.45)',
            border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Réinitialiser les filtres
        </button>
      </div>

      {/* Live preview count */}
      <div style={{
        background: filteredRemarks.length > 0 ? 'rgba(193,68,14,0.08)' : 'rgba(255,255,255,0.03)',
        border: `0.5px solid ${filteredRemarks.length > 0 ? 'rgba(193,68,14,0.25)' : 'rgba(242,237,230,0.08)'}`,
        borderRadius: '8px',
        padding: '14px 16px',
      }}>
        {loading ? (
          <span style={{ fontSize: '13px', color: 'rgba(242,237,230,0.45)' }}>Chargement des données…</span>
        ) : error ? (
          <div style={{ fontSize: '13px', color: '#ef4444' }}>{error}</div>
        ) : (
          <>
            <div style={{ fontSize: '15px', color: '#F2EDE6', fontWeight: 500 }}>
              <strong style={{ color: '#E8B87A', fontFamily: 'DM Mono, monospace' }}>{filteredRemarks.length}</strong>
              {' '}signalement{filteredRemarks.length !== 1 ? 's' : ''} correspond{filteredRemarks.length !== 1 ? 'ent' : ''} à ces filtres
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '4px' }}>
              {getPeriodLabel(filters)}
              {filters.zone_id && ` · Zone : ${zones.find(z => String(z.id) === filters.zone_id)?.nom || '—'}`}
              {filters.category && ` · Catégorie : ${CATEGORIES.find(c => c.value === filters.category)?.label}`}
              {filters.urgency && ` · Urgence filtrée`}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          disabled={isExportDisabled}
          onClick={handleExport}
          style={{
            flex: 1,
            padding: '11px 20px',
            background: 'transparent',
            color: isExportDisabled ? 'rgba(242,237,230,0.2)' : '#E8B87A',
            border: isExportDisabled
              ? '0.5px solid rgba(242,237,230,0.06)'
              : '0.5px solid rgba(193,68,14,0.45)',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: isExportDisabled ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '0.02em',
            transition: 'all 0.2s',
            outline: 'none',
          }}
        >
          {isExporting ? 'Génération en cours…' : `⬇ Générer et télécharger (${exportFormat.toUpperCase()})`}
        </button>
      </div>

      {!loading && !error && filteredRemarks.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          marginTop: '4px',
        }}>
          {[
            { label: 'Signalements', value: filteredRemarks.length, color: '#C1440E' },
            { label: 'Zones incluses', value: filteredZones.length, color: '#52BE80' },
            { label: 'Format', value: exportFormat.toUpperCase(), color: '#E8B87A' },
            { label: 'Période', value: getPeriodLabel(filters), color: '#5DADE2' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '0.5px solid rgba(242,237,230,0.06)',
              borderRadius: '6px',
              padding: '10px 12px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '1.5px', background: item.color,
              }} />
              <div style={{
                fontSize: '9px', color: 'rgba(242,237,230,0.25)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: '5px',
              }}>
                {item.label}
              </div>
              <div style={{
                fontSize: '13px', color: '#F2EDE6',
                fontFamily: 'DM Mono, monospace', fontWeight: 500,
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {exportSuccess !== null && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'rgba(82,190,128,0.1)',
            border: '0.5px solid rgba(82,190,128,0.3)',
            color: '#52BE80',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          Export réussi — {exportSuccess} signalement{exportSuccess !== 1 ? 's' : ''} ({exportFormat.toUpperCase()})
        </div>
      )}

      {!loading && filteredRemarks.length === 0 && (
        <p style={{ fontSize: '12px', color: 'rgba(242,237,230,0.35)', textAlign: 'center', margin: 0 }}>
          Aucun signalement ne correspond aux filtres sélectionnés. Ajustez les critères avant d&apos;exporter.
        </p>
      )}
    </div>
  );
}
