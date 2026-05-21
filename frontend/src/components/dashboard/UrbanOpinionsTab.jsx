import React, { useState, useEffect, useCallback } from 'react';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getOpinionsByZone, getZoneSummary, saveZoneSummary } from '../../services/urbanApi';
import { generateZoneSummary } from '../../services/aiService';
import SkeletonTable from '../SkeletonTable.jsx';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';
import { unwrap } from '../../utils/unwrap';
import { AiCard, StatusBadge } from './UDComponents';

const CAT_EMOJI = {
  hopital: '🏥', ecole: '🏫', parc: '🌳', route: '🛣️', autre: '❓'
};
const CAT_LABEL = {
  hopital: 'Hôpital', ecole: 'École', parc: 'Parc', route: 'Route', autre: 'Autre'
};
const PROFILE_LABEL = {
  resident: 'Résident', visitor: 'Visiteur', worker: 'Travailleur', student: 'Étudiant'
};

function UrgencyDots({ value }) {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center' }} role="img" aria-label={`Urgence ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= value
              ? (value >= 4 ? '#EF4444' : value >= 3 ? '#F59E0B' : '#22C55E')
              : '#E5E7EB'
          }}
        />
      ))}
      <span style={{ marginLeft: 4, fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{value}/5</span>
    </span>
  );
}

