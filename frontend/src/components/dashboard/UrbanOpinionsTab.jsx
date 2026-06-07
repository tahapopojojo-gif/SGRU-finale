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
  route: '🛣️', eclairage: '💡', parc: '🌳',
  dechets: '🗑️', eau: '💧', transport: '🚌', autre: '❓',
};
const CAT_LABEL = {
  route: 'Route', eclairage: 'Éclairage', parc: 'Parc',
  dechets: 'Déchets', eau: 'Eau', transport: 'Transport', autre: 'Autre',
};
const PROFILE_LABEL = {
  resident: 'Résident', conducteur: 'Conducteur', pieton: 'Piéton',
  commercant: 'Commerçant', passant: 'Passant',
};

function UrgencyBadge({ value }) {
  let color;
  if (value >= 4) color = '#EF4444'; // Red for Urgent (4-5)
  else if (value >= 3) color = '#F59E0B'; // Amber for Medium (3)
  else color = '#22C55E'; // Green for Low (1-2)

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: `rgba(255,255,255,0.08)`,
      border: `0.5px solid ${color}4D`, // 30% opacity
      borderRadius: '100px', padding: '4px 10px',
      fontSize: '11px', color: color,
      fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
      letterSpacing: '0.01em',
    }}>
      <span style={{ width: '5px', height: '5px', background: color, borderRadius: '50%', display: 'inline-block' }} />
      Urgence {value}/5
    </span>
  );
}

function DurationTag({ duration }) {
  let label = "Moins d'un mois";
  let color = '#6B7280'; // Default gray

  if (duration) {
    const lowerDuration = duration.toLowerCase();
    if (lowerDuration.includes("plus d'un an") || lowerDuration.includes("toujours")) {
      label = "Chronique";
      color = '#EF4444'; // Red for chronic
    } else if (lowerDuration.includes("mois")) {
      label = "Quelques mois";
      color = '#F59E0B'; // Amber for months
    } else if (lowerDuration.includes("semaine")) {
      label = "Quelques semaines";
      color = '#00BFFF'; // DeepSkyBlue for weeks
    }
  }

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      color: color,
      background: `rgba(255,255,255,0.05)`,
      border: `0.5px solid ${color}4D`,
      borderRadius: '100px',
      padding: '4px 10px',
      letterSpacing: '0.01em',
    }}>
      {label}
    </span>
  );
}

function ReporterProfileTag({ profile }) {
  const label = PROFILE_LABEL[profile?.toLowerCase()] || 'Inconnu';
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      color: '#A78BFA', // Light purple
      background: 'rgba(167, 139, 250, 0.08)',
      border: '0.5px solid rgba(167, 139, 250, 0.3)',
      borderRadius: '100px',
      padding: '4px 10px',
      letterSpacing: '0.01em',
    }}>
      {label}
    </span>
  );
}

