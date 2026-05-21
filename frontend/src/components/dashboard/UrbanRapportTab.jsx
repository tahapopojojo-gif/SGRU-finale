import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getZonesWithStats, getUrbanStatsByZone, getAnnotations, getZoneSummary } from '../../services/urbanApi';
import { generateZoneReport } from '../../services/pdfService';
import SkeletonChart from '../SkeletonChart.jsx';
import { unwrap } from '../../utils/unwrap';
import { AiCard, SectionLabel } from './UDComponents';

export default function UrbanRapportTab() {
  const { user } = useAuth();
  const { selectedZone: contextSelectedZone } = useUrbanZone();

  const [zones, setZones] = useState([]);
  const [selectedReportZone, setSelectedReportZone] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('zone');
  const [period, setPeriod] = useState('30');

  // ON MOUNT
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await getZonesWithStats();
        const fetchedZones = unwrap(res);
        setZones(fetchedZones);
        if (contextSelectedZone) {
          // Find the detailed zone object from the list to ensure all stats are present
          const initialZone = fetchedZones.find(z => String(z.id) === String(contextSelectedZone.id)) || contextSelectedZone;
          setSelectedReportZone(initialZone);
        }
      } catch (error) {
        console.error("Error fetching zones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, [contextSelectedZone]);

  // WHEN selectedReportZone CHANGES
  useEffect(() => {
    if (!selectedReportZone) {
      setPreviewData(null);
      return;
    }

    const loadPreviewData = async () => {
      try {
        const [resStats, resAnnotations, resSummary] = await Promise.all([
          getUrbanStatsByZone(selectedReportZone.id),
          getAnnotations(selectedReportZone.id),
          getZoneSummary(selectedReportZone.id)
        ]);

        const stats = resStats || {};
        const annotations = unwrap(resAnnotations);
        const summary = resSummary || {};

        setPreviewData({
          totalRemarks: stats.totalRemarks,
          urgentCount: stats.urgentCount,
          avgUrgency: stats.avgUrgency,
          dominantCategory: stats.dominantCategory,
          hasAnnotations: annotations.length > 0,
          annotationCount: annotations.length,
          hasSummary: !!summary?.data?.summary_text
        });
      } catch (error) {
        console.error("Error loading preview data:", error);
      }
    };

    loadPreviewData();
  }, [selectedReportZone]);

  const handleGenerate = async () => {
    if (!selectedReportZone) return;
    setIsGenerating(true);
    setResult(null);

    const urbanisteName = user?.nom || 'Urbaniste';
    const reportResult = await generateZoneReport(selectedReportZone, urbanisteName);
    
    setResult(reportResult);
    setIsGenerating(false);
  };

  const selectedZone = selectedReportZone?.id || '';
  const setSelectedZone = (zoneId) => {
    if (zoneId === 'all') {
      setSelectedReportZone({ id: 'all', nom: 'Toutes les zones' });
    } else {
      const found = zones.find(z => String(z.id) === String(zoneId));
      if (found) setSelectedReportZone(found);
    }
  };
  const isLoading = isGenerating;
  const handleGeneratePDF = undefined;
  const handlePreview = () => {
    if (selectedReportZone) {
      alert(`Aperçu du rapport pour ${selectedReportZone.nom} (${reportType === 'zone' ? 'Rapport de zone' : reportType})`);
    } else {
      alert('Veuillez d\'abord sélectionner une zone.');
    }
  };

  if (loading) {
    return <div style={{padding: '24px'}}><SkeletonChart type="bar" height={300} /></div>;
  }

  return (
    <div>
      {/* AI explanation card */}
      <AiCard>
        Sélectionnez le type de rapport et la plage de données.
        Claude génère automatiquement un résumé exécutif, des graphiques
        et des recommandations basées sur les opinions citoyennes validées.
      </AiCard>

      <SectionLabel>Type de rapport</SectionLabel>

      {/* Report type grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '12px', marginBottom: '20px',
      }}>
        {[
          { icon: '📊', name: 'Rapport de zone',     key: 'zone',
            desc: 'Analyse complète d\'une zone : opinions, statistiques, heatmap, recommandations IA.' },
          { icon: '🏙️', name: 'Rapport de ville',   key: 'ville',
            desc: 'Vue agrégée de toutes les zones d\'une ville avec comparaisons et tendances.' },
          { icon: '📈', name: 'Rapport temporel',    key: 'temporel',
            desc: 'Évolution des signalements sur une période définie. Idéal pour conseils municipaux.' },
          { icon: '🤖', name: 'Synthèse IA pure',    key: 'ia',
            desc: 'Rapport narratif généré entièrement par Claude à partir des données brutes.' },
        ].map(r => (
          <div
            key={r.key}
            onClick={() => setReportType && setReportType(r.key)}
            style={{
              background: (reportType || 'zone') === r.key
                ? 'rgba(193,68,14,0.1)' : 'rgba(255,255,255,0.03)',
              border: (reportType || 'zone') === r.key
                ? '0.5px solid #C1440E'
                : '0.5px solid rgba(242,237,230,0.08)',
              borderRadius: '10px', padding: '18px',
              cursor: 'pointer', transition: 'all 0.25s',
              textAlign: 'center',
            }}
            onMouseEnter={e => {
              if ((reportType || 'zone') !== r.key) {
                e.currentTarget.style.borderColor = 'rgba(193,68,14,0.4)'
                e.currentTarget.style.background = 'rgba(193,68,14,0.05)'
              }
            }}
            onMouseLeave={e => {
              if ((reportType || 'zone') !== r.key) {
                e.currentTarget.style.borderColor = 'rgba(242,237,230,0.08)'
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              }
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{r.icon}</div>
            <div style={{
              fontSize: '13px', fontWeight: 500,
              color: '#F2EDE6', marginBottom: '4px',
            }}>{r.name}</div>
            <div style={{
              fontSize: '11px', color: 'rgba(242,237,230,0.35)',
              lineHeight: 1.5,
            }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* Zone + Period selects */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '12px', marginTop: '4px',
      }}>
        <div>
          <SectionLabel>Zone cible</SectionLabel>
          <select
            value={selectedZone || ''}
            onChange={e => setSelectedZone && setSelectedZone(e.target.value)}
            style={{
              padding: '6px 10px', width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: 'rgba(242,237,230,0.6)',
              fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
            }}
          >
            {(zones || []).map(z => (
              <option key={z.id} value={z.id}>{z.nom}</option>
            ))}
            <option value="all">Toutes les zones</option>
          </select>
        </div>
        <div>
          <SectionLabel>Période</SectionLabel>
          <select
            value={period || '30'}
            onChange={e => setPeriod && setPeriod(e.target.value)}
            style={{
              padding: '6px 10px', width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: 'rgba(242,237,230,0.6)',
              fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
              outline: 'none',
            }}
          >
            <option value="30">30 derniers jours</option>
            <option value="90">3 derniers mois</option>
            <option value="180">6 derniers mois</option>
            <option value="365">Année 2026</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <button
          onClick={handleGeneratePDF || handleGenerate || (() => {})}
          disabled={isLoading || isGenerating}
          style={{
            flex: 1, padding: '12px',
            background: (isLoading || isGenerating)
              ? 'rgba(193,68,14,0.5)' : '#C1440E',
            border: 'none', borderRadius: '6px',
            color: '#fff', fontSize: '13px', fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {(isLoading || isGenerating)
            ? '⏳ Génération en cours...'
            : '✦ Générer avec IA → PDF'}
        </button>
        <button
          onClick={handlePreview || (() => {})}
          style={{
            padding: '12px 18px',
            background: 'transparent',
            border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '6px',
            color: 'rgba(242,237,230,0.5)', fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(242,237,230,0.3)'
            e.currentTarget.style.color = '#F2EDE6'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(242,237,230,0.12)'
            e.currentTarget.style.color = 'rgba(242,237,230,0.5)'
          }}
        >
          👁 Prévisualiser
        </button>
      </div>

      {/* Loading indicator */}
      {(isLoading || isGenerating) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '12px', color: 'rgba(193,68,14,0.7)',
          padding: '10px 0', marginTop: '4px',
        }}>
          <span style={{ display: 'flex', gap: '3px' }}>
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: '#C1440E', display: 'inline-block',
                animation: `dotpulse 1s infinite ${i*0.2}s`,
              }} />
            ))}
          </span>
          Claude génère votre rapport...
        </div>
      )}
    </div>
  );
}

