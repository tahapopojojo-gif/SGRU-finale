import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import AdminRemarquesTab from '../components/dashboard/AdminRemarquesTab';
import AdminZonesTab from '../components/dashboard/AdminZonesTab';
import AdminStatistiquesTab from '../components/dashboard/AdminStatistiquesTab';
import AdminExportTab from '../components/dashboard/AdminExportTab';
import useResponsive from '../hooks/useResponsive';

function CityBadge() {
  const { user } = useAuth();
  const city = user?.city;
  return (
    <span style={{
      backgroundColor: city ? '#DBEAFE' : '#F3F4F6',
      color: city ? '#1E40AF' : '#6B7280',
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

export default function AdminDashboard() {
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState('remarques');
  const tabRefs = useRef({});

  const tabs = [
    { id: 'remarques', label: 'Remarques', icon: '📋' },
    { id: 'zones', label: 'Zones', icon: '🗺️' },
    { id: 'statistiques', label: 'Statistiques', icon: '📊' },
    { id: 'export', label: 'Export CSV', icon: '📥' },
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
    <div className="min-h-screen bg-gray-50">
      <a
        href="#admin-main-content"
        style={{
          position: 'absolute', left: '-9999px', top: 'auto',
          width: '1px', height: '1px', overflow: 'hidden',
          zIndex: 9999, padding: '8px 16px',
          background: '#2563eb', color: '#fff', fontWeight: 700,
          borderRadius: '0 0 8px 0', fontSize: '14px', textDecoration: 'none'
        }}
        onFocus={(e) => { e.target.style.left = '0'; e.target.style.width = 'auto'; e.target.style.height = 'auto'; }}
        onBlur={(e) => { e.target.style.left = '-9999px'; e.target.style.width = '1px'; e.target.style.height = '1px'; }}
      >
        Skip to content
      </a>

      <Navbar />

      <div style={{ paddingTop: isMobile ? '80px' : '96px', paddingBottom: '48px', paddingLeft: isMobile ? '16px' : '32px', paddingRight: isMobile ? '16px' : '32px', maxWidth: '80rem', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: '32px' }} role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="h-8 w-2 bg-blue-600 rounded-full" aria-hidden="true"></div>
            <h1 style={{ fontSize: isMobile ? '24px' : '30px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.025em', margin: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              Admin Dashboard
              <CityBadge />
            </h1>
          </div>
          <p style={{ color: '#64748b', fontWeight: '500', marginLeft: '44px', fontSize: isMobile ? '14px' : '16px', margin: 0 }}>
            Manage urban remarks, monitor spatial data, and handle city planning requests.
          </p>
        </header>

        {/* Tab Bar */}
        <div style={{ marginBottom: '24px', overflowX: 'auto', background: '#fff', padding: '4px', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', border: '1px solid #f3f4f6', display: 'inline-block', width: isMobile ? '100%' : 'auto' }}>
          <nav
            style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '4px' }}
            aria-label="Admin Dashboard Tabs"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={handleTabKeyDown}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '12px 20px' : '12px 24px', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.3s', whiteSpace: 'nowrap',
                    background: isActive ? '#2563eb' : 'transparent',
                    color: isActive ? '#fff' : '#64748b',
                    boxShadow: isActive ? '0 10px 15px -3px rgba(59, 130, 246, 0.2)' : 'none',
                    border: 'none', cursor: 'pointer', outline: 'none', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start'
                  }}
                  onFocus={(e) => { e.target.style.outline = '3px solid #6366F1'; e.target.style.outlineOffset = '2px'; }}
                  onBlur={(e) => { e.target.style.outline = 'none'; }}
                >
                  <span className={isActive ? 'opacity-100' : 'opacity-70'} aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Area */}
        <main id="admin-main-content" role="main" className="transition-all duration-300">
          <div
            role="tabpanel"
            id="tabpanel-remarques"
            aria-labelledby="tab-remarques"
            hidden={activeTab !== 'remarques'}
            tabIndex={0}
          >
            {activeTab === 'remarques' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AdminRemarquesTab />
              </div>
            )}
          </div>
          
          <div
            role="tabpanel"
            id="tabpanel-zones"
            aria-labelledby="tab-zones"
            hidden={activeTab !== 'zones'}
            tabIndex={0}
          >
            {activeTab === 'zones' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <AdminZonesTab />
              </div>
            )}
          </div>
          
          <div
            role="tabpanel"
            id="tabpanel-statistiques"
            aria-labelledby="tab-statistiques"
            hidden={activeTab !== 'statistiques'}
            tabIndex={0}
          >
            {activeTab === 'statistiques' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <AdminStatistiquesTab />
              </div>
            )}
          </div>
          
          <div
            role="tabpanel"
            id="tabpanel-export"
            aria-labelledby="tab-export"
            hidden={activeTab !== 'export'}
            tabIndex={0}
          >
            {activeTab === 'export' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <AdminExportTab />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