export default function UrbanOpinionsTab({ aiSummary }) {
  const { selectedZone, selectedZoneName, isZoneSelected } = useUrbanZone();
  const { user } = useAuth();
  const userCity = user?.city || null;
  const [opinions, setOpinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'urgent', 'chronic'
  const [expandedCard, setExpandedCard] = useState(null);

  const fetchOpinions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOpinionsByZone(selectedZone?.id, filterCategory === 'all' ? undefined : filterCategory, userCity);
      setOpinions(unwrap(res));
    } catch (err) {
      console.error("Error fetching opinions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedZone, userCity, filterCategory]);

  useEffect(() => {
    fetchOpinions();
  }, [fetchOpinions]);

  const filteredOpinions = opinions.filter(op => {
    // 1. Filter out empty descriptions
    const text = (op.opinion || op.description || op.texte || '').trim();
    if (!text) return false;

    // 2. Category filter
    if (filterCategory !== 'all' && (op.categorie !== filterCategory && op.category !== filterCategory)) {
      return false;
    }
    
    // 3. Quick filters (Urgent / Chronic)
    if (activeFilter === 'urgent' && (op.urgency || 0) < 4) return false;
    if (activeFilter === 'chronic') {
      const dur = (op.residence_duration || op.duration || '').toLowerCase();
      if (!dur.includes("an") && !dur.includes("toujours")) return false;
    }

    // 4. Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const cat = (op.categorie || op.category || '').toLowerCase();
      const zone = (op.zone_nom || '').toLowerCase();
      if (!text.includes(q) && !cat.includes(q) && !zone.includes(q)) return false;
    }

    return true;
  });

  // Grouping logic
  const groupedOpinions = filteredOpinions.reduce((acc, op) => {
    const cat = op.categorie || op.category || 'autre';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(op);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedOpinions).sort();

  if (loading) {
    return <div style={{padding: '24px'}}><SkeletonTable rows={5} columns={3} /></div>;
  }

  const hasAnyOpinions = opinions.some(op => (op.opinion || op.description || op.texte || '').trim());

  return (
    <div>
      {/* Header / Filter Row */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'urgent', label: '🔴 Urgentes' },
            { id: 'chronic', label: '⏳ Chroniques' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '6px 14px', borderRadius: '100px',
                fontSize: '11px', fontWeight: 500,
                background: activeFilter === f.id ? 'rgba(193,68,14,0.15)' : 'rgba(255,255,255,0.03)',
                border: activeFilter === f.id ? '0.5px solid #C1440E' : '0.5px solid rgba(242,237,230,0.1)',
                color: activeFilter === f.id ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', flex: isZoneSelected ? 1 : 'none', justifyContent: 'flex-end' }}>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: '6px',
              background: '#1a1a1a',
              border: '0.5px solid rgba(242,237,230,0.12)',
              color: '#F2EDE6', fontSize: '12px',
              outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="all" style={{ background: '#1a1a1a', color: '#F2EDE6' }}>Toutes les catégories</option>
            {Object.keys(CAT_LABEL).map(cat => (
              <option key={cat} value={cat} style={{ background: '#1a1a1a', color: '#F2EDE6' }}>
                {CAT_LABEL[cat]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="🔍 Chercher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.12)',
              color: '#F2EDE6', fontSize: '12px', outline: 'none',
              maxWidth: '180px'
            }}
          />
        </div>
      </div>

      {/* AI Summary Section */}
      <AiCard>
        {isZoneSelected 
          ? (aiSummary || "Analyse en cours...") 
          : 'Sélectionnez une zone sur la carte pour générer une synthèse IA des opinions citoyennes.'}
      </AiCard>

      {/* Grouped Feed */}
      {!hasAnyOpinions ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
          border: '0.5px dashed rgba(242,237,230,0.1)', marginTop: '20px'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>💬</div>
          <h4 style={{ color: '#F2EDE6', margin: '0 0 8px 0', fontFamily: 'Amiri, serif' }}>
            Aucune opinion textuelle disponible
          </h4>
          <p style={{ color: 'rgba(242,237,230,0.4)', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>
            Les citoyens n'ont pas ajouté de description à leurs signalements pour cette zone. 
            Les données brutes restent consultables dans l'onglet statistiques.
          </p>
        </div>
      ) : filteredOpinions.length === 0 ? (
        <EmptyState 
          icon="🔍"
          title="Aucun résultat"
          subtitle="Ajustez vos filtres ou votre recherche pour trouver des opinions."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}>
          {sortedCategories.map(cat => (
            <div key={cat}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '0.5px solid rgba(242,237,230,0.06)'
              }}>
                <span style={{ fontSize: '16px' }}>{CAT_EMOJI[cat] || '📌'}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#E8B87A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {CAT_LABEL[cat] || cat}
                </span>
                <span style={{
                  fontSize: '11px', color: 'rgba(242,237,230,0.25)',
                  background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '100px'
                }}>
                  {groupedOpinions[cat].length} signalements
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {groupedOpinions[cat].map(op => {
                  const isExpanded = expandedCard === op.id;
                  const urgencyColor = op.urgency >= 4 ? '#EF4444' : op.urgency >= 3 ? '#F59E0B' : '#22C55E';
                  const text = op.opinion || op.description || op.texte || '';
                  
                  return (
                    <div
                      key={op.id}
                      onClick={() => setExpandedCard(isExpanded ? null : op.id)}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `0.5px solid ${isExpanded ? 'rgba(193,68,14,0.3)' : 'rgba(242,237,230,0.07)'}`,
                        borderRadius: '10px', padding: '14px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden'
                      }}
                    >
                      {/* Left accent for urgency */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: '3px', background: urgencyColor, opacity: 0.6
                      }} />

                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', marginBottom: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#F2EDE6' }}>
                            {CAT_EMOJI[cat]} {CAT_LABEL[cat]}
                          </span>
                          <span style={{ color: 'rgba(242,237,230,0.2)', fontSize: '12px' }}>·</span>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '11px', color: urgencyColor, fontWeight: 600
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: urgencyColor }} />
                            Urgence {op.urgency}/5
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.25)' }}>
                          {new Date(op.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>

                      <div style={{
                        fontSize: '13px', color: 'rgba(242,237,230,0.7)',
                        lineHeight: 1.6, fontStyle: 'italic', marginBottom: '12px'
                      }}>
                        "{isExpanded ? text : `${text.substring(0, 140)}${text.length > 140 ? '...' : ''}`}"
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <ReporterProfileTag profile={op.profile || op.reporter_profile} />
                        <DurationTag duration={op.residence_duration || op.duration} />
                        
                        {isExpanded && op.affected_groups && (
                          <div style={{
                            display: 'flex', gap: '6px', marginTop: '4px',
                            width: '100%', padding: '8px 0',
                            borderTop: '0.5px solid rgba(242,237,230,0.05)'
                          }}>
                            <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase' }}>
                              Impactés:
                            </span>
                            {(Array.isArray(op.affected_groups) ? op.affected_groups : [op.affected_groups]).map((g, i) => (
                              <span key={i} style={{ fontSize: '11px', color: '#E8B87A' }}>
                                {g.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
