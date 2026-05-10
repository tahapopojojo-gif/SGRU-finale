import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
  AreaChart, Area, ResponsiveContainer
} from 'recharts';
import {
  getStatsByZone, getStatsByCategory, getStatsByUrgency,
  getActivityOverTime, getTop5Zones, getKeyIndicators
} from '../../services/adminApi';
import SkeletonChart from '../SkeletonChart.jsx';
import SkeletonCard from '../SkeletonCard.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';

const URGENCY_COLORS = ['#22C55E', '#84CC16', '#F59E0B', '#F97316', '#EF4444'];

const getStyles = (isMobile, isTablet) => ({
  page: { fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
  kpiRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '8px' : '16px', marginBottom: '24px' },
  kpiCard: (borderColor) => ({
    background: '#fff',
    borderRadius: '12px',
    padding: isMobile ? '16px' : '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    borderLeft: `4px solid ${borderColor}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }),
  kpiIcon: { fontSize: '28px' },
  kpiLabel: { fontSize: isMobile ? '11px' : '12px', fontWeight: '700', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '4px' },
  kpiValue: { fontSize: isMobile ? '20px' : '24px', fontWeight: '900', lineHeight: 1 },
  chartCard: { background: '#fff', borderRadius: '12px', padding: isMobile ? '16px' : '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '24px' },
  chartTitle: { fontSize: isMobile ? '14px' : '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px', margin: '0 0 20px 0' },
  chartsRow: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '16px' : '24px', marginBottom: '24px' },
  toggleRow: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: isMobile ? '12px' : '0' },
  toggleGroup: { display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '4px', gap: '2px', width: isMobile ? '100%' : 'auto' },
  toggleBtn: (active) => ({
    padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    background: active ? '#fff' : 'transparent',
    color: active ? '#6366f1' : '#6b7280',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s', flex: isMobile ? 1 : 'none'
  }),
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '600px' }, // Ensure min-width for table so it scrolls
  thead: { background: '#f3f4f6' },
  th: { padding: '12px 16px', textAlign: 'left', fontWeight: '700', fontSize: '13px', color: '#374151', borderBottom: '2px solid #e5e7eb' },
  td: { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid #f3f4f6' },
  badge: (bg, color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: bg, color, fontSize: '12px', fontWeight: '700' }),
  categoryPill: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f3f4f6', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#374151' },
  noData: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontStyle: 'italic' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '12px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
});

const getCategoryEmoji = (cat) => {
  const map = { 'Route': '🛣️', 'Hopital': '🏥', 'Hôpital': '🏥', 'École': '🏫', 'Ecole': '🏫', 'Parc': '🌳', 'Autre': '❓' };
  return map[cat] || '📌';
};

const getUrgencyBadge = (val, styles) => {
  if (val < 2) return styles.badge('#DCFCE7', '#166534');
  if (val <= 3.5) return styles.badge('#FEF9C3', '#854D0E');
  return styles.badge('#FEE2E2', '#991B1B');
};

const getUrgencyLabel = (val) => {
  if (val < 2) return 'Faible';
  if (val <= 3.5) return 'Moyenne';
  return 'Élevée';
};

const ZoneBarChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} role="img" aria-label="Graphique en barres empilées des remarques par zone">
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="zone" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
      <Legend wrapperStyle={{ paddingTop: '12px' }} />
      <Bar dataKey="urgent" stackId="a" fill="#EF4444" name="Urgent" />
      <Bar dataKey="actif" stackId="a" fill="#3B82F6" name="Actif" />
      <Bar dataKey="planifie" stackId="a" fill="#F59E0B" name="Planifié" />
      <Bar dataKey="rejete" stackId="a" fill="#9CA3AF" name="Rejeté" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
));

const CategoryPieChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart role="img" aria-label="Graphique circulaire de la répartition par catégorie">
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={95}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        labelLine={false}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
));

const UrgencyBarChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} role="img" aria-label="Graphique en barres de la distribution des urgences">
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="urgency" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
      <Bar dataKey="count" name="Remarques" radius={[4, 4, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={URGENCY_COLORS[index % URGENCY_COLORS.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

const ActivityAreaChartMemo = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} role="img" aria-label="Graphique d'activité temporelle">
      <defs>
        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
          <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
      <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }} />
      <Area
        type="monotone"
        dataKey="count"
        stroke="#6366F1"
        strokeWidth={2.5}
        fill="url(#colorActivity)"
        fillOpacity={1}
        name="Remarques"
        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#6366F1' }}
        activeDot={{ r: 6 }}
      />
    </AreaChart>
  </ResponsiveContainer>
));

