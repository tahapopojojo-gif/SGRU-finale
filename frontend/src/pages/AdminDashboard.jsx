import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Map, BarChart2, Download, Users } from 'lucide-react';
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
  const [zoneFocus, setZoneFocus] = useState(null);
  const [startDrawZone, setStartDrawZone] = useState(false);
  const tabRefs = useRef({});

  const handleCreateZoneAround = (remark) => {
    const lat = parseFloat(remark.latitude);
    const lng = parseFloat(remark.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    setZoneFocus({
      lat,
      lng,
      remarkId: remark.id,
      label: remark.opinion?.slice(0, 60) || `Signalement #${remark.id}`,
    });
    setActiveTab('zones');
  };

  const tabs = [
    { id: 'remarques', label: 'Remarques' },
    { id: 'zones', label: 'Zones' },
    { id: 'statistiques', label: 'Statistiques' },
    { id: 'export', label: 'Export CSV' },
    { id: 'utilisateurs', label: 'Utilisateurs' },
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
      <style>{`
  nav button:focus { outline: none !important; box-shadow: none !important; }
  nav button:focus-visible { outline: none !important; box-shadow: none !important; }
`}</style>

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
        padding: isMobile ? '12px 16px 0' : '18px 28px 0',
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
              fontFamily: 'Amiri, serif', fontSize: isMobile ? '18px' : '22px',
              fontWeight: 700, color: '#F2EDE6', margin: 0,
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              Admin Dashboard
              <CityBadge />
            </h1>
          </div>

          {/* Right: actions */}
          {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <Download size={13} style={{ marginRight: '6px' }} /> Export CSV
            </button>

            {/* New zone ghost */}
            <button
              onClick={() => { setActiveTab('zones'); setStartDrawZone(true); }}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: 'transparent',
                border: '0.5px solid #C1440E',
                color: '#C1440E',
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#C1440E'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#C1440E'
              }}
            >
              + Nouvelle zone
            </button>
          </div>
          )}
        </div>

        {/* Tab bar */}
        <nav style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'remarques',    icon: <ClipboardList size={14} />, label: 'Remarques' },
            { id: 'zones',        icon: <Map size={14} />,           label: 'Zones' },
            { id: 'statistiques', icon: <BarChart2 size={14} />,     label: 'Statistiques' },
            { id: 'export',       icon: <Download size={14} />,      label: 'Export CSV' },
            { id: 'utilisateurs', icon: <Users size={14} />,         label: 'Utilisateurs' },
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
                outline: 'none',
                boxShadow: 'none',
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
              {!isMobile && tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Body */}
      <div style={{
        padding: isMobile ? '12px 16px' : '20px 28px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: activeTab === 'remarques' ? 'block' : 'none' }}>
          <AdminRemarquesTab
            isActive={activeTab === 'remarques'}
            onCreateZoneAround={handleCreateZoneAround}
          />
        </div>
        <div style={{ display: activeTab === 'zones' ? 'block' : 'none' }}>
          <AdminZonesTab
            isActive={activeTab === 'zones'}
            zoneFocus={zoneFocus}
            onZoneFocusClear={() => setZoneFocus(null)}
            startDrawZone={startDrawZone}
            onDrawZoneStarted={() => setStartDrawZone(false)}
          />
        </div>
        <div style={{ display: activeTab === 'statistiques' ? 'block' : 'none' }}>
          <AdminStatistiquesTab isActive={activeTab === 'statistiques'} />
        </div>
        <div style={{ display: activeTab === 'export' ? 'block' : 'none' }}>
          <AdminExportTab isActive={activeTab === 'export'} />
        </div>
        <div style={{ display: activeTab === 'utilisateurs' ? 'block' : 'none' }}>
          <AdminUsersTab />
        </div>
      </div>
    </div>
  );
}
