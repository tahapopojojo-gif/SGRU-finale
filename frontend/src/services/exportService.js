import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const BACKEND_URL = 'http://localhost:8000';

const CITY_PREFIX = {
  marrakech: 'MRK', marrakesh: 'MRK', casablanca: 'CASA', rabat: 'RBT',
  fes: 'FES', tanger: 'TNG', agadir: 'AGD', meknes: 'MKN',
};

const CATEGORIES = [
  { value: 'road', label: 'Route' },
  { value: 'lighting', label: 'Éclairage' },
  { value: 'waste', label: 'Déchets' },
  { value: 'water', label: 'Eau' },
  { value: 'parks', label: 'Parcs' },
  { value: 'schools', label: 'Écoles' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Autre' },
];

const DURATION_LABELS = {
  days: 'Quelques jours',
  months: 'Quelques mois',
  year: 'Plus d\'un an',
  always: 'Depuis longtemps',
};

const CSV_HEADERS = [
  'reference', 'date', 'latitude', 'longitude', 'category', 'urgency', 'duration',
  'description', 'profile', 'reasons', 'zone_name', 'photo_url',
];

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

const getCategoryLabel = (value) => {
  const key = (value || 'other').toLowerCase();
  return CATEGORIES.find(c => c.value === key)?.label || key;
};

const formatRef = (remark, city) => {
  const prefix = CITY_PREFIX[(city || '').toLowerCase()] || 'RPT';
  return `${prefix}-${String(remark.id).padStart(5, '0')}`;
};

const formatDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatIsoDate = (d) => {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
};

const getPhotoUrl = (remark) => {
  if (!remark.photo_path) return '';
  if (remark.photo_path.startsWith('http')) return remark.photo_path;
  return `${BACKEND_URL}/storage/${remark.photo_path}`;
};

const getAffectedGroups = (remark) => {
  const parts = [];
  if (Array.isArray(remark.problems) && remark.problems.length) parts.push(...remark.problems);
  if (Array.isArray(remark.reasons) && remark.reasons.length) parts.push(...remark.reasons);
  return [...new Set(parts)].join('; ');
};

const resolveZoneName = (remark, zones) => {
  if (remark.zone?.nom) return remark.zone.nom;
  if (remark.zone_id) {
    const z = zones.find(zn => zn.id === remark.zone_id);
    if (z) return z.nom;
  }
  const coords = getRemarkCoords(remark);
  if (!coords) return '';
  const z = zones.find(zn => isValidCoords(zn.coordonnees_geojson) && pointInPolygon(coords, zn.coordonnees_geojson));
  return z?.nom || '';
};

export const normalizeRemarkRow = (remark, zones, city) => {
  const durationKey = remark.duration || remark.residence_duration;
  return {
    reference: formatRef(remark, city),
    date: formatIsoDate(remark.created_at),
    latitude: remark.latitude ?? '',
    longitude: remark.longitude ?? '',
    category: getCategoryLabel(remark.categorie || remark.building_type),
    urgency: remark.urgency ?? '',
    duration: DURATION_LABELS[durationKey] || durationKey || '',
    description: (remark.opinion || '').replace(/\s+/g, ' ').trim(),
    profile: remark.profile || '',
    reasons: getAffectedGroups(remark),
    zone_name: resolveZoneName(remark, zones),
    photo_url: getPhotoUrl(remark),
  };
};

export const filterRemarksForExport = (remarks, zones, filters, cityBounds) => {
  const zoneIds = zones.map(z => z.id);

  return remarks.filter(r => {
    const coords = getRemarkCoords(r);
    if (cityBounds && coords) {
      const [[south, west], [north, east]] = cityBounds;
      const inCity = coords[0] >= south && coords[0] <= north && coords[1] >= west && coords[1] <= east;
      const inZone = r.zone_id && zoneIds.includes(r.zone_id);
      if (!inCity && !inZone) return false;
    }

    if (filters.zone_id) {
      const zid = parseInt(filters.zone_id, 10);
      const remarkZoneId = r.zone_id || zones.find(z => {
        const c = getRemarkCoords(r);
        return c && isValidCoords(z.coordonnees_geojson) && pointInPolygon(c, z.coordonnees_geojson);
      })?.id;
      if (remarkZoneId !== zid) return false;
    }

    if (filters.category) {
      const cat = (r.categorie || r.building_type || '').toLowerCase();
      if (cat !== filters.category) return false;
    }

    if (filters.urgency === 'low' && (parseInt(r.urgency, 10) || 0) > 2) return false;
    if (filters.urgency === 'medium' && (parseInt(r.urgency, 10) || 0) !== 3) return false;
    if (filters.urgency === 'high' && (parseInt(r.urgency, 10) || 0) < 4) return false;

    if (filters.dateStart) {
      const d = new Date(r.created_at);
      if (d < new Date(filters.dateStart)) return false;
    }
    if (filters.dateEnd) {
      const d = new Date(r.created_at);
      const end = new Date(filters.dateEnd);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }

    return true;
  });
};

const escapeCsv = (val) => {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const buildExportFilename = (format, city, suffix = '') => {
  const citySlug = (city || 'export').toLowerCase().replace(/\s+/g, '-');
  const ts = Date.now();
  const ext = { csv: 'csv', geojson: 'geojson', excel: 'xlsx', pdf: 'pdf' }[format] || 'dat';
  return `urbanmap-${format}-${citySlug}${suffix ? `-${suffix}` : ''}-${ts}.${ext}`;
};

export const exportCSV = (remarks, zones, city) => {
  const rows = remarks.map(r => normalizeRemarkRow(r, zones, city));
  const lines = [
    CSV_HEADERS.join(','),
    ...rows.map(row => CSV_HEADERS.map(h => escapeCsv(row[h])).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, buildExportFilename('csv', city));
  return rows.length;
};

export const exportGeoJSON = (remarks, zones, city) => {
  const rowMap = remarks.map(r => normalizeRemarkRow(r, zones, city));

  const zoneFeatures = zones.map(z => {
    const ring = (z.coordonnees_geojson || []).map(([lat, lng]) => [lng, lat]);
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
      ring.push(ring[0]);
    }
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {
        feature_type: 'zone',
        zone_id: z.id,
        nom: z.nom,
        ville: z.ville,
        couleur: z.couleur,
        centre_lat: z.centre_lat,
        centre_lng: z.centre_lng,
        notes: z.notes || '',
      },
    };
  });

  const pointFeatures = remarks.map((r, i) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)],
    },
    properties: {
      feature_type: 'signalement',
      ...rowMap[i],
    },
  }));

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      generated_at: new Date().toISOString(),
      city,
      count_signalements: remarks.length,
      count_zones: zones.length,
    },
    features: [...zoneFeatures, ...pointFeatures],
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
  downloadBlob(blob, buildExportFilename('geojson', city));
  return remarks.length;
};

