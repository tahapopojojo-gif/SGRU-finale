import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getZonesWithStats, getUrbanStatsByZone, getAnnotations, getZoneSummary } from '../../services/urbanApi';
import { generateZoneReport } from '../../services/pdfService';
import SkeletonChart from '../SkeletonChart.jsx';
import { unwrap } from '../../utils/unwrap';

export default function UrbanRapportTab() {
  const { user } = useAuth();
  const { selectedZone } = useUrbanZone();

  const [zones, setZones] = useState([]);
  const [selectedReportZone, setSelectedReportZone] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // ON MOUNT
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await getZonesWithStats();
        const fetchedZones = unwrap(res);
        setZones(fetchedZones);
        if (selectedZone) {
          // Find the detailed zone object from the list to ensure all stats are present
          const initialZone = fetchedZones.find(z => String(z.id) === String(selectedZone.id)) || selectedZone;
          setSelectedReportZone(initialZone);
        }
      } catch (error) {
        console.error("Error fetching zones:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, [selectedZone]);

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

  if (loading) {
    return <div style={{padding: '24px'}}><SkeletonChart type="bar" height={300} /></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* SECTION 1 — Page header */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <h2 style={{ margin: 0, fontWeight: 'bold', fontSize: '20px', color: '#111827' }}>
          📄 Génération du Rapport PDF
        </h2>
        <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: '14px' }}>
          Sélectionnez une zone pour générer un rapport professionnel complet.
        </p>
      </div>

      {/* SECTION 2 — Zone Selector + Preview */}
      <div style={{ display: 'flex', gap: '24px' }}>
        
        {/* LEFT COLUMN */}
        <div style={{ 
          flex: 1, 
          background: 'white', 
          padding: '24px', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#374151', marginBottom: '16px' }}>
            Sélectionner une zone
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zones.map((zone) => {
              const isSelected = selectedReportZone?.id === zone.id;
              
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedReportZone(zone)}
                  style={{
                    background: isSelected ? `${zone.couleur}15` : 'white',
                    border: isSelected ? `2px solid ${zone.couleur}` : '1px solid #E5E7EB',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    width: '100%',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: zone.couleur,
                    flexShrink: 0
                  }} />
                  <span style={{ 
                    fontWeight: 'bold', 
                    fontSize: '14px', 
                    color: isSelected ? zone.couleur : '#374151' 
                  }}>
                    {zone.nom}
                  </span>
                  <div style={{ 
                    marginLeft: 'auto', 
                    background: '#F3F4F6', 
                    color: '#6B7280', 
                    borderRadius: '20px', 
                    padding: '2px 10px', 
                    fontSize: '12px' 
                  }}>
                    {zone.totalRemarks} remarques
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ flex: 1 }}>
          {!selectedReportZone ? (
            <div style={{
              border: '2px dashed #D1D5DB',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <div style={{ color: '#9CA3AF', fontSize: '14px' }}>
                Sélectionnez une zone pour voir l'aperçu du rapport
              </div>
            </div>
          ) : previewData ? (
            <div style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  background: selectedReportZone.couleur 
                }} />
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>
                  {selectedReportZone.nom}
                </span>
                <span style={{ color: '#6B7280', fontSize: '12px' }}>Marrakech</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={checklistRowStyle}>
                  <span>✅</span>
                  <span>Indicateurs clés ({previewData.totalRemarks} remarques)</span>
                </div>
                <div style={checklistRowStyle}>
                  <span>✅</span>
                  <span>Distribution par catégorie</span>
                </div>
                <div style={checklistRowStyle}>
                  <span>✅</span>
                  <span>Évolution temporelle</span>
                </div>
                {previewData.totalRemarks > 0 && (
                  <div style={checklistRowStyle}>
                    <span>✅</span>
                    <span>Opinions citoyennes</span>
                  </div>
                )}
                <div style={checklistRowStyle}>
                  {previewData.hasSummary ? (
                    <><span>✅</span><span>Synthèse IA</span></>
                  ) : (
                    <><span>⚠️</span><span>Synthèse IA (non générée)</span></>
                  )}
                </div>
                <div style={checklistRowStyle}>
                  {previewData.hasAnnotations ? (
                    <><span>✅</span><span>Annotations privées ({previewData.annotationCount})</span></>
                  ) : (
                    <><span>⬜</span><span>Annotations privées (aucune)</span></>
                  )}
                </div>
                <div style={checklistRowStyle}>
                  <span>✅</span>
                  <span>Tableau détaillé complet</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>Chargement de l'aperçu...</div>
          )}
        </div>
      </div>

      {/* SECTION 3 — Generate Button + Result */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          onClick={!isGenerating && selectedReportZone ? handleGenerate : undefined}
          disabled={isGenerating || !selectedReportZone}
          style={{
            background: isGenerating 
              ? '#9CA3AF' 
              : selectedReportZone 
                ? '#6366F1' 
                : '#E5E7EB',
            color: isGenerating 
              ? 'white' 
              : selectedReportZone 
                ? 'white' 
                : '#9CA3AF',
            width: '280px',
            padding: '16px 32px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: (isGenerating || !selectedReportZone) ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {isGenerating 
            ? '⏳ Génération en cours...' 
            : selectedReportZone 
              ? '📥 Télécharger le Rapport PDF' 
              : '📥 Sélectionnez une zone'}
        </button>

        {result && (
          <div style={{ marginTop: '16px' }}>
            {result.success ? (
              <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                padding: '16px 24px',
                display: 'inline-block',
                textAlign: 'center'
              }}>
                <div style={{ color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>
                  ✅ Rapport généré avec succès !
                </div>
                <div style={{ color: '#16A34A', fontSize: '13px' }}>
                  📎 {result.filename}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '16px 24px',
                display: 'inline-block',
                textAlign: 'center'
              }}>
                <div style={{ color: '#991B1B', fontWeight: 'bold', marginBottom: '4px' }}>
                  ❌ Erreur lors de la génération
                </div>
                <div style={{ color: '#DC2626', fontSize: '13px' }}>
                  {result.error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const checklistRowStyle = {
  display: 'flex',
  gap: '8px',
  padding: '8px 0',
  borderBottom: '1px solid #F3F4F6',
  fontSize: '14px',
  color: '#374151'
};
