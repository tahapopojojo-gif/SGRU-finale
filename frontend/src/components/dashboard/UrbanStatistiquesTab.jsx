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

const COLOR_PALETTE = [
  '#f59e0b', '#3b82f6', '#22c55e', '#a855f7',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#14b8a6',
];

const getEmoji = (cat) => {
  const c = String(cat || '').toLowerCase();
  if (c.includes('rout')) return '🛣️';
  if (c.includes('eclair') || c.includes('éclair')) return '💡';
  if (c.includes('dech') || c.includes('déche')) return '🗑️';
  if (c.includes('eau')) return '💧';
  if (c.includes('parc') || c.includes('vert')) return '🌳';
  if (c.includes('trans')) return '🚌';
  if (c.includes('hopit') || c.includes('hôpit')) return '🏥';
  if (c.includes('ecol') || c.includes('écol')) return '🏫';
  return '📌';
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



const UrbanTableMemo = React.memo(({ data, selectedZoneId, isZoneSelected, styles }) => (
  <table style={styles.table} role="table" aria-labelledby="urban-zones-comparison-title">
    <thead>
      <tr>
        <th scope="col" style={styles.th}>Zone</th>
        <th scope="col" style={styles.th}>Remarques</th>
        <th scope="col" style={styles.th}>Urgence Moy.</th>
        <th scope="col" style={styles.th}>Cat. Dom.</th>
        <th scope="col" style={styles.th}>Tendance</th>
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
              <span style={{
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                background: zone.avgUrgency >= 4
                  ? 'rgba(239,68,68,0.15)'
                  : zone.avgUrgency >= 2.5
                  ? 'rgba(245,158,11,0.15)'
                  : 'rgba(34,197,94,0.12)',
                color: zone.avgUrgency >= 4
                  ? '#ef4444'
                  : zone.avgUrgency >= 2.5
                  ? '#f59e0b'
                  : '#22c55e',
                border: `0.5px solid ${
                  zone.avgUrgency >= 4
                    ? 'rgba(239,68,68,0.3)'
                    : zone.avgUrgency >= 2.5
                    ? 'rgba(245,158,11,0.3)'
                    : 'rgba(34,197,94,0.25)'
                }`,
              }}>
                {zone.avgUrgency || '—'}
              </span>
            </td>
            <td style={styles.td}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'rgba(242,237,230,0.6)',
                textTransform: 'capitalize',
              }}>
                {getEmoji(zone.dominantCategory)}
                {zone.dominantCategory || '—'}
              </span>
            </td>
            <td style={styles.td}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: zone.trendDir === 'up' ? '#ef4444' : zone.trendDir === 'down' ? '#22c55e' : '#94a3b8',
                fontWeight: 600,
                fontSize: '12px',
              }}>
                {zone.trendDir === 'up' ? '↗' : zone.trendDir === 'down' ? '↘' : '→'}
                {zone.trendPercent > 0 ? `+${zone.trendPercent}%` : zone.trendPercent < 0 ? `${zone.trendPercent}%` : 'Stable'}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
));

