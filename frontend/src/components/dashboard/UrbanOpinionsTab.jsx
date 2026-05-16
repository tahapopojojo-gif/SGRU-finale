import React, { useState, useEffect, useCallback } from 'react';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getOpinionsByZone, getZoneSummary, saveZoneSummary } from '../../services/urbanApi';
import { generateZoneSummary } from '../../services/aiService';
import SkeletonTable from '../SkeletonTable.jsx';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';
import { unwrap } from '../../utils/unwrap';

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
  const [opinions, setOpinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'urgency'

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

  if (loading) {
    return (
      <div style={{padding: '24px'}}>
        <SkeletonTable rows={5} columns={3} />
      </div>
    );
  }

  return (
    <div style={s.page}>
      
      {/* Banner */}
      <div style={s.banner} role="status" aria-live="polite">
        <h2 style={s.bannerTitle}><span aria-hidden="true">💬</span> Opinions Citoyennes — {selectedZoneName}</h2>
        <p style={s.bannerSub}>
          {isZoneSelected
            ? `Opinions recueillies dans la zone ${selectedZone.nom}`
            : 'Vue globale — toutes les zones'}
        </p>
      </div>

      {/* Zone AI Summary Card — only when a zone is selected */}
      {isZoneSelected && (
        <section
          aria-label={`Synthèse IA pour ${selectedZoneName}`}
          style={{
            background: 'white',
            borderLeft: `4px solid ${selectedZone?.couleur || '#6366F1'}`,
            padding: '20px',
            borderRadius: 8,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
          {/* Summary card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
              <span aria-hidden="true">🤖</span> Synthèse IA — {selectedZoneName}
            </span>
            {summaryGeneratedAt && (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                Générée le {new Date(summaryGeneratedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </span>
            )}
          </div>

          {/* Loading state */}
          {summaryLoading && (
            <div style={{ marginTop: 14 }} aria-live="polite" role="status">
              <div style={{
                background: '#E5E7EB', height: 16, borderRadius: 4,
                width: '100%', opacity: 0.6
              }} aria-hidden="true" />
              <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 13, marginTop: 8 }}>
                <span aria-hidden="true">⏳</span> Génération en cours...
              </p>
            </div>
          )}

          {/* Summary text */}
          {!summaryLoading && zoneSummary && (
            <>
              <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, marginTop: 12 }}>
                {zoneSummary}
              </p>
              {summaryError && (
                <p role="alert" style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>
                  ❌ Impossible de générer la synthèse. Réessayez.
                </p>
              )}
              <button
                onClick={handleGenerateSummary}
                aria-label="Régénérer la synthèse IA"
                style={{
                  marginTop: 12, padding: '6px 14px', fontSize: 13, fontWeight: 600,
                  borderRadius: 6, border: '1px solid #D1D5DB', background: 'white',
                  color: '#374151', cursor: 'pointer'
                }}
              >
                <span aria-hidden="true">🔄</span> Régénérer
              </button>
            </>
          )}

          {/* No summary yet */}
          {!summaryLoading && !zoneSummary && (
            <div style={{ marginTop: 12 }}>
              {summaryError && (
                <p role="alert" style={{ color: '#EF4444', fontSize: 13, marginBottom: 8 }}>
                  ❌ Impossible de générer la synthèse. Réessayez.
                </p>
              )}
              {!summaryError && (
                <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 14, marginBottom: 12 }}>
                  Aucune synthèse générée pour cette zone.
                </p>
              )}
              <button
                onClick={handleGenerateSummary}
                aria-label="Générer la synthèse IA pour cette zone"
                style={{
                  padding: '8px 16px', background: '#6366F1', color: 'white',
                  border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span aria-hidden="true">✨</span> Générer la synthèse IA
              </button>
            </div>
          )}
        </section>
      )}

      {/* Quick Stats */}
      <div style={s.statsRow} role="region" aria-label="Statistiques rapides des opinions">
        <div style={s.statCard}>
          <span style={s.statNum}>{opinions.length}</span>
          <span style={s.statLabel}>Opinions recueillies</span>
        </div>
        <div style={s.statCard}>
          <span style={{ ...s.statNum, color: '#EF4444' }}>{urgentCount}</span>
          <span style={s.statLabel}>Urgence élevée (≥4)</span>
        </div>
        <div style={s.statCard}>
          <span style={{ ...s.statNum, color: '#6366F1' }}>{avgUrgency}</span>
          <span style={s.statLabel}>Urgence moyenne / 5</span>
        </div>
      </div>

      {/* Toolbar: search, category filter, sort */}
      <div style={s.toolbar} role="search" aria-label="Filtres et recherche d'opinions">
        <label htmlFor="opinion-search" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Rechercher une opinion</label>
        <input
          id="opinion-search"
          type="text"
          placeholder="🔍 Rechercher une opinion..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={s.input}
          aria-label="Rechercher une opinion"
        />
        <label htmlFor="opinion-category-filter" className="sr-only" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Filtrer par catégorie</label>
        <select id="opinion-category-filter" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={s.select} aria-label="Filtrer par catégorie">
          <option value="">Toutes les catégories</option>
          {categories.map(c => (
            <option key={c} value={c}>{CAT_EMOJI[c]} {CAT_LABEL[c]}</option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: 6 }} role="radiogroup" aria-label="Trier les opinions par">
          <button style={s.sortBtn(sortBy === 'date')} onClick={() => setSortBy('date')} role="radio" aria-checked={sortBy === 'date'}><span aria-hidden="true">🕒</span> Date</button>
          <button style={s.sortBtn(sortBy === 'urgency')} onClick={() => setSortBy('urgency')} role="radio" aria-checked={sortBy === 'urgency'}><span aria-hidden="true">⚡</span> Urgence</button>
        </div>
      </div>

      {/* Result count */}
      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16, fontWeight: 500 }} aria-live="polite" role="status">
        {filteredOpinions.length} opinion{filteredOpinions.length > 1 ? 's' : ''} affichée{filteredOpinions.length > 1 ? 's' : ''}
      </div>

      {/* Opinions Grid */}
      {filteredOpinions.length === 0 ? (
        <EmptyState 
          icon="💬"
          title="Aucune opinion validée"
          subtitle="Les avis non pertinents sont filtrés par l'IA"
        />
      ) : (
        <div style={s.grid}>
          {filteredOpinions.map(opinion => (
            <article key={opinion.id} style={s.card} aria-label={`Opinion de ${PROFILE_LABEL[opinion.profile] || opinion.profile} dans ${opinion.zone_nom}`}>
              <div style={s.cardHeader}>
                <span style={s.catBadge(opinion.categorie)}>
                  <span aria-hidden="true">{CAT_EMOJI[opinion.categorie] || '❓'}</span> {CAT_LABEL[opinion.categorie] || opinion.categorie}
                </span>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
                  {opinion.zone_nom}
                </span>
              </div>

              <blockquote style={s.quote}>
                "{opinion.opinion}"
              </blockquote>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <UrgencyDots value={opinion.urgency} />
              </div>

              <div style={s.cardFooter}>
                <span style={s.profile}>
                  <span aria-hidden="true">👤</span> {PROFILE_LABEL[opinion.profile] || opinion.profile}
                </span>
                <time style={s.date} dateTime={opinion.created_at}>
                  {new Date(opinion.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </time>
              </div>
            </article>
          ))}
        </div>
      )}

    </div>
  );
}
