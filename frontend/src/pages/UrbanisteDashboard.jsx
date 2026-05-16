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

function CityBadge() {
  const { user } = useAuth();
  const city = user?.city;
  return (
    <span style={{
      backgroundColor: city ? '#EDE9FE' : '#F3F4F6',
      color: city ? '#5B21B6' : '#6B7280',
      padding: '4px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      marginLeft: '12px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      {city ? `📍 ${city.charAt(0).toUpperCase() + city.slice(1)}` : '🌍 Toutes les villes'}
    </span>
  );
}

function ActiveZoneBanner() {
  const { selectedZone, clearSelectedZone } = useUrbanZone();

  if (!selectedZone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        margin: '0 24px 24px 24px',
        padding: '12px 24px',
        background: 'white',
        borderLeft: `4px solid ${selectedZone.couleur || '#6366F1'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: '8px'
      }}>
      <span style={{ fontWeight: 'bold', color: '#374151', fontSize: '14px' }}>
        <span aria-hidden="true">📍</span> Filtre actif : {selectedZone.nom}
      </span>
      <button 
        onClick={clearSelectedZone}
        aria-label="Effacer le filtre de zone"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#EF4444',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ✕ Effacer
      </button>
    </div>
  );
}

function DashboardInner() {
  const [activeTab, setActiveTab] = useState('carte');
  const { selectedZone } = useUrbanZone();
  const tabRefs = useRef({});

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
    <>
      <Navbar />
      <div style={{ paddingTop: '64px' }}> {/* Assuming standard navbar height */}
        <a
          href="#urban-main-content"
          style={{
            position: 'absolute', left: '-9999px', top: 'auto',
            width: '1px', height: '1px', overflow: 'hidden',
            zIndex: 9999, padding: '8px 16px',
            background: '#6366F1', color: '#fff', fontWeight: 700,
            borderRadius: '0 0 8px 0', fontSize: '14px', textDecoration: 'none'
          }}
          onFocus={(e) => { e.target.style.left = '0'; e.target.style.width = 'auto'; e.target.style.height = 'auto'; }}
          onBlur={(e) => { e.target.style.left = '-9999px'; e.target.style.width = '1px'; e.target.style.height = '1px'; }}
        >
          Skip to content
        </a>

        <header role="banner" style={s.header}>
          <h1 style={{ ...s.title, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            Tableau de Bord Urbaniste
            <CityBadge />
          </h1>
          <p style={s.subtitle}>Analyse et rapport des données urbaines</p>
        </header>

        <nav role="navigation" aria-label="Urbaniste Dashboard Tabs" style={s.tabBar}>
          <div role="tablist" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '4px' : '0', width: '100%' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  role="tab"
                  id={`urban-tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`urban-tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  style={s.tabBtn(isActive)}
                  onMouseEnter={(e) => {
                    if (activeTab !== tab.id) e.target.style.background = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab.id) e.target.style.background = 'transparent';
                  }}
                  onFocus={(e) => { e.target.style.outline = '3px solid #6366F1'; e.target.style.outlineOffset = '2px'; }}
                  onBlur={(e) => { e.target.style.outline = 'none'; }}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={handleTabKeyDown}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        <ActiveZoneBanner />

        <main id="urban-main-content" role="main" style={{ padding: isMobile ? '0 16px 16px 16px' : '0 24px 24px 24px' }}>
          <div
            role="tabpanel"
            id="urban-tabpanel-carte"
            aria-labelledby="urban-tab-carte"
            style={{ display: activeTab === 'carte' ? 'block' : 'none' }}
            tabIndex={0}
          >
            <UrbanCarteTab onSwitchTab={switchToTab} />
          </div>
          <div
            role="tabpanel"
            id="urban-tabpanel-statistiques"
            aria-labelledby="urban-tab-statistiques"
            style={{ display: activeTab === 'statistiques' ? 'block' : 'none' }}
            tabIndex={0}
          >
            <UrbanStatistiquesTab onSwitchTab={switchToTab} />
          </div>
          <div
            role="tabpanel"
            id="urban-tabpanel-opinions"
            aria-labelledby="urban-tab-opinions"
            style={{ display: activeTab === 'opinions' ? 'block' : 'none' }}
            tabIndex={0}
          >
            <UrbanOpinionsTab />
          </div>
          <div
            role="tabpanel"
            id="urban-tabpanel-annotations"
            aria-labelledby="urban-tab-annotations"
            style={{ display: activeTab === 'annotations' ? 'block' : 'none' }}
            tabIndex={0}
          >
            <UrbanAnnotationsTab zoneId={selectedZone?.id} />
          </div>
          <div
            role="tabpanel"
            id="urban-tabpanel-rapport"
            aria-labelledby="urban-tab-rapport"
            style={{ display: activeTab === 'rapport' ? 'block' : 'none' }}
            tabIndex={0}
          >
            <UrbanRapportTab />
          </div>
        </main>
      </div>
    </>
  );
}

export default function UrbanisteDashboard() {
  return (
    <UrbanZoneProvider>
      <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
        <DashboardInner />
      </div>
    </UrbanZoneProvider>
  );
}
