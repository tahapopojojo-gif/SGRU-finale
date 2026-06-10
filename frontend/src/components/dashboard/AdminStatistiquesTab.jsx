import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { getRemarks, getZones } from '../../services/adminApi';
import SkeletonChart from '../SkeletonChart.jsx';
import SkeletonCard from '../SkeletonCard.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { useAuth } from '../../context/AuthContext';
import { getCityMapConfig } from '../../utils/cityBounds';
import { unwrap } from '../../utils/unwrap';

const CATEGORIES = [
  { value: 'road', label: 'Route', color: '#78716c' },
  { value: 'lighting', label: 'Éclairage', color: '#eab308' },
  { value: 'waste', label: 'Déchets', color: '#22c55e' },
  { value: 'water', label: 'Eau', color: '#3b82f6' },
  { value: 'parks', label: 'Parcs', color: '#16a34a' },
  { value: 'schools', label: 'Écoles', color: '#6366f1' },
  { value: 'transport', label: 'Transport', color: '#f97316' },
  { value: 'other', label: 'Autre', color: '#94a3b8' },
];

const DURATION_BUCKETS = [
  { value: 'days', label: 'Quelques jours', color: '#22c55e' },
  { value: 'months', label: 'Quelques mois', color: '#84cc16' },
  { value: 'year', label: 'Plus d\'un an', color: '#f59e0b' },
  { value: 'always', label: 'Depuis longtemps', color: '#ef4444' },
  { value: 'unknown', label: 'Non précisé', color: '#64748b' },
];

const URGENCY_LEVELS = [
  { level: 1, label: 'Niveau 1', color: '#22c55e' },
  { level: 2, label: 'Niveau 2', color: '#84cc16' },
  { level: 3, label: 'Niveau 3', color: '#f59e0b' },
  { level: 4, label: 'Niveau 4', color: '#f97316' },
  { level: 5, label: 'Niveau 5', color: '#ef4444' },
];

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const isValidCoords = (geojson) => (
  Array.isArray(geojson) &&
  geojson.length >= 3 &&
  geojson.every(c => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]))
);

const getRemarkCoords = (remark) => {
  const lat = parseFloat(remark.latitude);
  const lng = parseFloat(remark.longitude);
  return Number.isNaN(lat) || Number.isNaN(lng) ? null : [lat, lng];
};

const pointInPolygon = (point, polygon) => {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
};

const isRemarkAssigned = (remark, zonesList) => {
  if (remark.zone_id) return true;
  const coords = getRemarkCoords(remark);
  if (!coords) return false;
  return zonesList.some(z => isValidCoords(z.coordonnees_geojson) && pointInPolygon(coords, z.coordonnees_geojson));
};

const getRemarkZoneId = (remark, zonesList) => {
  if (remark.zone_id) return remark.zone_id;
  const coords = getRemarkCoords(remark);
  if (!coords) return null;
  const zone = zonesList.find(z => isValidCoords(z.coordonnees_geojson) && pointInPolygon(coords, z.coordonnees_geojson));
  return zone?.id ?? null;
};

const getCategoryKey = (remark) => (remark.categorie || remark.building_type || 'other').toLowerCase();

const getDurationKey = (remark) => {
  const d = remark.duration || remark.residence_duration;
  return d && DURATION_BUCKETS.some(b => b.value === d) ? d : 'unknown';
};

const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (key) => {
  const [year, month] = key.split('-');
  return `${MONTH_LABELS[parseInt(month, 10) - 1]} ${year}`;
};

const chartTooltipStyle = {
  borderRadius: '8px',
  border: '0.5px solid rgba(242, 237, 230, 0.12)',
  background: '#080605',
  color: '#F2EDE6',
  fontSize: '11px',
};

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '0.5px solid rgba(242,237,230,0.07)',
  borderRadius: '10px',
  padding: '16px',
};

const cardTitleStyle = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(242,237,230,0.4)',
  marginBottom: '14px',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
};