const buildCategoryZoneMatrix = (rows) => {
  const zoneNames = [...new Set(rows.map(r => r.zone_name || 'Non assignés'))].sort();
  const catLabels = CATEGORIES.map(c => c.label);
  const matrix = catLabels.map(cat => {
    const line = { Catégorie: cat };
    zoneNames.forEach(zn => {
      line[zn] = rows.filter(r => r.category === cat && (r.zone_name || 'Non assignés') === zn).length;
    });
    line.Total = rows.filter(r => r.category === cat).length;
    return line;
  });
  const totalRow = { Catégorie: 'Total' };
  zoneNames.forEach(zn => {
    totalRow[zn] = rows.filter(r => (r.zone_name || 'Non assignés') === zn).length;
  });
  totalRow.Total = rows.length;
  matrix.push(totalRow);
  return matrix;
};

const buildUrgencySheet = (rows) => {
  const total = rows.length || 1;
  return [1, 2, 3, 4, 5].map(level => {
    const count = rows.filter(r => parseInt(r.urgency, 10) === level).length;
    return {
      Niveau: level,
      Signalements: count,
      'Pourcentage (%)': total ? Math.round((count / total) * 100) : 0,
    };
  });
};

export const exportExcel = (remarks, zones, city) => {
  const rows = remarks.map(r => normalizeRemarkRow(r, zones, city));
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Signalements');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildCategoryZoneMatrix(rows)), 'Catégorie × Zone');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildUrgencySheet(rows)), 'Urgence');

  XLSX.writeFile(wb, buildExportFilename('excel', city));
  return rows.length;
};