const getTemporalData = (remarks, period) => {
  const now = new Date();
  
  if (period === '3months' || period === '6months') {
    const monthCount = period === '3months' ? 3 : 6;
    return Array.from({ length: monthCount }, (_, i) => {
      const target = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
      const label = target.toLocaleString('fr-FR', { month: 'short' });
      const count = remarks.filter(r => {
        const d = new Date(r.created_at);
        return d.getMonth() === target.getMonth() &&
               d.getFullYear() === target.getFullYear();
      }).length;
      return { label, count };
    });
  }

  if (period === '1year') {
    return Array.from({ length: 12 }, (_, i) => {
      const target = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const label = target.toLocaleString('fr-FR', { month: 'short' });
      const count = remarks.filter(r => {
        const d = new Date(r.created_at);
        return d.getMonth() === target.getMonth() &&
               d.getFullYear() === target.getFullYear();
      }).length;
      return { label, count };
    });
  }
  return [];
};

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
  const [period, setPeriod] = useState('3months');
  const [loading, setLoading] = useState(true);

  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    fetchStats();
  }, [selectedZone, period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch zones
      const zonesRes = await getZonesWithStats(userCity);
      const zonesData = unwrap(zonesRes);
      const uniqueZones = zonesData.filter(
        (z, i, self) => i === self.findIndex(t => t.id === z.id)
      );

      // 2. Fetch all validated remarks for the city
      const remarksRes = await getValidatedRemarks({ ville: userCity });
      const remarks = unwrap(remarksRes);
      const safeRemarks = Array.isArray(remarks) 
        ? remarks.map(r => ({
            ...r,
            categorie: (r.categorie || r.category || 'autre').toLowerCase().trim()
          }))
        : [];

      const CAT_LABEL = {
        route: 'Route', eclairage: 'Éclairage', dechets: 'Déchets',
        eau: 'Eau', parc: 'Parc', transport: 'Transport', autre: 'Autre'
      };

      // 3. Compute stats for comparative table for ALL zones
      const computedZones = uniqueZones.map(zone => {
        const zoneRemarks = safeRemarks.filter(r => r.zone_id === zone.id);
        const totalRemarks = zoneRemarks.length;
        const avgUrgency = totalRemarks > 0
          ? (zoneRemarks.reduce((acc, r) => acc + (r.urgency || 1), 0) / totalRemarks).toFixed(1)
          : '0.0';

        const catCounts = zoneRemarks.reduce((acc, r) => {
          const c = r.categorie;
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {});
        let domCat = "autre";
        let maxCat = -1;
        for (const [c, count] of Object.entries(catCounts)) {
          if (count > maxCat) { maxCat = count; domCat = c; }
        }

        // Calculate Trend (current month June vs previous month May)
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
        const prevYear = curMonth === 0 ? curYear - 1 : curYear;

        const curMonthRemarks = zoneRemarks.filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === curMonth && d.getFullYear() === curYear;
        }).length;

        const prevMonthRemarks = zoneRemarks.filter(r => {
          const d = new Date(r.created_at);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).length;

        let trendPercent = 0;
        let trendDir = 'stable';
        if (prevMonthRemarks > 0) {
          trendPercent = Math.round(((curMonthRemarks - prevMonthRemarks) / prevMonthRemarks) * 100);
          if (trendPercent > 0) trendDir = 'up';
          else if (trendPercent < 0) trendDir = 'down';
        } else if (curMonthRemarks > 0) {
          trendPercent = 100;
          trendDir = 'up';
        }

        return {
          ...zone,
          totalRemarks,
          avgUrgency,
          dominantCategory: CAT_LABEL[domCat] || 'Autre',
          trendPercent,
          trendDir
        };
      });
      setAllZones(computedZones.sort((a, b) => b.totalRemarks - a.totalRemarks));

      // 4. Filter remarks based on active zone selection
      const activeRemarks = isZoneSelected
        ? safeRemarks.filter(r => r.zone_id === selectedZone.id)
        : safeRemarks;

      const totalRemarks = activeRemarks.length;
      const urgentCount = activeRemarks.filter(r => (r.urgency || 0) >= 4).length;
      const avgUrgency = totalRemarks > 0 
        ? (activeRemarks.reduce((acc, r) => acc + (r.urgency || 0), 0) / totalRemarks).toFixed(1)
        : '0.0';

      // Group by correct categories
      const categories = ["route", "eclairage", "dechets", "eau", "parc", "transport", "autre"];
      const catColors = {
        route: "#78716c",
        eclairage: "#eab308",
        dechets: "#22c55e",
        eau: "#3b82f6",
        parc: "#16a34a",
        transport: "#f97316",
        autre: "#94a3b8"
      };

      const byCategory = categories.map(cat => ({
        name: CAT_LABEL[cat],
        value: activeRemarks.filter(r => r.categorie === cat).length,
        color: catColors[cat],
      }));

      const byUrgency = [1, 2, 3, 4, 5].map(level => ({
        name: level === 1 ? 'Très faible'
            : level === 2 ? 'Faible'
            : level === 3 ? 'Modéré'
            : level === 4 ? 'Urgent'
            : 'Critique',
        count: activeRemarks.filter(r => r.urgency === level).length,
        color: ['#22c55e','#84cc16','#f59e0b','#f97316','#ef4444'][level - 1]
      }));

      // Temporal data grouped by months of actual created_at dates
      const temporalData = getTemporalData(activeRemarks, period);

      // Dominant category with count
      const catCounts = activeRemarks.reduce((acc, r) => {
        const c = r.categorie;
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {});
      let domCat = "autre";
      let maxCat = -1;
      for (const [c, count] of Object.entries(catCounts)) {
        if (count > maxCat) { maxCat = count; domCat = c; }
      }
      const dominantCategory = totalRemarks > 0
        ? `${CAT_LABEL[domCat] || 'Autre'} (${catCounts[domCat] || 0})`
        : "N/A";

      // Dominant duration and % chronic
      const chronicCount = activeRemarks.filter(r => {
        const dur = r.residence_duration || r.duration || '';
        return dur.includes("an") || dur.includes("toujours") || dur.includes("mois");
      }).length;
      const chronicPct = totalRemarks > 0 ? Math.round((chronicCount / totalRemarks) * 100) : 0;
      const dominantDuration = totalRemarks > 0
        ? `${chronicPct}% problèmes chroniques`
        : "0% problèmes chroniques";

      // Durations breakdown
      const durations = { "quelques jours": 0, "quelques mois": 0, "plus d'un an": 0, "depuis toujours": 0 };
      activeRemarks.forEach(r => {
        const dur = r.residence_duration || r.duration;
        if (dur && durations[dur] !== undefined) {
          durations[dur]++;
        }
      });

      // Profiles breakdown
      const profiles = { "resident": 0, "conducteur": 0, "pieton": 0, "commercant": 0, "passant": 0 };
      activeRemarks.forEach(r => {
        const prof = r.profile || r.reporter_profile;
        if (prof && profiles[prof] !== undefined) {
          profiles[prof]++;
        }
      });

      // Affected groups breakdown
      const affected = {};
      activeRemarks.forEach(r => {
        const groups = r.affected_groups || r.reasons || [];
        if (Array.isArray(groups)) {
          groups.forEach(g => {
            affected[g] = (affected[g] || 0) + 1;
          });
        }
      });

      setStats({
        totalRemarks,
        urgentCount,
        avgUrgency: parseFloat(avgUrgency),
        dominantCategory,
        dominantDuration,
        byCategory,
        byUrgency,
        temporalData,
        durations,
        profiles,
        affectedGroups: affected
      });
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
    kpiRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? '12px' : '20px', marginBottom: '24px' },
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
          }}>
            <span style={{ fontSize: '22px' }}>
              {getEmoji(memoizedStats.dominantCategory)}
            </span>
            <span style={{
              fontSize: '16px',
              color: '#E8B87A',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}>
              {memoizedStats.dominantCategory || '—'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>catégorie principale</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.08)',
          borderRadius: '10px', padding: '16px',
          position: 'relative', overflow: 'hidden',
          transition: 'all 0.2s',
        }} role="group" aria-label="Durée Dominante">
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', borderRadius: '10px 10px 0 0', background: 'linear-gradient(90deg, #a855f7, transparent)' }} />
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Durée Dominante</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '15px', color: '#E8B87A', fontWeight: 600, marginTop: '8px', lineHeight: 1.2 }}>
            {memoizedStats.dominantDuration}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(242,237,230,0.35)', marginTop: '5px' }}>problèmes de longue durée</div>
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
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: '3months', label: '3 mois' },
              { key: '6months', label: '6 mois' },
              { key: '1year',   label: '1 an' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.2s',
                  border: period === key
                    ? '0.5px solid #C1440E'
                    : '0.5px solid rgba(242,237,230,0.12)',
                  background: period === key
                    ? 'rgba(193,68,14,0.15)'
                    : 'rgba(255,255,255,0.03)',
                  color: period === key
                    ? '#F2EDE6'
                    : 'rgba(242,237,230,0.4)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: '280px', width: '100%' }}>
          <UrbanAreaChartMemo data={memoizedStats.temporalData} />
        </div>
      </div>

      {/* Dynamic Breakdown Section 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Répartition par catégorie */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.07)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Répartition par catégorie
          </div>
          {stats.byCategory
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((cat, i) => {
              const total = stats.byCategory.reduce((s, c) => s + c.value, 0)
              const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0
              return (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(242,237,230,0.65)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
                      {cat.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.3)', fontVariantNumeric: 'tabular-nums' }}>{cat.value}</span>
                      <span style={{ fontSize: '11px', color: cat.color, fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Répartition par durée */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.07)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Répartition par durée
          </div>
          {Object.entries(stats.durations || {})
            .map(([label, val]) => {
              const total = Object.values(stats.durations || {}).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              const color = label.includes("an") || label.includes("toujours") ? "#a855f7" : "#3b82f6";
              return (
                <div key={label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(242,237,230,0.65)', textTransform: 'capitalize' }}>
                      {label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.3)' }}>{val}</span>
                      <span style={{ fontSize: '11px', color, fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Dynamic Breakdown Section 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Profil des signaleurs */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.07)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Profil des signaleurs
          </div>
          {Object.entries(stats.profiles || {})
            .map(([label, val]) => {
              const total = Object.values(stats.profiles || {}).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              const PROF_LABELS_FR = {
                resident: 'Résident',
                conducteur: 'Conducteur',
                pieton: 'Piéton',
                commercant: 'Commerçant',
                passant: 'Passant'
              };
              return (
                <div key={label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(242,237,230,0.65)' }}>
                      {PROF_LABELS_FR[label] || label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.3)' }}>{val}</span>
                      <span style={{ fontSize: '11px', color: '#E8B87A', fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#E8B87A', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Groupes affectés (Tag Cloud) */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(242,237,230,0.07)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Impact social & Groupes affectés
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(stats.affectedGroups || {}).length > 0 ? (
              Object.entries(stats.affectedGroups || {})
                .sort((a, b) => b[1] - a[1])
                .map(([group, count]) => {
                  const labelFR = {
                    enfants_personnes_agees: 'Enfants & Personnes âgées',
                    personnes_handicapees: 'Personnes handicapées',
                    pietons: 'Piétons',
                    cyclistes: 'Cyclistes',
                    conducteurs: 'Conducteurs',
                    residents: 'Résidents',
                    commerces: 'Commerces & Boutiques'
                  }[group] || group;

                  return (
                    <span
                      key={group}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(193,68,14,0.08)',
                        border: '0.5px solid rgba(193,68,14,0.3)',
                        borderRadius: '100px',
                        color: '#F2EDE6',
                        fontSize: '11px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {labelFR}
                      <span style={{
                        background: 'rgba(255,255,255,0.08)',
                        padding: '1px 5px',
                        borderRadius: '50%',
                        fontSize: '9px',
                        color: '#E8B87A',
                        fontWeight: 'bold',
                      }}>
                        {count}
                      </span>
                    </span>
                  );
                })
            ) : (
              <span style={{ fontSize: '12px', color: 'rgba(242,237,230,0.3)', fontStyle: 'italic' }}>
                Aucune donnée sociale enregistrée
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comparative Table (Full Width) */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(242,237,230,0.07)',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 id="urban-zones-comparison-title" style={s.chartTitle}>Comparaison des Zones</h3>
        <p style={s.chartSubtitle}>Toutes les zones actives de {userCity ? userCity.charAt(0).toUpperCase() + userCity.slice(1) : 'Marrakesh'}</p>
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
  );
}
