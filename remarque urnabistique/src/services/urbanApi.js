/**
 * Urbaniste API Service (Mock Version)
 * Separate service for Urbaniste-specific operations.
 * Reuses the remarks and zones from localStorage, adding annotations.
 */

const REMARKS_KEY = 'urban_remarks';
const ZONES_KEY = 'urban_zones';
const ANNOTATIONS_KEY = 'annotations_mock_data';
const SUMMARIES_KEY = 'urbanmap_zone_summaries';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// --- STORAGE HELPERS ---
const getStoredData = (key, initial = []) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  let parsed = JSON.parse(data);
  
  // Auto-migrate old remarks to have opinion_ai_validated
  if (key === 'urban_remarks' && Array.isArray(parsed)) {
    let migrated = false;
    parsed = parsed.map(r => {
      if (r.opinion && r.opinion.trim() !== '' && !r.opinion_ai_validated) {
        migrated = true;
        return { ...r, opinion_ai_validated: true };
      }
      return r;
    });
    if (migrated) localStorage.setItem(key, JSON.stringify(parsed));
  }
  
  return parsed;
};

const saveStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- URBANISTE SERVICE FUNCTIONS ---

/**
 * Returns remarks that are NOT rejected.
 * Input: zoneId (optional — if null, return all zones)
 */
const getValidatedRemarks = async (zoneId = null) => {
  await delay(600);
  let remarks = getStoredData(REMARKS_KEY);
  
  // Filter out rejected remarks
  remarks = remarks.filter(r => r.statut !== 'rejete');
  
  if (zoneId) {
    remarks = remarks.filter(r => String(r.zone_id) === String(zoneId));
  }
  
  // Return only necessary fields for map and lists
  return remarks.map(r => ({
    id: r.id,
    zone_id: r.zone_id,
    zone_nom: r.zone_nom,
    categorie: r.categorie,
    statut: r.statut,
    urgency: r.urgency,
    profile: r.profile,
    opinion: r.opinion,
    created_at: r.created_at,
    latitude: r.latitude,
    longitude: r.longitude
  }));
};

/**
 * Returns all zones with computed stats for the urbaniste.
 */
const getZonesWithStats = async () => {
  await delay(700);
  const zones = getStoredData(ZONES_KEY);
  const remarks = getStoredData(REMARKS_KEY);
  
  return zones.map(z => {
    const zoneRemarks = remarks.filter(r => r.zone_id === z.id && r.statut !== 'rejete');
    
    // dominantCategory calculation
    const catCounts = zoneRemarks.reduce((acc, r) => {
      acc[r.categorie] = (acc[r.categorie] || 0) + 1;
      return acc;
    }, {});
    
    let dominantCategoryKey = "N/A";
    let max = 0;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > max) {
        max = count;
        dominantCategoryKey = cat;
      }
    }

    const catLabels = { 
      hopital: "Hôpital", ecole: "École", parc: "Parc", route: "Route", autre: "Autre" 
    };
    const dominantCategory = catLabels[dominantCategoryKey] || "Autre";
    
    // avgUrgency calculation
    const avgUrgency = zoneRemarks.length > 0 
      ? (zoneRemarks.reduce((acc, r) => acc + r.urgency, 0) / zoneRemarks.length).toFixed(1)
      : 0;
      
    return {
      id: z.id,
      nom: z.nom,
      couleur: z.couleur,
      coordonnees: z.coordonnees || z.coordonnees_geojson || [],
      centre: z.centre,
      totalRemarks: zoneRemarks.length,
      urgentCount: zoneRemarks.filter(r => r.statut === 'urgent').length,
      dominantCategory: dominantCategory,
      avgUrgency: parseFloat(avgUrgency)
    };
  });
};

/**
 * Detailed statistics for a specific zone (charts data).
 */
