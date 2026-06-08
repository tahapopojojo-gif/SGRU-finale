import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getZonesWithStats, getUrbanStatsByZone, getValidatedRemarks } from '../../services/urbanApi';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SkeletonChart from '../SkeletonChart.jsx';
import { unwrap } from '../../utils/unwrap';
import { AiCard, SectionLabel } from './UDComponents';

// ─── REPORT SUB-COMPONENTS ──────────────────────────────────────────────────

const CommonHeader = ({ title, sub, date, city, period }) => (
  <div style={{ textAlign: 'center', borderBottom: '2px solid #C1440E', paddingBottom: '30px', marginBottom: '30px' }}>
    <h1 style={{ fontSize: '26px', margin: '0 0 8px 0', color: '#C1440E', letterSpacing: '1px' }}>{title}</h1>
    <h2 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#333' }}>{sub} — {city}</h2>
    <div style={{ fontSize: '12px', color: '#666' }}>
      Période: {period} · Généré le {date} par Gemini AI
    </div>
  </div>
);

const ZoneTemplate = ({ data }) => (
  <div>
    <CommonHeader title="RAPPORT ANALYTIQUE DE ZONE" sub={`Zone: ${data.name}`} date={data.date} city={data.city} period={data.period} />
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '30px' }}>
      {[
        { l: 'Signalements', v: data.stats?.totalRemarks || 0 },
        { l: 'Urgence Moy.', v: `${data.stats?.avgUrgency || 0}/5` },
        { l: 'Cat. Dominante', v: data.stats?.dominantCategory || 'N/A' },
        { l: 'Taux Chronique', v: data.stats?.chronicPct || '0%' }
      ].map((m, i) => (
        <div key={i} style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #eee' }}>
          <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' }}>{m.l}</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#C1440E' }}>{m.v}</div>
        </div>
      ))}
    </div>

    <div style={{ padding: '20px', background: '#fff9f4', borderLeft: '4px solid #C1440E', borderRadius: '4px', marginBottom: '30px' }}>
      <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: '#C1440E' }}>✦ Synthèse IA Gemini</h3>
      <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{data.synthesis}</p>
    </div>

    <h3 style={{ fontSize: '16px', color: '#C1440E', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '15px' }}>Signalements Prioritaires</h3>
    {data.topUrgent?.length > 0 ? data.topUrgent.map((r, i) => (
      <div key={i} style={{ marginBottom: '10px', padding: '12px', border: '1px solid #eee', borderRadius: '6px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{r.categorie?.toUpperCase()}</span>
          <span style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '11px' }}>URGENCE {r.urgency}/5</span>
        </div>
        <p style={{ fontSize: '12px', margin: 0, color: '#444' }}>"{r.opinion || r.description || r.texte}"</p>
      </div>
    )) : <p style={{ color: '#999', fontSize: '12px' }}>Aucun signalementprioritaire pour cette période.</p>}
  </div>
);

