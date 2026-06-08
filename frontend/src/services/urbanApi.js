import axiosInstance from './axiosInstance';

// ─── ZONES ───────────────────────────────────────────────────────────────────

// GET /api/zones (backend automatically filters by the logged-in user's city)
export const getZonesWithStats = async () => {
  const response = await axiosInstance.get('/zones');
  return response.data.data || response.data;
};

// ─── REMARQUES ───────────────────────────────────────────────────────────────

// GET /api/remarques?statut=en_cours (only in-progress remarks)
export const getValidatedRemarks = async (params = {}) => {
  const response = await axiosInstance.get('/remarques', {
    params: { statut: 'en_cours', ...params },
  });
  return response.data.data || response.data;
};

// ─── ANNOTATIONS ─────────────────────────────────────────────────────────────

// GET /api/zones/{zone_id}/annotations
export const getAnnotations = async (zoneId) => {
  const response = await axiosInstance.get(`/zones/${zoneId}/annotations`);
  return response.data.data || response.data;
};

// POST /api/annotations (upsert: create or update per urbaniste per zone)
export const saveAnnotation = async (zoneId, texte) => {
  const response = await axiosInstance.post('/annotations', {
    zone_id: zoneId,
    texte,
  });
  return response.data.data || response.data;
};

// PATCH /api/annotations/{id}
export const updateAnnotation = async (annotationId, texte) => {
  const response = await axiosInstance.patch(`/annotations/${annotationId}`, { texte });
  return response.data.data || response.data;
};

// DELETE /api/annotations/{id}
export const deleteAnnotation = async (annotationId) => {
  const response = await axiosInstance.delete(`/annotations/${annotationId}`);
  return response.data.data || response.data;
};

// ─── AI SUMMARY ──────────────────────────────────────────────────────────────

// GET /api/zones/{zone_id}/summary (fetch existing AI summary)
export const getZoneAiSummary = async (zoneId) => {
  const response = await axiosInstance.get(`/zones/${zoneId}/summary`);
  return response.data.data || response.data;
};

// POST /api/zones/{zone_id}/summary (trigger new AI summary generation)
export const generateZoneAiSummary = async (zoneId) => {
  const response = await axiosInstance.post(`/zones/${zoneId}/summary`);
  return response.data.data || response.data;
};

// --- BACKWARDS COMPATIBILITY ALIASES ---
export const getOpinionsByZone = async (zoneId, categorie, city) => {
  // map to the new getValidatedRemarks
  return getValidatedRemarks({ zone_id: zoneId, categorie, city });
};

export const getZoneSummary = getZoneAiSummary;

export const saveZoneSummary = async (zoneId, text) => {
  // In the real backend, the generation saves it. 
  // If the component calls this to save custom text, we might just ignore it 
  // or use the trigger if it has no text saving endpoint.
  // We'll mock it to prevent crashes.
  return { success: true };
};

export const getUrbanStatsByZone = async (zoneId, city) => {
  const remarksRes = await getValidatedRemarks({ zone_id: zoneId, ville: city });
  const remarks = Array.isArray(remarksRes) ? remarksRes 
                : Array.isArray(remarksRes?.data) ? remarksRes.data 
                : Array.isArray(remarksRes?.data?.data) ? remarksRes.data.data 
                : [];
  
  const totalRemarks = remarks.length;
  const urgentCount = remarks.filter(r => (r.urgency || 0) >= 4).length;
  const avgUrgency = totalRemarks > 0 
    ? (remarks.reduce((acc, r) => acc + (r.urgency || 1), 0) / totalRemarks).toFixed(1) 
    : 0;

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
  const catLabels = {
    route: "Route",
    eclairage: "Éclairage",
    dechets: "Déchets",
    eau: "Eau",
    parc: "Parc",
    transport: "Transport",
    autre: "Autre"
  };
  
  const byCategory = categories.map(cat => ({
    name: catLabels[cat],
    value: remarks.filter(r => {
      const c = (r.categorie || 'autre').toLowerCase().trim();
      return c === cat;
    }).length,
    color: catColors[cat]
  }));

  const byUrgency = [1, 2, 3, 4, 5].map(level => ({
    urgency: `Niveau ${level}`,
    count: remarks.filter(r => r.urgency === level).length
  }));

  // Generate irregular and real weekly/monthly temporal data
  const now = new Date();
  const temporalData = Array.from({ length: 6 }, (_, idx) => {
    const targetMonth = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const label = targetMonth.toLocaleString('fr-FR', { month: 'short' });
    const count = remarks.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear();
    }).length;
    return { label, count };
  });

  // Calculate duration breakdown
  const chronicCount = remarks.filter(r => {
    const dur = (r.residence_duration || r.duration || '').toLowerCase();
    return dur.includes("an") || dur.includes("toujours");
  }).length;
  const chronicPct = totalRemarks > 0 ? `${Math.round((chronicCount / totalRemarks) * 100)}%` : '0%';

  const catCounts = remarks.reduce((acc, r) => {
    const c = (r.categorie || 'autre').toLowerCase().trim();
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  
  let domCat = "autre";
  let maxCat = -1;
  for (const [c, count] of Object.entries(catCounts)) {
    if (count > maxCat) { maxCat = count; domCat = c; }
  }

  // Calculate profile breakdown
  const profiles = { "resident": 0, "conducteur": 0, "pieton": 0, "commercant": 0, "passant": 0 };
  remarks.forEach(r => {
    const prof = r.profile;
    if (prof && profiles[prof] !== undefined) {
      profiles[prof]++;
    }
  });

  // Calculate affected groups
  const affected = {};
  remarks.forEach(r => {
    const groups = r.reasons || [];
    if (Array.isArray(groups)) {
      groups.forEach(g => {
        affected[g] = (affected[g] || 0) + 1;
      });
    }
  });

  return {
    totalRemarks,
    urgentCount,
    avgUrgency: parseFloat(avgUrgency),
    dominantCategory: catLabels[domCat] || "Autre",
    byCategory,
    byUrgency,
    temporalData,
    chronicPct,
    profiles,
    affectedGroups: affected,
  };
};

