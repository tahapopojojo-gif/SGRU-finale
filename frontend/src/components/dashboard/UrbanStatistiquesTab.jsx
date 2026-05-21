import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer, LabelList
} from 'recharts';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { getUrbanStatsByZone, getZonesWithStats, getValidatedRemarks } from '../../services/urbanApi';
import SkeletonChart from '../SkeletonChart.jsx';
import SkeletonCard from '../SkeletonCard.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';
import { unwrap } from '../../utils/unwrap';

const CAT_EMOJI = {
  'Hôpital': '🏥', 'École': '🏫', 'Parc': '🌳', 'Route': '🛣️', 'Autre': '❓'
};

const UrbanBarChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} role="img" aria-label="Graphique en barres des remarques par catégorie">
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(242, 237, 230, 0.08)" />
      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(242, 237, 230, 0.4)', fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(242, 237, 230, 0.4)', fontSize: 12 }} />
      <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} contentStyle={{ borderRadius: '8px', border: '0.5px solid rgba(242, 237, 230, 0.08)', background: '#080605', color: '#F2EDE6' }} />
      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
        <LabelList dataKey="value" position="top" style={{ fill: '#F2EDE6', fontSize: 12, fontWeight: 'bold' }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

const UrbanAreaChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} role="img" aria-label="Graphique d'évolution temporelle des soumissions">
      <defs>
        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#C1440E" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#C1440E" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(242, 237, 230, 0.08)" />
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(242, 237, 230, 0.4)', fontSize: 12 }} />
      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(242, 237, 230, 0.4)', fontSize: 12 }} />
      <Tooltip contentStyle={{ borderRadius: '8px', border: '0.5px solid rgba(242, 237, 230, 0.08)', background: '#080605', color: '#F2EDE6' }} />
      <Area type="monotone" dataKey="count" stroke="#C1440E" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, fill: '#C1440E', stroke: '#060403', strokeWidth: 2 }} />
    </AreaChart>
  </ResponsiveContainer>
));

const PIE_COLORS = ['#22C55E', '#84CC16', '#F59E0B', '#F97316', '#EF4444'];

const UrbanPieChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart role="img" aria-label="Graphique circulaire des niveaux d'urgence">
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={2}
        dataKey="count"
        label={({percent}) => `${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ borderRadius: '8px', border: '0.5px solid rgba(242, 237, 230, 0.08)', background: '#080605', color: '#F2EDE6' }} />
      <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '13px', color: 'rgba(242, 237, 230, 0.5)' }} />
    </PieChart>
  </ResponsiveContainer>
));

const UrbanTableMemo = React.memo(({ data, selectedZoneId, isZoneSelected, styles }) => (
  <table style={styles.table} role="table" aria-labelledby="urban-zones-comparison-title">
    <thead>
      <tr>
        <th scope="col" style={styles.th}>Zone</th>
        <th scope="col" style={styles.th}>Remarques</th>
        <th scope="col" style={styles.th}>Urgence Moy.</th>
        <th scope="col" style={styles.th}>Cat. Dom.</th>
      </tr>
    </thead>
    <tbody>
      {data.map(zone => {
        const isHighlighted = isZoneSelected && selectedZoneId === zone.id;
        
        let badgeBg = '#DCFCE7'; let badgeColor = '#166534';
        if (zone.avgUrgency >= 4) { badgeBg = '#FEE2E2'; badgeColor = '#991B1B'; }
        else if (zone.avgUrgency >= 2.5) { badgeBg = '#FEF9C3'; badgeColor = '#854D0E'; }

        return (
          <tr key={zone.id} style={styles.tr(isHighlighted, zone.couleur || '#6366F1')}>
            <td style={styles.td}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: zone.couleur }} aria-hidden="true"></span>
                {zone.nom}
              </div>
            </td>
            <td style={{ ...styles.td, fontWeight: 'bold' }}>{zone.totalRemarks}</td>
            <td style={styles.td}>
              <span style={styles.badge(badgeBg, badgeColor)}>{zone.avgUrgency}</span>
            </td>
            <td style={styles.td}>
              <span aria-hidden="true">{CAT_EMOJI[zone.dominantCategory] || '📌'}</span> {zone.dominantCategory}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
));

export default function UrbanStatistiquesTab({ onSwitchTab }) {
  const { selectedZone, selectedZoneName, isZoneSelected } = useUrbanZone();
  const { user } = useAuth();
  const userCity = user?.city || null;
  const [stats, setStats] = useState({
    totalRemarks: 0,
    urgentCount: 0,
    avgUrgency: 0,
    dominantCategory: "N/A",
    byCategory: [],
    byUrgency: [],
    temporalData: []
  });
  const [allZones, setAllZones] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    fetchStats();
  }, [selectedZone]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Pass userCity to scope zones and remarks
      const zonesRes = await getZonesWithStats(userCity);
      const zonesData = unwrap(zonesRes);
      setAllZones([...zonesData].sort((a, b) => b.totalRemarks - a.totalRemarks));

      if (isZoneSelected) {
        const data = await getUrbanStatsByZone(selectedZone.id);
        setStats(data);
      } else {
        // Aggregate global stats from city-filtered remarks
        const remarksRes = await getValidatedRemarks(null, userCity);
        const remarks = unwrap(remarksRes);
        
        const totalRemarks = remarks.length;
        const urgentCount = remarks.filter(r => r.statut === 'urgent').length;
        const avgUrgency = totalRemarks > 0 
          ? (remarks.reduce((acc, r) => acc + r.urgency, 0) / totalRemarks).toFixed(1)
          : 0;

        const categories = ["hopital", "ecole", "parc", "route", "autre"];
        const catColors = { hopital: "#FF6384", ecole: "#36A2EB", parc: "#4BC0C0", route: "#FFCE56", autre: "#9966FF" };
        const catLabels = { hopital: "Hôpital", ecole: "École", parc: "Parc", route: "Route", autre: "Autre" };
        
        const byCategory = categories.map(cat => ({
          name: catLabels[cat],
          value: remarks.filter(r => r.categorie === cat || r.category === cat).length,
          color: catColors[cat]
        }));

        const byUrgency = [1, 2, 3, 4, 5].map(level => ({
          urgency: `Niveau ${level}`,
          count: remarks.filter(r => r.urgency === level).length
        }));

        const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
        const temporalData = weeks.map((week, idx) => {
          const count = remarks.filter(r => {
            const date = new Date(r.created_at);
            const weekIdx = Math.floor((date.getDate() - 1) / 7);
            return weekIdx === idx;
          }).length;
          return { label: week, count };
        });

        const catCounts = remarks.reduce((acc, r) => {
          const c = r.categorie || r.category;
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {});
        let domCat = "N/A";
        let maxCat = 0;
        for (const [c, count] of Object.entries(catCounts)) {
          if (count > maxCat) { maxCat = count; domCat = c; }
        }

        setStats({
          totalRemarks,
          urgentCount,
          avgUrgency: parseFloat(avgUrgency),
          dominantCategory: catLabels[domCat] || "Autre",
          byCategory,
          byUrgency,
          temporalData
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
    setLoading(false);
  };

  const getStyles = (isMobile, isTablet) => ({
    page: { padding: isMobile ? '16px' : '24px', background: 'transparent', fontFamily: "'DM Sans', sans-serif", color: '#F2EDE6' },
    banner: (color, isSelected) => ({
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderLeft: `4px solid ${color}`,
      padding: isMobile ? '12px 16px' : '16px 24px',
      borderRadius: '10px',
      marginBottom: '24px',
      boxShadow: 'none'
    }),
    bannerTitle: { fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#F2EDE6' },
    bannerSubtitle: { fontSize: isMobile ? '12px' : '14px', color: 'rgba(242,237,230,0.4)', margin: 0 },
    kpiRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '12px' : '20px', marginBottom: '24px' },
    kpiCard: {
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    kpiIcon: (bg, color) => ({
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.04)',
      color: '#E8B87A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px'
    }),
    kpiContent: { flex: 1 },
    kpiLabel: {
      fontSize: '10px',
      color: 'rgba(242,237,230,0.3)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      marginBottom: '8px',
      fontWeight: '600'
    },
    kpiValue: {
      fontFamily: 'DM Mono, monospace',
      fontSize: '28px',
      color: '#E8B87A',
      fontWeight: 500,
      lineHeight: 1,
      margin: 0
    },
    chartCard: {
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px',
      padding: '16px',
      marginBottom: '24px'
    },
    chartHeader: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: isMobile ? '12px' : '0' },
    chartTitle: { fontSize: '12px', fontWeight: 500, color: 'rgba(242,237,230,0.7)', marginBottom: '16px', margin: '0 0 16px 0' },
    chartSubtitle: { fontSize: isMobile ? '11px' : '12px', color: 'rgba(242,237,230,0.4)', margin: 0 },
    bottomRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' },
    th: { padding: '12px 16px', borderBottom: '0.5px solid rgba(242, 237, 230, 0.08)', color: 'rgba(242, 237, 230, 0.4)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' },
    td: { padding: '12px 16px', borderBottom: '0.5px solid rgba(242, 237, 230, 0.08)', fontSize: '14px', color: '#F2EDE6', fontWeight: '500' },
    tr: (isHighlighted, color) => ({
      background: isHighlighted ? `${color}20` : 'transparent',
      transition: 'background 0.2s'
    }),
    badge: (bg, color) => ({ padding: '4px 10px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.04)', border: '0.5px solid rgba(242,237,230,0.12)', color: '#E8B87A', fontSize: '12px', fontWeight: '700' })
  });

  const s = useMemo(() => getStyles(isMobile, isTablet), [isMobile, isTablet]);

  const memoizedStats = useMemo(() => stats, [stats]);
  const memoizedAllZones = useMemo(() => allZones, [allZones]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.kpiRow}>
          <SkeletonCard lines={2} />
          {(!isMobile && !isTablet) && <SkeletonCard lines={2} />}
          {(!isMobile) && <SkeletonCard lines={2} />}
          {(!isMobile && !isTablet) && <SkeletonCard lines={2} />}
        </div>
        <div style={s.chartCard}>
          <SkeletonChart type="bar" height={300} />
        </div>
        <div style={s.bottomRow}>
          <div style={s.chartCard}><SkeletonChart type="pie" height={300} /></div>
          <div style={s.chartCard}><SkeletonChart type="bar" height={300} /></div>
        </div>
      </div>
    );
  }

  if (!stats || (stats.totalRemarks === 0 && allZones.length === 0)) {
    return (
      <div style={s.page}>
        <EmptyState 
          icon="🚫"
          title="Aucune remarque validée"
          subtitle="Sélectionnez une autre zone ou attendez les prochains signalements"
          action={onSwitchTab ? { 
            label: "Retourner à la carte", 
            onClick: () => onSwitchTab('carte')
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div style={s.page}>
      
      {/* Zone Selector Header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(242,237,230,0.07)',
        borderLeft: '3px solid #C1440E',
        borderRadius: '8px', padding: '14px 18px',
        marginBottom: '20px',
      }} role="status" aria-live="polite">
        <h3 style={{
          fontFamily: 'Amiri, serif', fontSize: '18px',
          color: '#F2EDE6', margin: '0 0 4px 0',
        }}>
          📊 Statistiques — {selectedZoneName}
        </h3>
        <p style={{
          fontSize: '12px',
          color: 'rgba(242,237,230,0.4)',
          margin: 0,
        }}>
          {isZoneSelected
            ? `${stats.totalRemarks} remarque(s) analysée(s)`
            : 'Vue globale de toutes les zones (remarques validées)'}
        </p>
      </div>

      {/* KPI Indicators Row */}
      <div style={s.kpiRow} role="region" aria-label="Indicateurs clés">
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px', padding: '16px',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }} role="group" aria-label="Total Remarques">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '10px 10px 0 0', background: 'linear-gradient(90deg, #C1440E, transparent)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Total Remarques</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: '#E8B87A', fontWeight: 500, lineHeight: 1 }}>{memoizedStats.totalRemarks}</div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>remarques validées</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px', padding: '16px',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }} role="group" aria-label="Cas Urgents">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '10px 10px 0 0', background: 'linear-gradient(90deg, #ef4444, transparent)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Cas Urgents</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: '#E8B87A', fontWeight: 500, lineHeight: 1 }}>{memoizedStats.urgentCount}</div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>nécessitent attention</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px', padding: '16px',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }} role="group" aria-label="Urgence Moyenne">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '10px 10px 0 0', background: 'linear-gradient(90deg, #E8B87A, transparent)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Urgence Moyenne</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: '#E8B87A', fontWeight: 500, lineHeight: 1 }}>{memoizedStats.avgUrgency} / 5</div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>indice moyen</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px', padding: '16px',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }} role="group" aria-label="Catégorie Dominante">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '10px 10px 0 0', background: 'linear-gradient(90deg, #52BE80, transparent)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Catégorie Dominante</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', color: '#E8B87A', fontWeight: 500, lineHeight: 1 }}>{memoizedStats.dominantCategory}</div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>catégorie principale</div>
        </div>
      </div>

      {/* Chart 1: BarChart - Catégories */}
      <div style={s.chartCard} role="figure" aria-labelledby="urban-chart-cat-title">
        <div style={s.chartHeader}>
          <div>
            <h3 id="urban-chart-cat-title" style={s.chartTitle}>Remarques par Catégorie</h3>
            <p style={s.chartSubtitle}>Zone: {selectedZoneName}</p>
          </div>
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          <UrbanBarChartMemo data={memoizedStats.byCategory} />
        </div>
      </div>

      {/* Chart 2: AreaChart - Évolution Temporelle */}
      <div style={s.chartCard} role="figure" aria-labelledby="urban-chart-temporal-title">
        <div style={s.chartHeader}>
          <div>
            <h3 id="urban-chart-temporal-title" style={s.chartTitle}>Évolution Temporelle des Soumissions</h3>
            <p style={s.chartSubtitle}>Activité récente</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }} role="radiogroup" aria-label="Sélectionner la période">
            <button 
              onClick={() => setPeriod('week')}
              role="radio"
              aria-checked={period === 'week'}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: period === 'week' ? '0.5px solid #C1440E' : '0.5px solid rgba(242,237,230,0.12)', background: period === 'week' ? 'rgba(193,68,14,0.15)' : 'rgba(255,255,255,0.03)', color: period === 'week' ? '#F2EDE6' : 'rgba(242,237,230,0.4)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              Semaine
            </button>
            <button 
              onClick={() => setPeriod('month')}
              role="radio"
              aria-checked={period === 'month'}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', border: period === 'month' ? '0.5px solid #C1440E' : '0.5px solid rgba(242,237,230,0.12)', background: period === 'month' ? 'rgba(193,68,14,0.15)' : 'rgba(255,255,255,0.03)', color: period === 'month' ? '#F2EDE6' : 'rgba(242,237,230,0.4)', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s' }}
            >
              Mois
            </button>
          </div>
        </div>
        <div style={{ height: '280px', width: '100%' }}>
          <UrbanAreaChartMemo data={memoizedStats.temporalData} />
        </div>
      </div>

      {/* Bottom Row */}
      <div style={s.bottomRow}>
        
        {/* Chart 3: PieChart - Urgences */}
        <div style={s.chartCard} role="figure" aria-labelledby="urban-chart-urgency-title">
          <h3 id="urban-chart-urgency-title" style={s.chartTitle}>Niveaux d'Urgence</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <UrbanPieChartMemo data={memoizedStats.byUrgency} />
          </div>
        </div>

        {/* Comparative Table */}
        <div style={{ ...s.chartCard, overflowY: 'auto', maxHeight: '416px' }}>
          <h3 id="urban-zones-comparison-title" style={s.chartTitle}>Comparaison des Zones</h3>
          <p style={s.chartSubtitle}>Toutes les zones actives</p>
          <div style={{ marginTop: '16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <UrbanTableMemo 
              data={memoizedAllZones} 
              selectedZoneId={selectedZone?.id} 
              isZoneSelected={isZoneSelected}
              styles={s}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