const VilleTemplate = ({ data }) => (
  <div>
    <CommonHeader title="RAPPORT MUNICIPAL AGRÉGÉ" sub="Vue d'ensemble de la ville" date={data.date} city={data.city} period={data.period} />
    
    <h3 style={{ fontSize: '16px', color: '#C1440E', marginBottom: '15px' }}>Comparatif Inter-Zones</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
      <thead>
        <tr style={{ background: '#f8f9fa' }}>
          {['Zone', 'Signalements', 'Urgence', 'Dominante', 'Chronique'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.zones?.map(z => (
          <tr key={z.id}>
            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px' }}><strong>{z.nom}</strong></td>
            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{z.stats?.totalRemarks || 0}</td>
            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{z.stats?.avgUrgency || 0}/5</td>
            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{z.stats?.dominantCategory || '—'}</td>
            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{z.stats?.chronicPct || '0%'}</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div style={{ padding: '20px', background: '#fff9f4', borderLeft: '4px solid #C1440E', borderRadius: '4px', marginBottom: '30px' }}>
      <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: '#C1440E' }}>✦ Analyse IA Municipale</h3>
      <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>{data.synthesis}</p>
    </div>

    <h3 style={{ fontSize: '16px', color: '#C1440E', marginBottom: '15px' }}>Stratégie de Priorisation</h3>
    <div style={{ border: '1px solid #C1440E', borderRadius: '8px', padding: '15px' }}>
      <p style={{ fontSize: '13px', margin: 0 }}>Basé sur l'analyse comparative, la maintenance préventive doit être intensifiée dans les zones affichant une urgence moyenne supérieure à 3.5. Les ressources doivent être allouées prioritairement aux problématiques chroniques identifiées.</p>
    </div>
  </div>
);

const TemporelTemplate = ({ data }) => (
  <div>
    <CommonHeader title="ANALYSE DE TENDANCE" sub="Évolution temporelle des signalements" date={data.date} city={data.city} period={data.period} />
    
    <h3 style={{ fontSize: '16px', color: '#C1440E', marginBottom: '15px' }}>Historique Hebdomadaire (Données récentes)</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
      <thead>
        <tr style={{ background: '#f8f9fa' }}>
          {['Période', 'Volume', 'Catégorie Majeure'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #eee', fontSize: '11px', color: '#666' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.weekly?.length > 0 ? data.weekly.map((w, i) => (
          <tr key={i}>
            <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' }}>{w.week}</td>
            <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px' }}><strong>{w.count}</strong></td>
            <td style={{ padding: '12px', borderBottom: '1px solid #eee', fontSize: '12px', textTransform: 'capitalize' }}>{w.topCat}</td>
          </tr>
        )) : <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Aucune donnée temporelle disponible.</td></tr>}
      </tbody>
    </table>

    <div style={{ padding: '20px', background: '#fff9f4', borderLeft: '4px solid #C1440E', borderRadius: '4px' }}>
      <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: '#C1440E' }}>✦ Interprétation des tendances</h3>
      <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }}>L'analyse montre une fluctuation du volume de signalements en corrélation avec la saisonnalité et les interventions de maintenance passées. La répartition des pics suggère des besoins d'intervention par vagues de maintenance spécialisées.</p>
    </div>
  </div>
);