export default function UrbanOpinionsTab() {
  const { selectedZone, selectedZoneName, isZoneSelected } = useUrbanZone();
  const { user } = useAuth();
  const userCity = user?.city || null;
  let [opinions, setOpinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'urgency'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- Zone Summary State ---
  const [zoneSummary, setZoneSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState(null);
  const [summaryError, setSummaryError] = useState(false);

  const categories = ['hopital', 'ecole', 'parc', 'route', 'autre'];

  const loadOpinions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOpinionsByZone(
        isZoneSelected ? selectedZone.id : null,
        filterCategory || null,
        userCity // scope to urbanist's city
      );
      const data = unwrap(response);
      setOpinions(data);
    } catch (err) {
      console.error('Error loading opinions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedZone, isZoneSelected, filterCategory, userCity]);

  useEffect(() => {
    loadOpinions();
  }, [loadOpinions]);

  // Load existing summary when selected zone changes
  useEffect(() => {
    if (!isZoneSelected || !selectedZone?.id) {
      setZoneSummary(null);
      setSummaryGeneratedAt(null);
      setSummaryError(false);
      return;
    }
    const loadSummary = async () => {
      try {
        const res = await getZoneSummary(selectedZone.id);
        if (res?.data) {
          setZoneSummary(res.data.summary_text);
          setSummaryGeneratedAt(res.data.generated_at);
        } else {
          setZoneSummary(null);
          setSummaryGeneratedAt(null);
        }
      } catch (err) {
        console.error('Error loading zone summary:', err);
        setZoneSummary(null);
      }
      setSummaryError(false);
    };
    loadSummary();
  }, [selectedZone, isZoneSelected]);

  const handleGenerateSummary = async () => {
    if (!isZoneSelected || !selectedZone) return;
    setSummaryLoading(true);
    setSummaryError(false);
    try {
      // Use opinions already in state, filtered to the selected zone
      const zoneOpinions = opinions.filter(o => o.zone_nom === selectedZone.nom);
      const source = zoneOpinions.length > 0 ? zoneOpinions : opinions;
      const result = await generateZoneSummary(source, selectedZone.nom);
      if (result && result.trim()) {
        await saveZoneSummary(selectedZone.id, result);
        setZoneSummary(result);
        setSummaryGeneratedAt(new Date().toISOString());
      } else {
        setSummaryError(true);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Client-side search + sort
  const filteredOpinions = opinions
    .filter(o => {
      if (!searchText) return true;
      return o.opinion?.toLowerCase().includes(searchText.toLowerCase()) ||
             o.zone_nom?.toLowerCase().includes(searchText.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'urgency') return b.urgency - a.urgency;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const s = {
    page: { padding: '24px', background: '#F9FAFB', fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
    banner: {
      background: isZoneSelected ? 'white' : '#F3F4F6',
      borderLeft: `4px solid ${isZoneSelected ? selectedZone.couleur : '#9CA3AF'}`,
      padding: '16px 24px', borderRadius: 8, marginBottom: 24,
      boxShadow: isZoneSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
    },
    bannerTitle: { fontSize: 18, fontWeight: 'bold', margin: '0 0 4px 0', color: '#111827' },
    bannerSub: { fontSize: 14, color: '#6B7280', margin: 0 },
    toolbar: { display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' },
    input: { padding: '10px 16px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', flex: 1, minWidth: 200 },
    select: { padding: '10px 16px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', cursor: 'pointer' },
    sortBtn: (active) => ({
      padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: active ? 'none' : '1px solid #E5E7EB',
      background: active ? '#6366F1' : 'white',
      color: active ? 'white' : '#374151'
    }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
    card: {
      background: 'white', borderRadius: 12, padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 14
    },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    catBadge: (cat) => {
      const colors = { hopital: ['#FFF0F0','#991B1B'], ecole: ['#EFF6FF','#1E40AF'], parc: ['#F0FDF4','#166534'], route: ['#FFFBEB','#854D0E'], autre: ['#F9FAFB','#374151'] };
      const [bg, color] = colors[cat] || ['#F9FAFB', '#374151'];
      return { padding: '4px 10px', borderRadius: 20, background: bg, color, fontSize: 12, fontWeight: 700 };
    },
    quote: { fontSize: 15, color: '#374151', lineHeight: 1.7, margin: 0, fontStyle: 'italic', borderLeft: '3px solid #E5E7EB', paddingLeft: 14 },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F3F4F6' },
    profile: { fontSize: 13, color: '#6B7280', fontWeight: 600 },
    date: { fontSize: 12, color: '#9CA3AF' },
    empty: { textAlign: 'center', padding: '80px 24px', color: '#9CA3AF' },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
    statCard: { background: 'white', padding: '20px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
    statNum: { fontSize: 32, fontWeight: 900, color: '#111827', display: 'block' },
    statLabel: { fontSize: 13, color: '#6B7280', fontWeight: 500 }
  };

  // Quick stats
  const avgUrgency = opinions.length > 0
    ? (opinions.reduce((acc, o) => acc + o.urgency, 0) / opinions.length).toFixed(1)
    : 0;
  const urgentCount = opinions.filter(o => o.urgency >= 4).length;

  const aiSummary = zoneSummary;
  const displayedOpinions = (opinions || []).filter(op => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const text = (op.opinion || op.description || '').toLowerCase();
      const cat = (op.categorie || '').toLowerCase();
      const zone = (op.zone_nom || '').toLowerCase();
      if (!text.includes(q) && !cat.includes(q) && !zone.includes(q)) return false;
    }
    if (filterStatus && filterStatus !== 'all') {
      if (op.statut !== filterStatus) return false;
    }
    return true;
  });
  opinions = displayedOpinions;

  if (loading) {
    return (
      <div style={{padding: '24px'}}>
        <SkeletonTable rows={5} columns={3} />
      </div>
    );
  }

  return (
    <div>
      {/* Filter row */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: '16px',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="🔍  Chercher dans les opinions..."
          value={searchQuery || ''}
          onChange={e => setSearchQuery && setSearchQuery(e.target.value)}
          style={{
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
            flex: 1, minWidth: '180px', maxWidth: '260px',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.12)'}
        />
        {['Toutes','✅ Validées','⏳ En attente','🔴 Urgentes','❌ Rejetées'].map((f,i) => (
          <button
            key={i}
            onClick={() => setFilterStatus && setFilterStatus(
              ['all','validee','en_attente','urgent','rejete'][i]
            )}
            style={{
              padding: '5px 12px', borderRadius: '100px',
              fontSize: '11px',
              border: (filterStatus === ['all','validee','en_attente','urgent','rejete'][i] || (!filterStatus && i===0))
                ? '0.5px solid rgba(193,68,14,0.5)'
                : '0.5px solid rgba(242,237,230,0.1)',
              color: (filterStatus === ['all','validee','en_attente','urgent','rejete'][i] || (!filterStatus && i===0))
                ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
              background: (filterStatus === ['all','validee','en_attente','urgent','rejete'][i] || (!filterStatus && i===0))
                ? 'rgba(193,68,14,0.1)' : 'transparent',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >{f}</button>
        ))}
      </div>

      {/* AI summary card */}
      <AiCard>
        {aiSummary || 'Sélectionnez une zone sur la carte pour générer une synthèse IA des opinions citoyennes.'}
      </AiCard>

      {/* Opinion cards list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(opinions || []).length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px',
            color: 'rgba(242,237,230,0.25)', fontSize: '13px',
          }}>
            Aucune opinion trouvée
          </div>
        ) : (opinions || []).map(op => (
          <div
            key={op.id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(242,237,230,0.07)',
              borderRadius: '8px', padding: '12px 14px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(193,68,14,0.3)'
              e.currentTarget.style.background = 'rgba(193,68,14,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(242,237,230,0.07)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '7px',
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 500, color: '#F2EDE6',
              }}>
                {op.zone_nom || op.categorie || 'Signalement'}
              </span>
              <StatusBadge status={op.statut} />
            </div>
            <div style={{
              fontSize: '12px', color: 'rgba(242,237,230,0.6)',
              lineHeight: 1.5, fontStyle: 'italic',
            }}>
              "{(op.opinion || op.description || '').substring(0, 140)}
              {(op.opinion || '').length > 140 ? '...' : ''}"
            </div>
            <div style={{
              display: 'flex', gap: '10px', marginTop: '6px',
              fontSize: '10px', color: 'rgba(242,237,230,0.28)',
            }}>
              <span>Urgence {op.urgency}/5</span>
              <span>{new Date(op.created_at).toLocaleDateString('fr-FR')}</span>
              {op.categorie && <span>{op.categorie}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
