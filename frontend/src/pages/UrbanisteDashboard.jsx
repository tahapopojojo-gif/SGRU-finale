import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { UrbanZoneProvider, useUrbanZone } from '../context/UrbanZoneContext';
import UrbanCarteTab from '../components/dashboard/UrbanCarteTab';
import UrbanStatistiquesTab from '../components/dashboard/UrbanStatistiquesTab';
import UrbanOpinionsTab from '../components/dashboard/UrbanOpinionsTab';
import UrbanAnnotationsTab from '../components/dashboard/UrbanAnnotationsTab';
import UrbanRapportTab from '../components/dashboard/UrbanRapportTab';
import api from '../services/api';
import * as urbanApi from '../services/urbanApi';
import useResponsive from '../hooks/useResponsive';
import { Map, BarChart2, MessageSquare, BookMarked, FileText, Download, Sparkles } from 'lucide-react';

function CityBadge() {
  const { user } = useAuth()
  const city = user?.city
  return (
    <span>
      {city
        ? city.charAt(0).toUpperCase() + city.slice(1)
        : 'Toutes les villes'}
    </span>
  )
}

function ActiveZoneBanner() {
  const { selectedZone, clearSelectedZone } = useUrbanZone()
  if (!selectedZone) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(193,68,14,0.07)',
      border: '0.5px solid rgba(193,68,14,0.25)',
      borderRadius: '8px', padding: '10px 16px',
      marginBottom: '20px',
      fontSize: '12px', color: 'rgba(242,237,230,0.7)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#C1440E', flexShrink: 0,
          animation: 'pulse 2s infinite',
        }} />
        Filtre actif :{' '}
        <strong style={{ color: '#F2EDE6' }}>{selectedZone.nom}</strong>
      </div>
      <button
        onClick={clearSelectedZone}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(242,237,230,0.35)',
          cursor: 'pointer', fontSize: '11px',
          fontFamily: 'DM Sans, sans-serif',
          padding: '2px 6px', borderRadius: '3px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#F2EDE6'
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'rgba(242,237,230,0.35)'
          e.currentTarget.style.background = 'none'
        }}
      >
        ✕ Effacer
      </button>
    </div>
  )
}