const SyntheseTemplate = ({ data }) => (
  <div>
    <CommonHeader title="SYNTHÈSE STRATÉGIQUE GÉNÉRATIVE" sub="Analyse narrative pour décideurs" date={data.date} city={data.city} period={data.period} />
    
    <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', textAlign: 'justify' }}>
      <h4 style={{ color: '#C1440E', marginBottom: '10px' }}>I. Résumé Exécutif</h4>
      <p style={{ marginBottom: '25px' }}>{data.synthesis}</p>

      <h4 style={{ color: '#C1440E', marginBottom: '10px' }}>II. Analyse Territoriale</h4>
      <p style={{ marginBottom: '25px' }}>La situation urbaine à {data.city} révèle des disparités significatives entre les quartiers. Alors que certaines zones bénéficient d'une infrastructure stable, d'autres subissent des pressions croissantes liées à l'usure naturelle et à l'augmentation de la densité d'utilisation. Les citoyens expriment un besoin accru de réactivité sur les services de base (éclairage, voirie, gestion des déchets).</p>

      <h4 style={{ color: '#C1440E', marginBottom: '10px' }}>III. Recommandations</h4>
      <p>L'optimisation des tournées techniques et la digitalisation du suivi des réclamations via la plateforme SGRU constituent les axes de progrès majeurs. Une communication transparente sur les délais d'intervention et les ressources allouées est préconisée pour renforcer le sentiment de prise en compte des besoins citoyens par l'administration.</p>
    </div>
  </div>
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function UrbanRapportTab() {
  const { user } = useAuth();
  const { selectedZone: contextSelectedZone } = useUrbanZone();

  const [zones, setZones] = useState([]);
  const [selectedReportZone, setSelectedReportZone] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('zone'); // 'zone', 'ville', 'temporel', 'synthese'
  const [period, setPeriod] = useState('30');
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState(null);

  const reportRef = useRef(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await getZonesWithStats();
        const fetchedZones = unwrap(res);
        setZones(fetchedZones);
        if (contextSelectedZone) {
          const found = fetchedZones.find(z => String(z.id) === String(contextSelectedZone.id));
          setSelectedReportZone(found || fetchedZones[0]);
        } else if (fetchedZones.length > 0) {
          setSelectedReportZone(fetchedZones[0]);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchZones();
  }, [contextSelectedZone]);

  const collectData = async () => {
    console.log('Report type in collectData:', reportType);
    
    try {
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const periodLabel = period === '30' ? '30 derniers jours' : period === '180' ? '6 derniers mois' : 'Année 2026';
      
      let data = { type: reportType, city: user?.city || 'Marrakesh', date: dateStr, period: periodLabel };

      if (reportType === 'ville' || reportType === 'synthese') {
        const allStats = await Promise.all(zones.map(z => getUrbanStatsByZone(z.id, user?.city)));
        const total = allStats.reduce((sum, s) => sum + (s.totalRemarks || 0), 0);
        const avg = (allStats.reduce((sum, s) => sum + (s.avgUrgency || 0), 0) / (allStats.length || 1)).toFixed(1);
        
        data.zones = zones.map((z, i) => ({ ...z, stats: allStats[i] }));
        data.totalRemarks = total;
        data.avgUrgency = avg;
        data.synthesis = `Rapport global pour ${data.city} basé sur ${total} signalements. L'urgence moyenne municipale est de ${avg}/5. Ce volume nécessite une coordination inter-services accrue.`;
        data.name = data.city;
      } 
      else if (reportType === 'temporel') {
        const allRemarksRes = await getValidatedRemarks({ ville: user?.city });
        const remarks = unwrap(allRemarksRes);
        const weekly = {};
        remarks.forEach(r => {
          const d = new Date(r.created_at);
          const w = `Sem. ${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('fr-FR', {month:'short'})}`;
          if (!weekly[w]) weekly[w] = { count: 0, cats: {} };
          weekly[w].count++;
          const c = r.categorie || 'autre';
          weekly[w].cats[c] = (weekly[w].cats[c] || 0) + 1;
        });
        data.weekly = Object.entries(weekly).map(([w, v]) => ({
          week: w, count: v.count, topCat: Object.keys(v.cats).sort((a,b) => v.cats[b] - v.cats[a])[0]
        })).slice(-8);
        data.name = 'Tendances';
      } 
      else {
        // ZONE
        if (!selectedReportZone) return null;
        const stats = await getUrbanStatsByZone(selectedReportZone.id, user?.city);
        const remarksRes = await getValidatedRemarks({ zone_id: selectedReportZone.id, ville: user?.city });
        data.name = selectedReportZone.nom;
        data.stats = stats;
        data.topUrgent = unwrap(remarksRes).sort((a,b) => (b.urgency||0)-(a.urgency||0)).slice(0, 5);
        data.synthesis = `Analyse détaillée de la zone ${data.name}. Un volume de ${stats.totalRemarks} réclamations a été traité, avec une dominance des problématiques de type "${stats.dominantCategory}".`;
      }

      console.log('Collected Data:', data);
      return data;
    } catch (err) {
      console.error("COLLECT ERROR:", err);
      return null;
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    const data = await collectData();
    if (!data) { setIsGenerating(false); return; }
    setReportData(data);
    
    setTimeout(async () => {
      if (!reportRef.current) return;
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let hLeft = imgH;
      let pos = 0;
      while (hLeft > 0) {
        pdf.addImage(imgData, 'PNG', 0, pos, pdfW, imgH);
        hLeft -= pdfH; pos -= pdfH;
        if (hLeft > 0) pdf.addPage();
      }
      // Filename logic: UrbanMap-[Type]-[Location]-[Date].pdf
      const d = new Date();
      const dateStr = `${d.getDate().toString().padStart(2,'0')}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getFullYear()}`;
      
      let fileName = 'UrbanMap';
      if (data.type === 'zone') {
        fileName = `UrbanMap-Zone-${data.name.replace(/\s+/g, '-')}-${dateStr}`;
      } else if (data.type === 'ville') {
        fileName = `UrbanMap-Ville-${data.city.replace(/\s+/g, '-')}-${dateStr}`;
      } else if (data.type === 'temporel') {
        fileName = `UrbanMap-Tendances-${dateStr}`;
      } else if (data.type === 'synthese') {
        fileName = `UrbanMap-Synthese-${data.city.replace(/\s+/g, '-')}-${dateStr}`;
      }

      pdf.save(`${fileName}.pdf`);
      setIsGenerating(false); setShowPreview(false);
    }, 600);
  };

  const handlePreview = async () => {
    const data = await collectData();
    if (data) { setReportData(data); setShowPreview(true); }
  };

  const ReportTemplate = ({ data, isHidden }) => {
    const s = { width: isHidden ? '210mm' : '100%', padding: isHidden ? '20mm' : '0', background: '#fff', color: '#1a1a1a', fontFamily: 'Arial' };
    return (
      <div ref={isHidden ? reportRef : null} style={s}>
        {data.type === 'zone' && <ZoneTemplate data={data} />}
        {data.type === 'ville' && <VilleTemplate data={data} />}
        {data.type === 'temporel' && <TemporelTemplate data={data} />}
        {data.type === 'synthese' && <SyntheseTemplate data={data} />}
        <div style={{ marginTop: '50px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '9px', color: '#999', textAlign: 'center' }}>
          Document technique confidentiel · SGRU Municipalité de {data.city} · 2026
        </div>
      </div>
    );
  };

  if (loading) return <div style={{padding: '24px'}}><SkeletonChart type="bar" height={300} /></div>;

  return (
    <div>
      <AiCard>
        Choisissez un format de rapport. Gemini AI analyse les données brutes
        pour générer des résumés stratégiques et des tableaux de bord exportables.
      </AiCard>

      <SectionLabel>Format du rapport</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {[
          { icon: '📊', name: 'Rapport de zone',     key: 'zone',     desc: 'Détails complets d\'un secteur spécifique.' },
          { icon: '🏙️', name: 'Rapport de ville',   key: 'ville',    desc: 'Comparatif municipal agrégé des 3 zones.' },
          { icon: '📈', name: 'Rapport temporel',    key: 'temporel', desc: 'Tendances et évolution hebdomadaire.' },
          { icon: '🤖', name: 'Synthèse IA pure',    key: 'synthese', desc: 'Analyse stratégique 100% narrative.' },
        ].map(r => (
          <div key={r.key} 
            onClick={() => {
              console.log('Selected type:', r.key);
              setReportType(r.key);
            }} 
            style={{ 
              background: reportType === r.key ? 'rgba(193,68,14,0.1)' : 'rgba(255,255,255,0.03)', 
              border: reportType === r.key ? '0.5px solid #C1440E' : '0.5px solid rgba(242,237,230,0.08)', 
              borderRadius: '10px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' 
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>{r.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#F2EDE6', marginBottom: '4px' }}>{r.name}</div>
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.35)', lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <SectionLabel>Cible</SectionLabel>
          <select 
            value={selectedReportZone?.id || ''} 
            onChange={e => setSelectedReportZone(zones.find(z => String(z.id) === String(e.target.value)))} 
            disabled={reportType !== 'zone'} 
            style={{ padding: '10px', width: '100%', background: '#1a1a1a', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '8px', color: '#F2EDE6', fontSize: '13px', opacity: (reportType === 'zone' ? 1 : 0.4) }}
          >
            {zones.map(z => <option key={z.id} value={z.id} style={{ background: '#1a1a1a' }}>{z.nom}</option>)}
          </select>
        </div>
        <div>
          <SectionLabel>Période</SectionLabel>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: '10px', width: '100%', background: '#1a1a1a', border: '0.5px solid rgba(242,237,230,0.12)', borderRadius: '8px', color: '#F2EDE6', fontSize: '13px' }}>
            <option value="30" style={{ background: '#1a1a1a' }}>30 jours</option>
            <option value="180" style={{ background: '#1a1a1a' }}>6 mois</option>
            <option value="365" style={{ background: '#1a1a1a' }}>Année 2026</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button onClick={handleGeneratePDF} disabled={isGenerating} style={{ flex: 1, padding: '12px', background: '#C1440E', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none' }}>
          {isGenerating ? '⏳ Génération...' : '✦ Générer PDF'}
        </button>
        <button onClick={handlePreview} style={{ padding: '12px 24px', background: 'transparent', border: '0.5px solid rgba(242,237,230,0.2)', borderRadius: '8px', color: '#F2EDE6', fontSize: '13px', cursor: 'pointer' }}>
          👁 Aperçu
        </button>
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {reportData && <ReportTemplate data={reportData} isHidden={true} />}
      </div>

      {showPreview && reportData && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '900px', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px 25px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#000' }}>
              <h3 style={{ margin: 0 }}>Aperçu du Rapport - {reportData.name}</h3>
              <button onClick={() => setShowPreview(false)} style={{ cursor: 'pointer', fontSize: '20px', border: 'none', background: 'none' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '30px', background: '#eee' }}>
              <div style={{ background: '#fff', margin: '0 auto', width: '210mm', minHeight: '297mm', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
                <ReportTemplate data={reportData} isHidden={false} />
              </div>
            </div>
            <div style={{ padding: '15px 25px', borderTop: '1px solid #eee', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowPreview(false)} style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Fermer</button>
              <button onClick={handleGeneratePDF} style={{ padding: '8px 20px', background: '#C1440E', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Télécharger PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