const NoData = ({ text = 'Aucune donnée pour le moment' }) => (
  <p style={{ textAlign: 'center', padding: '32px 16px', color: 'rgba(242,237,230,0.35)', fontSize: '12px', margin: 0 }}>
    {text}
  </p>
);

export default function AdminStatistiquesTab({ isActive = true }) {
  const [remarks, setRemarks] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const userCity = user?.city || 'marrakech';
  const cityConfig = getCityMapConfig(userCity);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    if (!isActive) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resRemarks, resZones] = await Promise.all([getRemarks(), getZones()]);
        const fetchedRemarks = unwrap(resRemarks);
        const fetchedZones = unwrap(resZones);
        const cityZones = userCity
          ? fetchedZones.filter(z => z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim())
          : fetchedZones;
        setZones(cityZones.filter(z => isValidCoords(z.coordonnees_geojson)));
        setRemarks(fetchedRemarks);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isActive, userCity]);

  const stats = useMemo(() => {
    const zoneIds = zones.map(z => z.id);
    const remarksInCity = remarks.filter(r => {
      if (r.zone_id && zoneIds.includes(r.zone_id)) return true;
      const coords = getRemarkCoords(r);
      if (!coords || !cityConfig.bounds) return !!r.zone_id;
      const [[south, west], [north, east]] = cityConfig.bounds;
      return coords[0] >= south && coords[0] <= north && coords[1] >= west && coords[1] <= east;
    });

    const total = remarksInCity.length;
    const urgentCount = remarksInCity.filter(r => (parseInt(r.urgency, 10) || 0) >= 4).length;
    const zonesCount = zones.length;
    const assignedCount = remarksInCity.filter(r => isRemarkAssigned(r, zones)).length;
    const coveragePct = total ? Math.round((assignedCount / total) * 100) : 0;

    const categoryCounts = {};
    CATEGORIES.forEach(c => { categoryCounts[c.value] = 0; });
    remarksInCity.forEach(r => {
      const key = getCategoryKey(r);
      if (categoryCounts[key] !== undefined) categoryCounts[key] += 1;
      else categoryCounts.other += 1;
    });
    const categoryData = CATEGORIES.map(c => ({
      name: c.label,
      value: categoryCounts[c.value],
      color: c.color,
    }));
    const maxCategoryCount = Math.max(...categoryData.map(c => c.value), 1);

    const urgencyData = URGENCY_LEVELS.map(u => ({
      name: u.label,
      value: remarksInCity.filter(r => (parseInt(r.urgency, 10) || 3) === u.level).length,
      color: u.color,
    })).filter(d => d.value > 0);

    const urgencyDataAll = URGENCY_LEVELS.map(u => ({
      name: u.label,
      value: remarksInCity.filter(r => (parseInt(r.urgency, 10) || 3) === u.level).length,
      color: u.color,
    }));

    const zoneCounts = {};
    zones.forEach(z => { zoneCounts[z.id] = { name: z.nom, count: 0 }; });
    let unassigned = 0;
    remarksInCity.forEach(r => {
      const zid = getRemarkZoneId(r, zones);
      if (zid && zoneCounts[zid]) zoneCounts[zid].count += 1;
      else unassigned += 1;
    });
    const zoneBarData = [
      ...Object.values(zoneCounts).map(z => ({ zone: z.name, count: z.count })),
      ...(total > 0 ? [{ zone: 'Non assignés', count: unassigned }] : []),
    ];

    const durationCounts = {};
    DURATION_BUCKETS.forEach(d => { durationCounts[d.value] = 0; });
    remarksInCity.forEach(r => {
      durationCounts[getDurationKey(r)] += 1;
    });
    const durationData = DURATION_BUCKETS
      .map(d => ({ name: d.label, value: durationCounts[d.value], color: d.color }))
      .filter(d => d.value > 0);

    const monthMap = {};
    const addToMonth = (key, field) => {
      if (!key) return;
      if (!monthMap[key]) monthMap[key] = { key, remarks: 0, zones: 0 };
      monthMap[key][field] += 1;
    };
    remarksInCity.forEach(r => addToMonth(monthKey(r.created_at), 'remarks'));
    zones.forEach(z => addToMonth(monthKey(z.created_at), 'zones'));
    const monthlyData = Object.values(monthMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(m => ({
        label: formatMonthLabel(m.key),
        remarks: m.remarks,
        zones: m.zones,
      }));

    const topCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];
    const highUrgencyPct = total
      ? Math.round((remarksInCity.filter(r => (parseInt(r.urgency, 10) || 0) >= 3).length / total) * 100)
      : 0;
    const chronicPct = total
      ? Math.round((durationCounts.always / total) * 100)
      : 0;

    const insights = [];
    insights.push(
      `${total} signalement${total !== 1 ? 's' : ''} enregistré${total !== 1 ? 's' : ''}${userCity ? ` pour ${userCity.charAt(0).toUpperCase() + userCity.slice(1)}` : ''}.`,
    );
    if (total > 0 && topCategory) {
      insights.push(
        `La catégorie la plus signalée est ${topCategory.name} (${topCategory.value} signalement${topCategory.value !== 1 ? 's' : ''}).`,
      );
    }
    insights.push(
      coveragePct === 100
        ? `Couverture complète : 100 % des signalements sont dans une zone officielle (${zonesCount} zone${zonesCount !== 1 ? 's' : ''}).`
        : `${coveragePct} % des signalements sont dans une zone officielle${zonesCount === 0 ? ' — aucune zone créée pour l\'instant' : ` (${zonesCount} zone${zonesCount !== 1 ? 's' : ''} dessinée${zonesCount !== 1 ? 's' : ''})`}.`,
    );
    if (total > 0 && highUrgencyPct >= 50) {
      insights.push(`${highUrgencyPct} % des signalements sont de niveau 3 ou plus — intervention prioritaire recommandée.`);
    } else if (total > 0 && chronicPct >= 40) {
      insights.push(`${chronicPct} % des problèmes existent depuis longtemps — signe de dégradation chronique de l'infrastructure.`);
    }

    return {
      total,
      urgentCount,
      zonesCount,
      coveragePct,
      assignedCount,
      categoryData,
      maxCategoryCount,
      urgencyData,
      urgencyDataAll,
      zoneBarData,
      durationData,
      monthlyData,
      insights,
      remarksInCity,
    };
  }, [remarks, zones, cityConfig.bounds, userCity]);

  const gridCols = isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const chartsCols = isMobile ? '1fr' : '1fr 1fr';

  if (loading) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', marginBottom: '20px' }}>
          <SkeletonCard lines={2} />
          {!isMobile && <SkeletonCard lines={2} />}
          {!isMobile && !isTablet && <SkeletonCard lines={2} />}
          {!isMobile && !isTablet && <SkeletonCard lines={2} />}
        </div>
        <div style={{ ...cardStyle, marginBottom: '16px' }}><SkeletonChart type="bar" height={60} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: chartsCols, gap: '16px' }}>
          <div style={cardStyle}><SkeletonChart type="bar" height={220} /></div>
          <div style={cardStyle}><SkeletonChart type="pie" height={220} /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="❌"
        title="Erreur lors du chargement"
        subtitle={error}
        action={{ label: 'Réessayer', onClick: () => window.location.reload() }}
      />
    );
  }

  const kpis = [
    { label: 'Total signalements', value: stats.total, sub: 'Tous les rapports citoyens', color: '#C1440E' },
    { label: 'Urgents (niv. 4-5)', value: stats.urgentCount, sub: 'Intervention rapide requise', color: '#C1440E' },
    { label: 'Zones créées', value: stats.zonesCount, sub: 'Zones officielles dessinées', color: 'rgba(242,237,230,0.2)' },
    { label: 'Couverture', value: `${stats.coveragePct}%`, sub: `${stats.assignedCount}/${stats.total} dans une zone`, color: '#E8B87A' },
  ];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#F2EDE6' }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', marginBottom: '16px' }}>
        {kpis.map(card => (
          <div key={card.label} style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', background: card.color }} />
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.28)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '7px' }}>
              {card.label}
            </div>
            <div style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '28px',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: '#F2EDE6',
              lineHeight: 1,
              marginBottom: '4px',
            }}>
              {card.value}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(242,237,230,0.3)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Insight box */}
      <div style={{
        ...cardStyle,
        marginBottom: '16px',
        background: 'rgba(193,68,14,0.06)',
        border: '0.5px solid rgba(193,68,14,0.2)',
      }}>
        <div style={{ fontSize: '10px', color: '#C1440E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Synthèse
        </div>
        {stats.insights.map((line, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0', fontSize: '13px', color: 'rgba(242,237,230,0.75)', lineHeight: 1.5 }}>
            {line}
          </p>
        ))}
      </div>

      {/* Row 1: Category + Urgency */}
      <div style={{ display: 'grid', gridTemplateColumns: chartsCols, gap: '16px', marginBottom: '16px' }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Signalements par catégorie</div>
          {stats.total === 0 ? (
            <NoData />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.categoryData.map(cat => {
                const widthPct = cat.value > 0 ? Math.max((cat.value / stats.maxCategoryCount) * 100, 4) : 0;
                return (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.45)', width: '72px', flexShrink: 0, textAlign: 'right' }}>
                      {cat.name}
                    </span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '3px', width: `${widthPct}%`, background: cat.color, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, letterSpacing: '-0.01em', color: 'rgba(242,237,230,0.5)', width: '24px', textAlign: 'right', flexShrink: 0 }}>
                      {cat.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Répartition par urgence</div>
          {stats.total === 0 ? (
            <NoData />
          ) : (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.urgencyData.length ? stats.urgencyData : stats.urgencyDataAll}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {(stats.urgencyData.length ? stats.urgencyData : stats.urgencyDataAll).map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {stats.urgencyDataAll.filter(d => d.value > 0).map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: '10px', color: 'rgba(242,237,230,0.5)' }}>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly evolution */}
      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <div style={cardTitleStyle}>Évolution mensuelle</div>
        {stats.monthlyData.length === 0 ? (
          <NoData text="Aucun signalement ou zone enregistré pour l'instant" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats.monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,237,230,0.06)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(242,237,230,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'rgba(242,237,230,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(242,237,230,0.5)' }} />
              <Line type="monotone" dataKey="remarks" name="Signalements" stroke="#C1440E" strokeWidth={2.5} dot={{ r: 4, fill: '#C1440E' }} />
              <Line type="monotone" dataKey="zones" name="Zones créées" stroke="rgba(242,237,230,0.3)" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 3, fill: 'rgba(242,237,230,0.3)' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 2: Zone + Duration */}
      <div style={{ display: 'grid', gridTemplateColumns: chartsCols, gap: '16px' }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Signalements par zone</div>
          {stats.total === 0 && stats.zonesCount === 0 ? (
            <NoData />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, stats.zoneBarData.length * 36)} style={{ outline: 'none' }}>
              <BarChart data={stats.zoneBarData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,237,230,0.06)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(242,237,230,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="zone" width={100} tick={{ fill: 'rgba(242,237,230,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={false} />
                <Bar dataKey="count" name="Signalements" radius={[0, 4, 4, 0]} activeBar={false} isAnimationActive={false}>
                  {stats.zoneBarData.map((entry, i) => {
                    const zoneColors = [
                      'rgba(242,237,230,0.55)',
                      'rgba(242,237,230,0.4)',
                      'rgba(242,237,230,0.28)',
                      'rgba(242,237,230,0.18)',
                    ]
                    const fill = entry.zone === 'Non assignés' ? 'rgba(193,68,14,0.6)' : zoneColors[i % zoneColors.length]
                    return <Cell key={entry.zone} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>Durée des problèmes</div>
          {stats.durationData.length === 0 ? (
            <NoData />
          ) : (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.durationData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {stats.durationData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {stats.durationData.map(d => {
                  const pct = stats.total ? Math.round((d.value / stats.total) * 100) : 0;
                  return (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'rgba(242,237,230,0.5)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{d.name}</span>
                      <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>{d.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
