// FINAL UNIFIED MOCK API
// Supports both REST style (post, get, put) and Named methods (getRemarks)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const INITIAL_REMARKS = [
  {
    id: 1, user_id: 'u1', user_email: 'ali@example.com', user_name: 'Ali Mansour',
    zone_id: 1, zone_nom: 'Gueliz',
    categorie: 'Voirie', statut: 'urgent',
    building_type: 'résidentiel', reasons: ['Éclairage insuffisant'], problems: ['Sécurité nocturne'],
    urgency: 5, profile: 'Résident', residence_duration: '5-10 ans',
    opinion: 'La rue Mohamed V manque de lampadaires près du parc.',
    opinion_ai_validated: true,
    opinion_ai_summary: 'Besoin urgent de renforcement de l\'éclairage public.',
    commentaire_admin: 'Priorité absolue pour le budget Q3.',
    photo: null,
    latitude: 31.6295, longitude: -8.0083,
    positions: [[31.6295,-8.0083]],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 2, user_id: 'u2', user_email: 'sara@example.com', user_name: 'Sara El Amrani',
    zone_id: 2, zone_nom: 'Médina',
    categorie: 'Patrimoine', statut: 'actif',
    building_type: 'historique', reasons: ['Dégradation'], problems: ['Murs fissurés'],
    urgency: 4, profile: 'Commerçant', residence_duration: 'plus de 10 ans',
    opinion: 'Les remparts près de Bab Agnaou présentent des fissures inquiétantes.',
    opinion_ai_validated: false,
    opinion_ai_summary: null,
    commentaire_admin: null,
    photo: null,
    latitude: 31.6175, longitude: -7.9890,
    positions: [[31.6175,-7.9890]],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 3, user_id: 'u3', user_email: 'omar@example.com', user_name: 'Omar Tazi',
    zone_id: 3, zone_nom: 'Hivernage',
    categorie: 'Espaces Verts', statut: 'planifie',
    building_type: 'mixte', reasons: ['Entretien'], problems: ['Arrosage défaillant'],
    urgency: 2, profile: 'Visiteur', residence_duration: 'moins de 2 ans',
    opinion: 'Les jardins de la Ménara pourraient bénéficier de plus de bancs à l\'ombre.',
    opinion_ai_validated: true,
    opinion_ai_summary: 'Amélioration du mobilier urbain souhaitée.',
    commentaire_admin: 'À intégrer dans le plan de rénovation paysagère.',
    photo: null,
    latitude: 31.6135, longitude: -8.0200,
    positions: [[31.6135,-8.0200]],
    created_at: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 4, user_id: 'u4', user_email: 'leila@example.com', user_name: 'Leila Bennani',
    zone_id: 1, zone_nom: 'Gueliz',
    categorie: 'Urbanisme', statut: 'validee',
    building_type: 'commercial', reasons: ['Densité'], problems: ['Manque de parkings'],
    urgency: 3, profile: 'Professionnel', residence_duration: '2-5 ans',
    opinion: 'Le stationnement en double file bloque la circulation sur l\'avenue Hassan II.',
    opinion_ai_validated: true,
    opinion_ai_summary: 'Problème de congestion lié au stationnement sauvage.',
    commentaire_admin: 'Validé pour étude de faisabilité de parking souterrain.',
    photo: null,
    latitude: 31.6350, longitude: -8.0120,
    positions: [[31.6350,-8.0120]],
    created_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 5, user_id: 'u5', user_email: 'yassine@example.com', user_name: 'Yassine Radi',
    zone_id: 2, zone_nom: 'Médina',
    categorie: 'Déchets', statut: 'rejete',
    building_type: 'résidentiel', reasons: ['Nuisances'], problems: ['Dépôts sauvages'],
    urgency: 5, profile: 'Résident', residence_duration: 'plus de 10 ans',
    opinion: 'Les poubelles ne sont pas ramassées assez souvent dans le quartier Derb Sultan.',
    opinion_ai_validated: false,
    opinion_ai_summary: null,
    commentaire_admin: 'Doublon avec la requête #124. Déjà traité.',
    photo: null,
    latitude: 31.6250, longitude: -7.9850,
    positions: [[31.6250,-7.9850]],
    created_at: new Date(Date.now() - 86400000 * 12).toISOString()
  },
  {
    id: 6, user_id: 'u6', user_email: 'fatima@example.com', user_name: 'Fatima Zahra',
    zone_id: 3, zone_nom: 'Hivernage',
    categorie: 'Transport', statut: 'en_attente',
    building_type: 'mixte', reasons: ['Accessibilité'], problems: ['Absence de pistes cyclables'],
    urgency: 3, profile: 'Étudiant', residence_duration: '2-5 ans',
    opinion: 'Il manque une piste cyclable sécurisée entre Gueliz et Hivernage.',
    opinion_ai_validated: false,
    opinion_ai_summary: null,
    commentaire_admin: null,
    photo: null,
    latitude: 31.6200, longitude: -8.0150,
    positions: [[31.6200,-8.0150]],
    created_at: new Date().toISOString()
  }
];