const getUrbanStatsByZone = async (zoneId) => {
  await delay(800);
  const zones = getStoredData(ZONES_KEY);
  const remarks = getStoredData(REMARKS_KEY);
  
  const zone = zones.find(z => String(z.id) === String(zoneId));
  if (!zone) throw new Error('Zone non trouvée');
  
  const zoneRemarks = remarks.filter(r => String(r.zone_id) === String(zoneId) && r.statut !== 'rejete');
  
  // Category distribution
  const categories = ["hopital", "ecole", "parc", "route", "autre"];
  const catColors = { 
    hopital: "#FF6384", ecole: "#36A2EB", parc: "#4BC0C0", route: "#FFCE56", autre: "#9966FF" 
  };
  const catLabels = { 
    hopital: "Hôpital", ecole: "École", parc: "Parc", route: "Route", autre: "Autre" 
  };
  
  const byCategory = categories.map(cat => ({
    name: catLabels[cat],
    value: zoneRemarks.filter(r => r.categorie === cat).length,
    color: catColors[cat]
  }));
  
  // Urgency distribution
  const byUrgency = [1, 2, 3, 4, 5].map(level => ({
    urgency: `Niveau ${level}`,
    count: zoneRemarks.filter(r => r.urgency === level).length
  }));
  
  // Temporal data (Grouped by week)
  const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
  const temporalData = weeks.map((week, idx) => {
    const count = zoneRemarks.filter(r => {
      const date = new Date(r.created_at);
      const weekIdx = Math.floor((date.getDate() - 1) / 7);
      return weekIdx === idx;
    }).length;
    return { label: week, count };
  });

  // KPI Calculations
  const catCounts = zoneRemarks.reduce((acc, r) => {
    acc[r.categorie] = (acc[r.categorie] || 0) + 1;
    return acc;
  }, {});
  let dominantCategoryKey = "N/A";
  let maxCatCount = 0;
  for (const [cat, count] of Object.entries(catCounts)) {
    if (count > maxCatCount) {
      maxCatCount = count;
      dominantCategoryKey = cat;
    }
  }

  const avgUrgency = zoneRemarks.length > 0 
    ? (zoneRemarks.reduce((acc, r) => acc + r.urgency, 0) / zoneRemarks.length).toFixed(1)
    : 0;

  return {
    zoneInfo: { id: zone.id, nom: zone.nom, couleur: zone.couleur, ville: zone.ville },
    totalRemarks: zoneRemarks.length,
    byCategory,
    byUrgency,
    temporalData,
    avgUrgency: parseFloat(avgUrgency),
    dominantCategory: catLabels[dominantCategoryKey] || "N/A",
    urgentCount: zoneRemarks.filter(r => r.statut === 'urgent').length
  };
};

/**
 * Returns remarks where opinion is NOT null/empty.
 */
const getOpinionsByZone = async (zoneId = null, category = null) => {
  await delay(500);
  let remarks = getStoredData(REMARKS_KEY);
  
  remarks = remarks.filter(r => r.opinion && r.opinion.trim() !== '' && r.statut !== 'rejete' && r.opinion_ai_validated === true);
  
  if (zoneId) remarks = remarks.filter(r => String(r.zone_id) === String(zoneId));
  if (category) remarks = remarks.filter(r => r.categorie === category);
  
  return remarks.map(r => ({
    id: r.id,
    zone_nom: r.zone_nom,
    categorie: r.categorie,
    urgency: r.urgency,
    profile: r.profile,
    opinion: r.opinion,
    created_at: r.created_at
  }));
};

/**
 * --- ANNOTATION OPERATIONS ---
 */

const getAnnotations = async (zoneId) => {
  await delay(400);
  const annotations = getStoredData(ANNOTATIONS_KEY, []);
  return annotations.filter(a => a.zone_id === zoneId);
};

const saveAnnotation = async (zoneId, texte) => {
  await delay(600);
  let annotations = getStoredData(ANNOTATIONS_KEY, []);
  
  // Upsert logic: One annotation per zone for the current urbaniste context
  const existingIdx = annotations.findIndex(a => a.zone_id === zoneId);
  
  let annotation;
  if (existingIdx > -1) {
    annotation = {
      ...annotations[existingIdx],
      texte,
      updated_at: new Date().toISOString()
    };
    annotations[existingIdx] = annotation;
  } else {
    annotation = {
      id: "ann_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      zone_id: zoneId,
      texte,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    annotations.push(annotation);
  }
  
  saveStoredData(ANNOTATIONS_KEY, annotations);
  return { success: true, data: annotation };
};

const deleteAnnotation = async (annotationId) => {
  await delay(500);
  let annotations = getStoredData(ANNOTATIONS_KEY, []);
  annotations = annotations.filter(a => a.id !== annotationId);
  saveStoredData(ANNOTATIONS_KEY, annotations);
  return { success: true };
};

// --- ZONE SUMMARY OPERATIONS ---

/**
 * Returns the saved AI summary for a zone, or null.
 */
const getZoneSummary = async (zone_id) => {
  await delay(200);
  const summaries = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '[]');
  const summary = summaries.find(s => String(s.zone_id) === String(zone_id));
  return summary ? { data: summary } : null;
};

/**
 * Persists an AI summary for a zone (upsert).
 */
const saveZoneSummary = async (zone_id, summary_text) => {
  await delay(200);
  let summaries = JSON.parse(localStorage.getItem(SUMMARIES_KEY) || '[]');
  const existingIndex = summaries.findIndex(s => String(s.zone_id) === String(zone_id));
  const entry = {
    zone_id,
    summary_text,
    generated_at: new Date().toISOString()
  };
  if (existingIndex > -1) {
    summaries[existingIndex] = entry;
  } else {
    summaries.push(entry);
  }
  localStorage.setItem(SUMMARIES_KEY, JSON.stringify(summaries));
  return { data: entry };
};

export {
  getValidatedRemarks,
  getZonesWithStats,
  getUrbanStatsByZone,
  getOpinionsByZone,
  getAnnotations,
  saveAnnotation,
  deleteAnnotation,
  getZoneSummary,
  saveZoneSummary
};
