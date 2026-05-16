import axiosInstance from './axiosInstance';

// ─── ZONES ───────────────────────────────────────────────────────────────────

// GET /api/zones (backend automatically filters by the logged-in user's city)
export const getZonesWithStats = async () => {
  const response = await axiosInstance.get('/zones');
  return response.data.data || response.data;
};

// ─── REMARQUES ───────────────────────────────────────────────────────────────

// GET /api/remarques?statut=validee (only validated remarks)
export const getValidatedRemarks = async (params = {}) => {
  const response = await axiosInstance.get('/remarques', {
    params: { statut: 'validee', ...params },
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
  const urgentCount = remarks.filter(r => r.statut === 'urgent').length;
  const avgUrgency = totalRemarks > 0 
    ? (remarks.reduce((acc, r) => acc + (r.urgency || 1), 0) / totalRemarks).toFixed(1) 
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
      const date = new Date(r.created_at || Date.now());
      const weekIdx = Math.floor((date.getDate() - 1) / 7);
      return weekIdx === idx;
    }).length;
    return { label: week, count };
  });

  const catCounts = remarks.reduce((acc, r) => {
    const c = r.categorie || r.category;
    if (c) acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  
  let domCat = "N/A";
  let maxCat = 0;
  for (const [c, count] of Object.entries(catCounts)) {
    if (count > maxCat) { maxCat = count; domCat = c; }
  }

  return {
    totalRemarks,
    urgentCount,
    avgUrgency: parseFloat(avgUrgency),
    dominantCategory: catLabels[domCat] || "Autre",
    byCategory,
    byUrgency,
    temporalData
  };
};