function DashboardInner() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('carte');
  const { selectedZone } = useUrbanZone();
  const isZoneSelected = !!selectedZone;
  const [showAiModal, setShowAiModal] = useState(false);
  const [remarks, setRemarks] = useState([]);
  const tabRefs = useRef({});

  const userCity = user?.city || 'marrakesh';

  useEffect(() => {
    urbanApi.getValidatedRemarks({ ville: userCity })
      .then(res => {
        const data = res?.data?.data || res?.data || res || [];
        setRemarks(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Error loading remarks in dashboard", err));
  }, [userCity]);

  const generateAiSynthesis = () => {
    const zoneRemarks = selectedZone 
      ? remarks.filter(r => r.zone_id === selectedZone.id)
      : remarks;
      
    const total = zoneRemarks.length;
    if (total === 0) {
      return "Aucun signalement disponible pour cette zone afin de générer une synthèse analytique.";
    }
    
    const avgUrgency = (zoneRemarks.reduce((acc, r) => acc + (r.urgency || 1), 0) / total).toFixed(1);
    
    const CAT_LABEL = {
      route: 'Route', eclairage: 'Éclairage', parc: 'Parc',
      dechets: 'Déchets', eau: 'Eau', transport: 'Transport', autre: 'Autre',
    };
    const catCounts = zoneRemarks.reduce((acc, r) => {
      const c = (r.categorie || 'autre').toLowerCase().trim();
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});
    
    let domCat = "autre";
    let maxCat = -1;
    for (const [c, count] of Object.entries(catCounts)) {
      if (count > maxCat) { maxCat = count; domCat = c; }
    }
    const domCatLabel = CAT_LABEL[domCat] || "Autre";
    const domCatCount = catCounts[domCat] || 0;
    
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const secondCatStr = sortedCats.length > 1 
      ? `, suivie de la catégorie ${CAT_LABEL[sortedCats[1][0]] || sortedCats[1][0]} (${sortedCats[1][1]} cas)`
      : "";

    const chronicCount = zoneRemarks.filter(r => {
      const dur = r.residence_duration || r.duration || '';
      return dur.includes("an") || dur.includes("toujours") || dur.includes("mois");
    }).length;
    const chronicPct = Math.round((chronicCount / total) * 100);

    const PROF_LABEL = {
      resident: 'résidents',
      conducteur: 'conducteurs',
      pieton: 'piétons',
      commercant: 'commerçants',
      passant: 'passants'
    };
    const profCounts = zoneRemarks.reduce((acc, r) => {
      const p = (r.profile || 'pieton').toLowerCase().trim();
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});
    let domProf = "pieton";
    let maxProf = -1;
    for (const [p, count] of Object.entries(profCounts)) {
      if (count > maxProf) { maxProf = count; domProf = p; }
    }
    const domProfLabel = PROF_LABEL[domProf] || "piétons";
    const domProfPct = Math.round(((profCounts[domProf] || 0) / total) * 100);

    let recommendedAction = "Intervention recommandée : planification d'une inspection technique sur les points critiques de la zone.";
    const zoneNameLower = (selectedZone?.nom || '').toLowerCase();
    if (zoneNameLower.includes("gueliz") || zoneNameLower.includes("guéliz")) {
      recommendedAction = "Intervention recommandée : réhabilitation de la voirie sur l'axe Mohammed V et renforcement de l'éclairage de sécurité, priorité haute.";
    } else if (zoneNameLower.includes("medina") || zoneNameLower.includes("médina")) {
      recommendedAction = "Intervention recommandée : curage d'urgence du réseau d'assainissement et réorganisation du ramassage des déchets dans les ruelles étroites.";
    } else if (zoneNameLower.includes("syba") || zoneNameLower.includes("salam")) {
      recommendedAction = "Intervention recommandée : rénovation des espaces verts et des aires de jeux du quartier Hay Salam, avec réfection des passages piétons.";
    } else {
      if (domCat === 'route') {
        recommendedAction = "Intervention recommandée : réfection prioritaire de la chaussée et réparation des nids-de-poule signalés.";
      } else if (domCat === 'eclairage') {
        recommendedAction = "Intervention recommandée : remplacement des lampadaires défectueux pour sécuriser les déplacements nocturnes.";
      } else if (domCat === 'dechets') {
        recommendedAction = "Intervention recommandée : déploiement de nouveaux conteneurs à ordures et optimisation des tournées de nettoyage.";
      }
    }

    const zoneTextName = selectedZone ? `La zone ${selectedZone.nom}` : "La ville de Marrakesh";

    return `${zoneTextName} présente ${total} signalements avec une urgence moyenne de ${avgUrgency}/5. La catégorie dominante est ${domCatLabel} (${domCatCount} cas)${secondCatStr}. ${chronicPct}% des problèmes sont chroniques (plus d'un an ou de longue durée), ce qui indique un besoin d'action structurelle. Les ${domProfLabel} représentent le profil majoritaire des signalements (${domProfPct}%). ${recommendedAction}`;
  };

  const switchToTab = useCallback((tabId) => setActiveTab(tabId), []);

  const tabs = [
    { id: 'carte', label: '🗺️ Carte Analytique', textLabel: 'Carte Analytique' },
    { id: 'statistiques', label: '📊 Statistiques Pro', textLabel: 'Statistiques Pro' },
    { id: 'opinions', label: '💬 Opinions Citoyennes', textLabel: 'Opinions Citoyennes' },
    { id: 'annotations', label: '📝 Annotations Privées', textLabel: 'Annotations Privées' },
    { id: 'rapport', label: '📄 Rapport PDF', textLabel: 'Rapport PDF' }
  ];

  const handleTabKeyDown = useCallback((e) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    let nextIndex;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    tabRefs.current[nextTab.id]?.focus();
  }, [activeTab, tabs]);

  const { isMobile } = useResponsive();

  const s = {
    header: {
      background: 'white',
      padding: isMobile ? '80px 16px 16px 16px' : '100px 24px 24px 24px',
      borderBottom: '1px solid #E5E7EB'
    },
    title: {
      margin: 0,
      fontSize: isMobile ? '24px' : '28px',
      fontWeight: 'bold',
      color: '#111827'
    },
    subtitle: {
      margin: '4px 0 0 0',
      fontSize: isMobile ? '14px' : '16px',
      color: '#6B7280'
    },
    tabBar: {
      background: 'white',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex',
      overflowX: 'auto',
      marginBottom: '24px',
      padding: isMobile ? '8px 16px' : '0'
    },
    tabBtn: (isActive) => ({
      padding: isMobile ? '14px 20px' : '12px 24px',
      border: 'none',
      background: isActive && isMobile ? '#EEF2FF' : 'transparent',
      borderRadius: isMobile ? '8px' : '0',
      cursor: 'pointer',
      fontSize: '14px',
      borderBottom: isActive && !isMobile ? '2px solid #6366F1' : '2px solid transparent',
      color: isActive ? '#6366F1' : '#6B7280',
      fontWeight: isActive ? 'bold' : 'normal',
      whiteSpace: 'nowrap',
      outline: 'none',
      textAlign: isMobile ? 'center' : 'left',
      width: isMobile ? '100%' : 'auto'
    })
  };

  return (
<div style={{
  minHeight: activeTab === 'rapport' ? 'auto' : '100vh',
  background: '#060403',
  fontFamily: 'DM Sans, sans-serif', color: '#F2EDE6',
  paddingTop: '52px',
}}>

      {/* Zellige bg */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.025,
        pointerEvents: 'none', zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F2EDE6' stroke-width='0.5'%3E%3Cpolygon points='30,2 58,16 58,44 30,58 2,44 2,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <Navbar />

      {/* Sticky header */}
      <div style={{
        background: 'rgba(8,6,3,0.96)',
        borderBottom: '0.5px solid rgba(242,237,230,0.07)',
        padding: '20px 28px 0',
        position: 'sticky', top: '52px', zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        {/* Header top row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '20px',
        }}>
          <h1 style={{
            fontFamily: 'Amiri, serif', fontSize: '24px',
            fontWeight: 700, color: '#F2EDE6',
            display: 'flex', alignItems: 'center', gap: '12px',
            margin: 0,
          }}>
            Tableau de Bord
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'rgba(193,68,14,0.1)',
              border: '0.5px solid rgba(193,68,14,0.3)',
              borderRadius: '100px', padding: '4px 12px',
              fontSize: '11px', color: '#E8B87A',
              fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
            }}>
              <span style={{width:'5px',height:'5px',background:'#C1440E',
                borderRadius:'50%',display:'inline-block'}}/>
              <CityBadge />
            </span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('rapport')}
              style={{
                padding: '7px 14px', borderRadius: '6px',
                background: 'transparent',
                border: '0.5px solid rgba(242,237,230,0.12)',
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
              <Download size={13} style={{ marginRight: '4px' }} /> Export PDF
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              style={{
                padding: '7px 14px', borderRadius: '6px',
                background: '#C1440E', border: 'none',
                color: '#fff', fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#A8380C'}
              onMouseLeave={e => e.currentTarget.style.background = '#C1440E'}
            >
              <Sparkles size={13} /> Synthèse IA
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <nav style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'carte',        icon: <Map size={14} />,        label: 'Carte Analytique' },
            { id: 'statistiques', icon: <BarChart2 size={14} />,  label: 'Statistiques Pro' },
            { id: 'opinions',     icon: <MessageSquare size={14} />, label: 'Opinions Citoyennes' },
            { id: 'annotations',  icon: <BookMarked size={14} />, label: 'Annotations Privées' },
            { id: 'rapport',      icon: <FileText size={14} />,   label: 'Rapport PDF' },
          ].map(tab => (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[tab.id] = el }}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleTabKeyDown}
              style={{
                padding: '10px 18px', border: 'none',
                background: 'transparent',
                color: activeTab === tab.id
                  ? '#F2EDE6' : 'rgba(242,237,230,0.38)',
                fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer', whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.id
                  ? '2px solid #C1440E' : '2px solid transparent',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = 'rgba(242,237,230,0.7)'
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = 'rgba(242,237,230,0.38)'
              }}
            >
              <span style={{ opacity: activeTab === tab.id ? 1 : 0.5, display: 'flex' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Body */}
      <div style={{
        padding: '24px 28px',
        paddingBottom: ['carte', 'rapport'].includes(activeTab) ? '16px' : '24px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Zone banner */}
        <ActiveZoneBanner />

        {/* Tab panels — keep all existing panel JSX */}
        {activeTab === 'carte' && (
          <div role="tabpanel">
            <UrbanCarteTab onSwitchTab={switchToTab} />
          </div>
        )}
        {activeTab === 'statistiques' && (
          <div role="tabpanel">
            <UrbanStatistiquesTab onSwitchTab={switchToTab} />
          </div>
        )}
        {activeTab === 'opinions' && (
          <div role="tabpanel">
            <UrbanOpinionsTab aiSummary={isZoneSelected ? generateAiSynthesis() : null} />
          </div>
        )}
        {activeTab === 'annotations' && (
          <div role="tabpanel">
            <UrbanAnnotationsTab zoneId={selectedZone?.id} />
          </div>
        )}
        {activeTab === 'rapport' && (
          <div role="tabpanel">
            <UrbanRapportTab />
          </div>
        )}
      </div>

      {/* AI Synthesis Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(6,4,3,0.85)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            background: 'rgba(15,10,8,0.95)',
            border: '0.5px solid rgba(193,68,14,0.3)',
            borderRadius: '16px', width: '90%', maxWidth: '580px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(193,68,14,0.1)',
            overflow: 'hidden', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '0.5px solid rgba(242,237,230,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(193,68,14,0.08) 0%, transparent 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🤖</span>
                <div>
                  <h4 style={{ fontFamily: 'Amiri, serif', fontSize: '18px', color: '#F2EDE6', margin: 0 }}>
                    Synthèse Analytique IA
                  </h4>
                  <p style={{ fontSize: '10px', color: '#E8B87A', margin: '2px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Généré à partir de données réelles — {selectedZone ? selectedZone.nom : 'Toutes les zones'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(242,237,230,0.12)',
                  borderRadius: '50%', width: '28px', height: '28px', color: 'rgba(242,237,230,0.5)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(242,237,230,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', position: 'relative' }}>
              {/* Decorative side accent bar */}
              <div style={{ position: 'absolute', top: '24px', left: '24px', bottom: '24px', width: '2.5px', borderRadius: '1px', background: 'linear-gradient(180deg, #C1440E 0%, #E8B87A 100%)' }} />
              
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', lineHeight: '1.65',
                color: 'rgba(242,237,230,0.88)', margin: '0 0 0 16px',
                textAlign: 'justify', whiteSpace: 'pre-wrap',
              }}>
                {generateAiSynthesis()}
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '0.5px solid rgba(242,237,230,0.06)',
              display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)',
            }}>
              <button
                onClick={() => setShowAiModal(false)}
                style={{
                  padding: '8px 20px', borderRadius: '6px', background: 'transparent',
                  border: '0.5px solid rgba(242,237,230,0.25)', color: '#F2EDE6',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#C1440E'; e.currentTarget.style.color = '#C1440E' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242,237,230,0.25)'; e.currentTarget.style.color = '#F2EDE6' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UrbanisteDashboard() {
  return (
    <UrbanZoneProvider>
      <div style={{
        minHeight: '100vh', background: '#060403',
        color: '#F2EDE6', fontFamily: 'DM Sans, sans-serif',
      }}>
        <DashboardInner />
      </div>
    </UrbanZoneProvider>
  )
}
