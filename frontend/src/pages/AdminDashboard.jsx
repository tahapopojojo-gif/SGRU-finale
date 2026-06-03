import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AdminRemarquesTab from '../components/dashboard/AdminRemarquesTab';
import AdminZonesTab from '../components/dashboard/AdminZonesTab';
import AdminStatistiquesTab from '../components/dashboard/AdminStatistiquesTab';
import AdminExportTab from '../components/dashboard/AdminExportTab';
import AdminUsersTab from '../components/admin/AdminUsersTab';
import useResponsive from '../hooks/useResponsive';

function CityBadge() {
  const { user } = useAuth()
  const city = user?.city
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'rgba(193,68,14,0.1)',
      border: '0.5px solid rgba(193,68,14,0.3)',
      borderRadius: '100px', padding: '3px 10px',
      fontSize: '11px', color: '#E8B87A',
      fontFamily: 'DM Sans, sans-serif', fontWeight: 400,
    }}>
      <span style={{width:'5px',height:'5px',background:'#C1440E',
        borderRadius:'50%',display:'inline-block'}}/>
      {city
        ? city.charAt(0).toUpperCase() + city.slice(1)
        : 'Toutes les villes'}
    </span>
  )
}

export default function AdminDashboard() {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('remarques');
  const tabRefs = useRef({});

  const tabs = [
    { id: 'remarques', label: 'Remarques', icon: '📋' },
    { id: 'zones', label: 'Zones', icon: '🗺️' },
    { id: 'statistiques', label: 'Statistiques', icon: '📊' },
    { id: 'export', label: 'Export CSV', icon: '📥' },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: '👥' },
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

  return (
    <div style={{
      minHeight: '100vh', background: '#060403',
      color: '#F2EDE6', fontFamily: 'DM Sans, sans-serif',
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
        background: 'rgba(8,6,3,0.97)',
        borderBottom: '0.5px solid rgba(242,237,230,0.07)',
        padding: '18px 28px 0',
        position: 'sticky', top: '52px', zIndex: 100,
        backdropFilter: 'blur(16px)',
        /* Red gradient bottom line */
        boxShadow: 'inset 0 -1px 0 0 transparent',
      }}>
        {/* Gradient bottom line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '1px', pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent, rgba(193,68,14,0.35) 30%, rgba(193,68,14,0.35) 70%, transparent)',
        }} />

        {/* Header top row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '18px',
        }}>
          {/* Left: label + title */}
          <div>
            <div style={{
              fontSize: '10px', letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(242,237,230,0.28)',
              marginBottom: '5px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: '#C1440E', display: 'inline-block',
                animation: 'adpulse 2s infinite',
              }} />
              Console d'administration · Accès restreint
            </div>
            <h1 style={{
              fontFamily: 'Amiri, serif', fontSize: '22px',
              fontWeight: 700, color: '#F2EDE6', margin: 0,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              Admin Dashboard
              <CityBadge />
            </h1>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Notification bell */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.1)',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              position: 'relative', transition: 'all 0.2s',
            }}
              onMouseEnter={e =>
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
              }
              onMouseLeave={e =>
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="rgba(242,237,230,0.5)" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {/* Red dot */}
              <div style={{
                position: 'absolute', top: '5px', right: '5px',
                width: '7px', height: '7px', borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid #060403',
              }} />
            </div>

            {/* Export CSV ghost */}
            <button
              onClick={() => setActiveTab('export')}
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
              📥 Export CSV
            </button>

            {/* New zone primary */}
            <button
              onClick={() => setActiveTab('zones')}
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
              + Nouvelle zone
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <nav style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'remarques',    icon: '📋', label: 'Remarques',
              count: null, countStyle: 'terra' },
            { id: 'zones',        icon: '🗺', label: 'Zones',
              count: null, countStyle: 'green' },
            { id: 'statistiques', icon: '📊', label: 'Statistiques',
              count: null },
            { id: 'export',       icon: '📥', label: 'Export CSV',
              count: null },
            { id: 'utilisateurs', icon: '👥', label: 'Utilisateurs',
              count: null },
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
        padding: '20px 28px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: activeTab === 'remarques' ? 'block' : 'none' }}>
          <AdminRemarquesTab />
        </div>
        <div style={{ display: activeTab === 'zones' ? 'block' : 'none' }}>
          <AdminZonesTab />
        </div>
        <div style={{ display: activeTab === 'statistiques' ? 'block' : 'none' }}>
          <AdminStatistiquesTab />
        </div>
        <div style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
          <AdminExportTab />
        </div>
        <div style={{ display: activeTab === 'utilisateurs' ? 'block' : 'none' }}>
          <AdminUsersTab />
        </div>
      </div>
    </div>
  );
}