const rankMedal = (rank) => ({ 1: '🥇', 2: '🥈', 3: '🥉' }[rank] || String(rank));

const Top5TableMemo = React.memo(({ data, styles }) => (
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <table style={styles.table} role="table" aria-labelledby="admin-top5-title">
      <thead style={styles.thead}>
        <tr>
          <th scope="col" style={styles.th}>#</th>
          <th scope="col" style={styles.th}>Zone</th>
          <th scope="col" style={{ ...styles.th, textAlign: 'center' }}>Total Remarques</th>
          <th scope="col" style={{ ...styles.th, textAlign: 'center' }}>Catégorie Dominante</th>
          <th scope="col" style={{ ...styles.th, textAlign: 'center' }}>Urgence Moyenne</th>
        </tr>
      </thead>
      <tbody>
        {data.length > 0 ? data.map((zone, idx) => (
          <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}
            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#f9fafb'}
          >
            <td style={{ ...styles.td, fontWeight: '700', fontSize: '18px' }}><span aria-label={`Rang ${zone.rank}`}>{rankMedal(zone.rank)}</span></td>
            <td style={{ ...styles.td, fontWeight: '600' }}>{zone.zone}</td>
            <td style={{ ...styles.td, textAlign: 'center', fontWeight: '700', fontSize: '16px' }}>{zone.total}</td>
            <td style={{ ...styles.td, textAlign: 'center' }}>
              <span style={styles.categoryPill}>
                <span aria-hidden="true">{getCategoryEmoji(zone.dominantCategory)}</span> {zone.dominantCategory}
              </span>
            </td>
            <td style={{ ...styles.td, textAlign: 'center' }}>
              <span style={getUrgencyBadge(zone.avgUrgency, styles)}>
                {zone.avgUrgency} ({getUrgencyLabel(zone.avgUrgency)})
              </span>
            </td>
          </tr>
        )) : (
          <tr><td colSpan={5} style={styles.noData}>Aucune donnée disponible</td></tr>
        )}
      </tbody>
    </table>
  </div>
));

