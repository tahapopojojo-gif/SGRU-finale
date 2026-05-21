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
    <div style={{
      minHeight: '100vh', background: '#060403',
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
        position: 'sticky', top: '0', zIndex: 100,
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
              ⬇ Export PDF
            </button>
            <button
              style={{
                padding: '7px 14px', borderRadius: '6px',
                background: '#C1440E', border: 'none',
                color: '#fff', fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#A8380C'}
              onMouseLeave={e => e.currentTarget.style.background = '#C1440E'}
            >
              ✦ Synthèse IA
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <nav style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'carte',        icon: '🗺',  label: 'Carte Analytique' },
            { id: 'statistiques', icon: '📊', label: 'Statistiques Pro' },
            { id: 'opinions',     icon: '💬', label: 'Opinions Citoyennes' },
            { id: 'annotations',  icon: '📝', label: 'Annotations Privées' },
            { id: 'rapport',      icon: '📄', label: 'Rapport PDF' },
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
              <span style={{ fontSize: '13px', opacity: 0.7 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Body */}
      <div style={{
        padding: '24px 28px',
        position: 'relative', zIndex: 1,
      }}>

        {/* Zone banner — replace ActiveZoneBanner component */}
        <ActiveZoneBanner />

        {/* Tab panels — keep all existing panel JSX */}
        <div role="tabpanel" style={{ display: activeTab === 'carte' ? 'block' : 'none' }}>
          <UrbanCarteTab onSwitchTab={switchToTab} />
        </div>
        <div role="tabpanel" style={{ display: activeTab === 'statistiques' ? 'block' : 'none' }}>
          <UrbanStatistiquesTab onSwitchTab={switchToTab} />
        </div>
        <div role="tabpanel" style={{ display: activeTab === 'opinions' ? 'block' : 'none' }}>
          <UrbanOpinionsTab />
        </div>
        <div role="tabpanel" style={{ display: activeTab === 'annotations' ? 'block' : 'none' }}>
          <UrbanAnnotationsTab zoneId={selectedZone?.id} />
        </div>
        <div role="tabpanel" style={{ display: activeTab === 'rapport' ? 'block' : 'none' }}>
          <UrbanRapportTab />
        </div>
      </div>
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