const INITIAL_ZONES = [
  {
    id: 1,
    nom: 'Gueliz',
    ville: 'marrakesh',
    couleur: '#3b82f6',
    coordonnees_geojson: [[31.635,-8.01],[31.635,-8.00],[31.625,-8.00],[31.625,-8.01]],
    centre: { lat: 31.63, lng: -8.005 }
  },
  {
    id: 2,
    nom: 'Médina',
    ville: 'marrakesh',
    couleur: '#ef4444',
    coordonnees_geojson: [[31.635,-7.995],[31.635,-7.98],[31.625,-7.98],[31.625,-7.995]],
    centre: { lat: 31.63, lng: -7.987 }
  },
  {
    id: 3,
    nom: 'Hivernage',
    ville: 'marrakesh',
    couleur: '#10b981',
    coordonnees_geojson: [[31.625,-8.01],[31.625,-8.00],[31.615,-8.00],[31.615,-8.01]],
    centre: { lat: 31.62, lng: -8.005 }
  }
];

const api = {
  // --- REST Style (For Login/Register) ---
  post: async (path, data) => {
    await delay(300);
    if (path === '/register') {
      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      if (users.find(u => u.email === data.email)) throw { response: { data: { message: 'Email déjà utilisé' } } };
      const statut = (data.role === 'admin' || data.role === 'urbaniste') 
        ? 'pending' 
        : 'active';

      const newUser = { ...data, id: Date.now(), statut };
      users.push(newUser);
      localStorage.setItem('mock_users', JSON.stringify(users));
      return { data: { user: newUser, token: 'mock-token' } };
    }
    if (path === '/login') {
      if (data.email === 'superadmin@urbanmap.ma' && data.password === 'super123') {
        return { data: { user: { id: 'super_admin', nom: 'Super Admin', email: 'superadmin@urbanmap.ma', role: 'super_admin', statut: 'active' }, token: 'super-token' } };
      }

      const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
      const user = users.find(u => u.email === data.email && u.password === data.password);
      if (!user) throw { response: { data: { message: 'Identifiants invalides' } } };
      if (user.statut === 'pending') {
        throw { 
          response: { 
            data: { message: 'Compte en attente de validation par l\'administration' } 
          } 
        }
      }
      if (user.statut === 'rejected') {
        throw { 
          response: { 
            data: { message: 'Ce compte a été refusé' } 
          } 
        }
      }
      return { data: { user, token: 'mock-token' } };
    }
    return { data: {} };
  },

  get: async (path) => {
    await delay(300);
    if (path === '/remarques') {
        return api.getRemarks();
    }
    return { data: [] };
  },

  // --- Named Methods (For Map and Dashboard) ---
  getRemarks: async () => {
    let remarks = JSON.parse(localStorage.getItem('urban_remarks'));
    if (!remarks || remarks.length === 0) {
        remarks = INITIAL_REMARKS;
        localStorage.setItem('urban_remarks', JSON.stringify(remarks));
    }
    return { data: remarks };
  },

  addRemark: async (remark) => {
    const remarks = JSON.parse(localStorage.getItem('urban_remarks') || '[]');
    const newRemark = { 
      ...remark, 
      id: Date.now(), 
      created_at: new Date().toISOString(),
      opinion_ai_validated: remark.opinion_ai_validated || false,
      opinion_ai_summary: remark.opinion_ai_summary || null,
      commentaire_admin: remark.commentaire_admin || null,
      statut: remark.statut || 'en_attente'
    };
    remarks.push(newRemark);
    localStorage.setItem('urban_remarks', JSON.stringify(remarks));
    return { data: newRemark };
  },

  updateRemark: async (id, updates) => {
    let remarks = JSON.parse(localStorage.getItem('urban_remarks') || '[]');
    remarks = remarks.map(r => r.id === id ? { ...r, ...updates } : r);
    localStorage.setItem('urban_remarks', JSON.stringify(remarks));
    return { data: remarks.find(r => r.id === id) };
  },

  // --- Annotations Management ---
  getAnnotationsByZone: async (zoneId) => {
    await delay(300);
    const annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    const filtered = annotations.filter(a => String(a.zone_id) === String(zoneId));
    return { data: filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) };
  },

  getAnnotationsByUrbaniste: async (urbanisteId) => {
    await delay(300);
    const annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    const filtered = annotations.filter(a => String(a.urbaniste_id) === String(urbanisteId));
    return { data: filtered };
  },

  saveAnnotation: async ({ zone_id, zone_nom, urbaniste_id, texte }) => {
    await delay(300);
    const annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    const newAnnotation = {
      id: Date.now(),
      zone_id,
      zone_nom,
      urbaniste_id,
      texte,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    annotations.push(newAnnotation);
    localStorage.setItem('urbanmap_annotations', JSON.stringify(annotations));
    return { data: newAnnotation };
  },

  updateAnnotation: async (id, texte) => {
    await delay(300);
    let annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    let updated = null;
    annotations = annotations.map(a => {
      if (a.id === id) {
        updated = { ...a, texte, updated_at: new Date().toISOString() };
        return updated;
      }
      return a;
    });
    localStorage.setItem('urbanmap_annotations', JSON.stringify(annotations));
    return { data: updated };
  },

  deleteAnnotation: async (id) => {
    await delay(300);
    let annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    annotations = annotations.filter(a => a.id !== id);
    localStorage.setItem('urbanmap_annotations', JSON.stringify(annotations));
    return { data: { success: true } };
  },

  getAnnotationByZoneAndUrbaniste: async (zoneId, urbanisteId) => {
    await delay(300);
    const annotations = JSON.parse(localStorage.getItem('urbanmap_annotations') || '[]');
    const annotation = annotations.find(a => 
      String(a.zone_id) === String(zoneId) && 
      String(a.urbaniste_id) === String(urbanisteId)
    );
    return { data: annotation || null };
  },

  // --- Zone AI Summaries ---
  getZoneSummary: async (zone_id) => {
    const summaries = JSON.parse(localStorage.getItem('urbanmap_zone_summaries') || '[]');
    const summary = summaries.find(s => String(s.zone_id) === String(zone_id));
    return { data: summary || null };
  },

  saveZoneSummary: async (zone_id, summary_text) => {
    let summaries = JSON.parse(localStorage.getItem('urbanmap_zone_summaries') || '[]');
    const existingIndex = summaries.findIndex(s => String(s.zone_id) === String(zone_id));
    
    const summaryEntry = {
      zone_id,
      summary_text,
      generated_at: new Date().toISOString()
    };

    if (existingIndex > -1) {
      summaries[existingIndex] = summaryEntry;
    } else {
      summaries.push(summaryEntry);
    }

    localStorage.setItem('urbanmap_zone_summaries', JSON.stringify(summaries));
    return { data: summaryEntry };
  },

  // --- User Management Methods ---
  getAllUsers: async () => {
    return { data: JSON.parse(localStorage.getItem('mock_users') || '[]') };
  },
  
  getPendingUsers: async () => {
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    return { data: users.filter(u => u.statut === 'pending') };
  },

  updateUser: async (id, updates) => {
    let users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    users = users.map(u => u.id === id ? { ...u, ...updates } : u);
    localStorage.setItem('mock_users', JSON.stringify(users));
    return { data: users.find(u => u.id === id) };
  },

  // --- Zones Management Methods ---
  getZones: async (ville) => {
    let zones = JSON.parse(localStorage.getItem('urban_zones'));
    if (!zones || zones.length === 0) {
        zones = INITIAL_ZONES;
        localStorage.setItem('urban_zones', JSON.stringify(zones));
    }
    if (ville) {
        const cleanVille = ville.toLowerCase().trim();
        return { data: zones.filter(z => z.ville.toLowerCase().trim() === cleanVille) };
    }
    return { data: zones };
  },

  addZone: async (zone) => {
    const zones = JSON.parse(localStorage.getItem('urban_zones') || JSON.stringify(INITIAL_ZONES));
    const newZone = { ...zone, id: Date.now() };
    zones.push(newZone);
    localStorage.setItem('urban_zones', JSON.stringify(zones));
    return { data: newZone };
  },

  deleteZone: async (id) => {
    let zones = JSON.parse(localStorage.getItem('urban_zones') || '[]');
    zones = zones.filter(z => z.id !== id);
    localStorage.setItem('urban_zones', JSON.stringify(zones));
    return { data: { success: true } };
  }
};

export default api;