export default function AdminStatistiquesTab() {
  const [statsByZone, setStatsByZone] = useState([]);
  const [statsByCategory, setStatsByCategory] = useState([]);
  const [statsByUrgency, setStatsByUrgency] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [top5Zones, setTop5Zones] = useState([]);
  const [keyIndicators, setKeyIndicators] = useState(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { isMobile, isTablet } = useResponsive();
  const s = useMemo(() => getStyles(isMobile, isTablet), [isMobile, isTablet]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [zones, cats, urgency, activity, top5, kpis] = await Promise.all([
          getStatsByZone(),
          getStatsByCategory(),
          getStatsByUrgency(),
          getActivityOverTime('week'),
          getTop5Zones(),
          getKeyIndicators()
        ]);
        setStatsByZone(zones);
        setStatsByCategory(cats);
        setStatsByUrgency(urgency);
        setActivityData(activity);
        setTop5Zones(top5);
        setKeyIndicators(kpis);
      } catch (err) {
        console.error('Error loading stats:', err);
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (loading) return;
    getActivityOverTime(period).then(setActivityData).catch(console.error);
  }, [period]);

  const memoizedKeyIndicators = useMemo(() => keyIndicators, [keyIndicators]);

  if (loading) return (
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
      <div style={s.chartsRow}>
        <div style={s.chartCard}><SkeletonChart type="pie" height={300} /></div>
        <div style={s.chartCard}><SkeletonChart type="bar" height={300} /></div>
      </div>
    </div>
  );

  if (error) return (
    <div style={s.page}>
      <EmptyState 
        icon="❌"
        title="Erreur lors du chargement"
        subtitle={error}
        action={{ 
          label: "Réessayer", 
          onClick: () => window.location.reload() 
        }}
      />
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @media (max-width: 768px) { .stats-kpi-row { grid-template-columns: 1fr 1fr !important } .stats-charts-row { grid-template-columns: 1fr !important } }`}</style>

      {/* KPI CARDS */}
      <div style={s.kpiRow} className="stats-kpi-row" role="region" aria-label="Indicateurs clés de performance">
        <div style={s.kpiCard('#3B82F6')} role="group" aria-label="Total Remarques">
          <span style={s.kpiIcon} aria-hidden="true">📋</span>
          <div><div style={s.kpiLabel}>Total Remarques</div><div style={{ ...s.kpiValue, color: '#1e40af' }}>{memoizedKeyIndicators?.totalRemarks ?? 0}</div></div>
        </div>
        <div style={s.kpiCard('#EF4444')} role="group" aria-label="Cas Urgents">
          <span style={s.kpiIcon} aria-hidden="true">🚨</span>
          <div><div style={s.kpiLabel}>Cas Urgents</div><div style={{ ...s.kpiValue, color: '#991b1b' }}>{memoizedKeyIndicators?.urgentCount ?? 0}</div></div>
        </div>
        <div style={s.kpiCard('#F59E0B')} role="group" aria-label="Urgence Moyenne">
          <span style={s.kpiIcon} aria-hidden="true">⚠️</span>
          <div><div style={s.kpiLabel}>Urgence Moyenne</div><div style={{ ...s.kpiValue, color: '#92400e' }}>{memoizedKeyIndicators?.avgUrgency ?? 0} <span style={{ fontSize: '14px', color: '#d97706' }}>/ 5</span></div></div>
        </div>
        <div style={s.kpiCard('#10B981')} role="group" aria-label="Zone Plus Active">
          <span style={s.kpiIcon} aria-hidden="true">📍</span>
          <div><div style={s.kpiLabel}>Zone Plus Active</div><div style={{ ...s.kpiValue, fontSize: '18px', color: '#065f46' }}>{memoizedKeyIndicators?.topZone ?? '—'}</div></div>
        </div>
      </div>

      {/* CHART 1: Remarques par Zone */}
      <div style={s.chartCard} role="figure" aria-labelledby="admin-chart-zone-title">
        <h3 id="admin-chart-zone-title" style={s.chartTitle}>Remarques par Zone</h3>
        {statsByZone.length > 0 ? <ZoneBarChartMemo data={statsByZone} /> : <div style={s.noData}>Aucune donnée disponible</div>}
      </div>

      {/* CHARTS ROW: Pie + Urgency Bar */}
      <div style={s.chartsRow} className="stats-charts-row">
        
        {/* CHART 2: Categories Pie */}
        <div style={s.chartCard} role="figure" aria-labelledby="admin-chart-category-title">
          <h3 id="admin-chart-category-title" style={s.chartTitle}>Répartition par Catégorie</h3>
          {statsByCategory.length > 0 ? <CategoryPieChartMemo data={statsByCategory} /> : <div style={s.noData}>Aucune donnée disponible</div>}
        </div>

        {/* CHART 3: Urgency Distribution */}
        <div style={s.chartCard} role="figure" aria-labelledby="admin-chart-urgency-title">
          <h3 id="admin-chart-urgency-title" style={s.chartTitle}>Distribution des Niveaux d'Urgence</h3>
          {statsByUrgency.length > 0 ? <UrgencyBarChartMemo data={statsByUrgency} /> : <div style={s.noData}>Aucune donnée disponible</div>}
        </div>
      </div>

      {/* CHART 4: Activity Over Time */}
      <div style={s.chartCard} role="figure" aria-labelledby="admin-chart-activity-title">
        <div style={s.toggleRow}>
          <h3 id="admin-chart-activity-title" style={{ ...s.chartTitle, margin: 0 }}>Activité Temporelle</h3>
          <div style={s.toggleGroup} role="radiogroup" aria-label="Sélectionner la période">
            <button style={s.toggleBtn(period === 'week')} onClick={() => setPeriod('week')} role="radio" aria-checked={period === 'week'}>Semaine</button>
            <button style={s.toggleBtn(period === 'month')} onClick={() => setPeriod('month')} role="radio" aria-checked={period === 'month'}>Mois</button>
          </div>
        </div>
        {activityData.length > 0 ? <ActivityAreaChartMemo data={activityData} /> : <div style={s.noData}>Aucune donnée disponible</div>}
      </div>

      {/* TOP 5 TABLE */}
      <div style={s.chartCard}>
        <h3 id="admin-top5-title" style={s.chartTitle}>Top 5 Zones les plus actives</h3>
        <Top5TableMemo data={top5Zones} styles={s} isMobile={isMobile} />
      </div>
    </div>
  );
}