const computeExportStats = (remarks, zones, rows, cityLabel) => {
  const total = remarks.length;
  const zonesCount = zones.length;
  const assigned = rows.filter(r => r.zone_name).length;
  const coveragePct = total ? Math.round((assigned / total) * 100) : 0;

  const catCounts = {};
  rows.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

  const zoneSummary = {};
  rows.forEach(r => {
    const zn = r.zone_name || 'Non assignés';
    if (!zoneSummary[zn]) zoneSummary[zn] = { count: 0, urgSum: 0 };
    zoneSummary[zn].count += 1;
    zoneSummary[zn].urgSum += parseInt(r.urgency, 10) || 0;
  });

  const highUrgencyPct = total
    ? Math.round((rows.filter(r => (parseInt(r.urgency, 10) || 0) >= 4).length / total) * 100)
    : 0;

  const synthesis = [];
  synthesis.push(
    `${total} signalement${total !== 1 ? 's' : ''} exporté${total !== 1 ? 's' : ''} pour ${cityLabel}.`,
  );
  if (topCat) {
    synthesis.push(`La catégorie dominante est ${topCat[0]} (${topCat[1]} signalement${topCat[1] !== 1 ? 's' : ''}).`);
  }
  synthesis.push(
    `Couverture zonale : ${coveragePct} % des signalements sont rattachés à une zone officielle (${zonesCount} zone${zonesCount !== 1 ? 's' : ''}).`,
  );
  if (highUrgencyPct >= 40) {
    synthesis.push(`${highUrgencyPct} % des signalements sont de niveau 4 ou 5 — priorité d'intervention élevée.`);
  } else if (zoneSummary['Non assignés']?.count > 0) {
    synthesis.push(`${zoneSummary['Non assignés'].count} signalement${zoneSummary['Non assignés'].count !== 1 ? 's' : ''} restent non assignés à une zone.`);
  }

  return {
    total,
    zonesCount,
    coveragePct,
    catCounts,
    zoneSummary,
    synthesis,
    urgencyCounts: [1, 2, 3, 4, 5].map(l => ({
      level: l,
      count: rows.filter(r => parseInt(r.urgency, 10) === l).length,
    })),
  };
};

export const exportPDF = (remarks, zones, city, periodLabel) => {
  const rows = remarks.map(r => normalizeRemarkRow(r, zones, city));
  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : 'Ville';
  const stats = computeExportStats(remarks, zones, rows, cityLabel);
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 0;

  // Cover
  doc.setFillColor(193, 68, 14);
  doc.rect(0, 0, 210, 55, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('UrbanMap — Rapport d\'export', 20, 22);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(cityLabel, 20, 32);
  doc.setFontSize(10);
  doc.text(`Généré le ${dateStr}`, 20, 42);
  doc.text(`Période : ${periodLabel}`, 20, 48);

  y = 68;
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Indicateurs clés', 20, y);
  y += 8;

  const kpiData = [
    ['Total signalements', String(stats.total)],
    ['Zones officielles', String(stats.zonesCount)],
    ['Couverture zonale', `${stats.coveragePct} %`],
    ['Urgents (niv. 4-5)', String(rows.filter(r => (parseInt(r.urgency, 10) || 0) >= 4).length)],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [193, 68, 14] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Signalements par catégorie', 20, y);
  y += 6;
  const catRows = Object.entries(stats.catCounts).sort((a, b) => b[1] - a[1]);
  autoTable(doc, {
    startY: y,
    head: [['Catégorie', 'Nombre']],
    body: catRows.length ? catRows : [['—', '0']],
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 12;

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Répartition par urgence', 20, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Niveau', 'Signalements']],
    body: stats.urgencyCounts.map(u => [String(u.level), String(u.count)]),
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 12;

  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Synthèse par zone', 20, y);
  y += 6;
  const zoneRows = Object.entries(stats.zoneSummary)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, data]) => [
      name,
      String(data.count),
      data.count ? (data.urgSum / data.count).toFixed(1) : '—',
    ]);
  autoTable(doc, {
    startY: y,
    head: [['Zone', 'Signalements', 'Urgence moy.']],
    body: zoneRows.length ? zoneRows : [['—', '0', '—']],
    theme: 'grid',
    headStyles: { fillColor: [82, 190, 128] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  y = doc.lastAutoTable.finalY + 14;

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Synthèse', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  stats.synthesis.forEach(line => {
    const wrapped = doc.splitTextToSize(line, 170);
    doc.text(wrapped, 20, y);
    y += wrapped.length * 5 + 4;
  });

  doc.save(buildExportFilename('pdf', city));
  return rows.length;
};

export { CATEGORIES, DURATION_LABELS };
