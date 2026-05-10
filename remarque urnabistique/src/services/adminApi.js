/**
 * Admin API Service (Mock Version)
 * This file simulates interaction with a real backend for Admin-level operations.
 * It uses localStorage to persist data during the session.
 */

const REMARKS_KEY = 'remarks_mock_data';
const ZONES_KEY = 'zones_mock_data';

const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Helper for generating unique IDs
function generateZoneId() {
  return "zone_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

// --- INITIAL MOCK DATA ---
const INITIAL_ZONES = [
  { 
    id: 'z1', nom: 'Gueliz', couleur: '#3b82f6', ville: 'Marrakech', created_at: '2024-01-10T10:00:00Z',
    coordonnees: [[31.6295, -8.0083], [31.6312, -8.0075], [31.6321, -8.0054]],
    centre: { lat: 31.6309, lng: -8.0071 }
  },
  { 
    id: 'z2', nom: 'Medina', couleur: '#ef4444', ville: 'Marrakech', created_at: '2024-01-11T11:00:00Z',
    coordonnees: [[31.6258, -7.9891], [31.6245, -7.9875], [31.6212, -7.9812]],
    centre: { lat: 31.6238, lng: -7.9859 }
  },
  { 
    id: 'z3', nom: 'Hivernage', couleur: '#10b981', ville: 'Marrakech', created_at: '2024-01-12T12:00:00Z',
    coordonnees: [[31.6189, -8.0125], [31.6154, -8.0189], [31.6165, -8.0143]],
    centre: { lat: 31.6169, lng: -8.0152 }
  },
  { 
    id: 'z4', nom: 'Semlalia', couleur: '#f59e0b', ville: 'Marrakech', created_at: '2024-01-13T13:00:00Z',
    coordonnees: [[31.6421, -8.0112], [31.6398, -8.0154]],
    centre: { lat: 31.6410, lng: -8.0133 }
  },
  { 
    id: 'z5', nom: 'Palmeraie', couleur: '#8b5cf6', ville: 'Marrakech', created_at: '2024-01-14T14:00:00Z',
    coordonnees: [[31.6685, -7.9712], [31.6712, -7.9654]],
    centre: { lat: 31.6699, lng: -7.9683 }
  },
  { 
    id: 'z6', nom: 'Agdal', couleur: '#ec4899', ville: 'Marrakech', created_at: '2024-01-15T15:00:00Z',
    coordonnees: [[31.6012, -7.9921], [31.5987, -7.9945]],
    centre: { lat: 31.6000, lng: -7.9933 }
  },
];

const INITIAL_REMARKS = [
  {
    id: 'rem_1', zone_id: 'z1', zone_nom: 'Gueliz', user_name: 'Ahmed Alaoui', user_email: 'ahmed@example.com',
    category: 'route', statut: 'urgent', urgency: 5, profile: 'resident', residence_duration: '5-10 ans',
    problems: ['Nid de poule', 'Éclairage'], opinion: 'La route est impraticable la nuit près de la place 16 novembre.',
    commentaire_admin: 'Priorité pour le budget voirie Q2.', photo: null, latitude: 31.6295, longitude: -8.0083,
    created_at: '2024-04-15T09:00:00Z'
  },
  {
    id: 'rem_2', zone_id: 'z2', zone_nom: 'Medina', user_name: 'Fatima Zahra', user_email: 'fatima@example.com',
    category: 'ecole', statut: 'actif', urgency: 4, profile: 'visitor', residence_duration: 'plus de 10 ans',
    problems: ['Signalisation'], opinion: 'Besoin d\'un passage piéton sécurisé devant l\'école primaire.',
    commentaire_admin: '', photo: null, latitude: 31.6258, longitude: -7.9891,
    created_at: '2024-04-16T10:30:00Z'
  },
  {
    id: 'rem_3', zone_id: 'z3', zone_nom: 'Hivernage', user_name: 'Karim Tazi', user_email: 'karim@example.com',
    category: 'parc', statut: 'planifie', urgency: 2, profile: 'worker', residence_duration: 'moins de 2 ans',
    problems: ['Entretien'], opinion: 'Les bancs du parc sont cassés.',
    commentaire_admin: 'Planifié pour rénovation en juin.', photo: null, latitude: 31.6189, longitude: -8.0125,
    created_at: '2024-04-17T14:20:00Z'
  },
  {
    id: 'rem_4', zone_id: 'z4', zone_nom: 'Semlalia', user_name: 'Sami Bennani', user_email: 'sami@example.com',
    category: 'hopital', statut: 'urgent', urgency: 5, profile: 'resident', residence_duration: '2-5 ans',
    problems: ['Accès'], opinion: 'L\'accès aux urgences est bloqué par des travaux mal signalés.',
    commentaire_admin: 'Action immédiate requise.', photo: null, latitude: 31.6421, longitude: -8.0112,
    created_at: '2024-04-18T08:15:00Z'
  },
  {
    id: 'rem_5', zone_id: 'z5', zone_nom: 'Palmeraie', user_name: 'Leila Amrani', user_email: 'leila@example.com',
    category: 'autre', statut: 'rejete', urgency: 1, profile: 'visitor', residence_duration: 'moins de 2 ans',
    problems: ['Nuisances'], opinion: 'Trop de bruit le soir.',
    commentaire_admin: 'Hors champ de compétence urbanisme.', photo: null, latitude: 31.6685, longitude: -7.9712,
    created_at: '2024-04-19T20:45:00Z'
  },
  {
    id: 'rem_6', zone_id: 'z1', zone_nom: 'Gueliz', user_name: 'Youssef Radi', user_email: 'youssef@example.com',
    category: 'route', statut: 'actif', urgency: 3, profile: 'student', residence_duration: '2-5 ans',
    problems: ['Stationnement'], opinion: 'Manque de places pour les vélos.',
    commentaire_admin: '', photo: null, latitude: 31.6312, longitude: -8.0075,
    created_at: '2024-04-20T11:00:00Z'
  },
  {
    id: 'rem_7', zone_id: 'z2', zone_nom: 'Medina', user_name: 'Meryem Kabbaj', user_email: 'meryem@example.com',
    category: 'parc', statut: 'urgent', urgency: 5, profile: 'resident', residence_duration: 'plus de 10 ans',
    problems: ['Déchets'], opinion: 'Dépôts sauvages d\'ordures derrière la place Jemaa el-Fna.',
    commentaire_admin: 'Service nettoyage alerté.', photo: null, latitude: 31.6245, longitude: -7.9875,
    created_at: '2024-04-21T07:30:00Z'
  },
  {
    id: 'rem_8', zone_id: 'z6', zone_nom: 'Agdal', user_name: 'Omar Mansouri', user_email: 'omar@example.com',
    category: 'route', statut: 'planifie', urgency: 3, profile: 'worker', residence_duration: '5-10 ans',
    problems: ['Vitesse'], opinion: 'Besoin de ralentisseurs sur l\'avenue Mohammed VI.',
    commentaire_admin: 'Étude de trafic en cours.', photo: null, latitude: 31.6012, longitude: -7.9921,
    created_at: '2024-04-22T16:10:00Z'
  },
  {
    id: 'rem_9', zone_id: 'z3', zone_nom: 'Hivernage', user_name: 'Sofia El Fassi', user_email: 'sofia@example.com',
    category: 'ecole', statut: 'actif', urgency: 4, profile: 'resident', residence_duration: '2-5 ans',
    problems: ['Trottoirs'], opinion: 'Les trottoirs sont trop étroits pour les poussettes.',
    commentaire_admin: '', photo: null, latitude: 31.6154, longitude: -8.0189,
    created_at: '2024-04-23T09:40:00Z'
  },
  {
    id: 'rem_10', zone_id: 'z4', zone_nom: 'Semlalia', user_name: 'Driss Saidi', user_email: 'driss@example.com',
    category: 'hopital', statut: 'rejete', urgency: 2, profile: 'student', residence_duration: 'moins de 2 ans',
    problems: ['Wifi'], opinion: 'Pas de connexion internet dans la zone.',
    commentaire_admin: 'Plainte non urbanistique.', photo: null, latitude: 31.6398, longitude: -8.0154,
    created_at: '2024-04-24T13:20:00Z'
  },
  {
    id: 'rem_11', zone_id: 'z5', zone_nom: 'Palmeraie', user_name: 'Hind Belkhayat', user_email: 'hind@example.com',
    category: 'parc', statut: 'urgent', urgency: 4, profile: 'visitor', residence_duration: 'moins de 2 ans',
    problems: ['Sécurité'], opinion: 'Manque de surveillance dans les jardins publics.',
    commentaire_admin: 'Coordination avec police municipale.', photo: null, latitude: 31.6712, longitude: -7.9654,
    created_at: '2024-04-24T22:15:00Z'
  },
  {
    id: 'rem_12', zone_id: 'z1', zone_nom: 'Gueliz', user_name: 'Mehdi Bennani', user_email: 'mehdi@example.com',
    category: 'route', statut: 'planifie', urgency: 3, profile: 'resident', residence_duration: 'plus de 10 ans',
    problems: ['Éclairage'], opinion: 'Remplacement des lampes par des LED souhaité.',
    commentaire_admin: 'Budget 2025.', photo: null, latitude: 31.6321, longitude: -8.0054,
    created_at: '2024-04-25T11:45:00Z'
  },
  {
    id: 'rem_13', zone_id: 'z2', zone_nom: 'Medina', user_name: 'Salma Tazi', user_email: 'salma@example.com',
    category: 'autre', statut: 'actif', urgency: 5, profile: 'worker', residence_duration: '5-10 ans',
    problems: ['Toitures'], opinion: 'Risque d\'effondrement d\'un mur ancien.',
    commentaire_admin: 'Expertise technique envoyée.', photo: null, latitude: 31.6212, longitude: -7.9812,
    created_at: '2024-04-25T15:30:00Z'
  },
  {
    id: 'rem_14', zone_id: 'z3', zone_nom: 'Hivernage', user_name: 'Anas Lahlou', user_email: 'anas@example.com',
    category: 'parc', statut: 'urgent', urgency: 5, profile: 'resident', residence_duration: '2-5 ans',
    problems: ['Arrosage'], opinion: 'Fuite d\'eau massive sur le système d\'arrosage.',
    commentaire_admin: 'Réparé le jour même.', photo: null, latitude: 31.6165, longitude: -8.0143,
    created_at: '2024-04-26T08:50:00Z'
  },
  {
    id: 'rem_15', zone_id: 'z6', zone_nom: 'Agdal', user_name: 'Khadija Amine', user_email: 'khadija@example.com',
    category: 'ecole', statut: 'planifie', urgency: 3, profile: 'resident', residence_duration: 'plus de 10 ans',
    problems: ['Accessibilité'], opinion: 'Besoin d\'une rampe PMR.',
    commentaire_admin: 'Inscrit au plan d\'accessibilité.', photo: null, latitude: 31.5987, longitude: -7.9945,
    created_at: '2024-04-26T12:00:00Z'
  }
];

// --- STORAGE HELPERS ---
const getStoredData = (key, initial) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const saveStoredData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- SERVICE FUNCTIONS ---

/**
 * Calculate the center point of a polygon by averaging coordinates
 */
const calculateZoneCenter = (coordonnees) => {
  if (!coordonnees || coordonnees.length === 0) return null;
  const sum = coordonnees.reduce((acc, curr) => {
    return { lat: acc.lat + curr[0], lng: acc.lng + curr[1] };
  }, { lat: 0, lng: 0 });
  return { 
    lat: sum.lat / coordonnees.length, 
    lng: sum.lng / coordonnees.length 
  };
};

/**
 * Fetch all remarks with optional filters
 */
const getRemarks = async (filters = {}) => {
  await delay(600); // Simulate network latency
  let remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);

  if (filters.zone_id) {
    remarks = remarks.filter(r => r.zone_id === filters.zone_id);
  }
  if (filters.category) {
    remarks = remarks.filter(r => r.category === filters.category);
  }
  if (filters.statut) {
    remarks = remarks.filter(r => r.statut === filters.statut);
  }
  if (filters.dateStart) {
    remarks = remarks.filter(r => new Date(r.created_at) >= new Date(filters.dateStart));
  }
  if (filters.dateEnd) {
    remarks = remarks.filter(r => new Date(r.created_at) <= new Date(filters.dateEnd));
  }

  return remarks;
};

/**
 * Update the status and internal comment of a specific remark
 */
const updateRemarkStatus = async (remarqueId, newStatut, commentaireAdmin = '') => {
  await delay(800);
  let remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  let updatedRemarque = null;

  remarks = remarks.map(r => {
    if (r.id === remarqueId) {
      updatedRemarque = { 
        ...r, 
        statut: newStatut, 
        commentaire_admin: commentaireAdmin,
        updated_at: new Date().toISOString() 
      };
      return updatedRemarque;
    }
    return r;
  });

  if (!updatedRemarque) throw new Error('Remarque non trouvée');

  saveStoredData(REMARKS_KEY, remarks);
  return { success: true, data: updatedRemarque };
};

/**
 * Fetch all available urban zones
 */
const getZones = async () => {
  await delay(400);
  return getStoredData(ZONES_KEY, INITIAL_ZONES);
};

/**
 * Fetch remarks filtered by a specific zone ID
 */
const getRemarquesByZone = async (zoneId) => {
  await delay(500);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  return remarks.filter(r => r.zone_id === zoneId);
};

/**
 * Create a new official urban zone
 */
const createZone = async (zoneData) => {
  await delay(800);
  const { nom, couleur, coordonnees } = zoneData;

  if (!nom) throw new Error('Le nom de la zone est requis.');
  if (!coordonnees || coordonnees.length === 0) throw new Error('Les coordonnées de la zone sont requises.');

  const zones = getStoredData(ZONES_KEY, INITIAL_ZONES);
  const newZone = {
    id: generateZoneId(),
    nom,
    couleur,
    coordonnees,
    centre: calculateZoneCenter(coordonnees),
    ville: 'Marrakech',
    created_at: new Date().toISOString()
  };

  zones.push(newZone);
  saveStoredData(ZONES_KEY, zones);

  return { success: true, data: newZone };
};

/**
 * Update an existing zone's basic info
 */
const updateZone = async (zoneId, zoneData) => {
  await delay(600);
  let zones = getStoredData(ZONES_KEY, INITIAL_ZONES);
  let updatedZone = null;

  zones = zones.map(z => {
    if (z.id === zoneId) {
      updatedZone = { 
        ...z, 
        ...zoneData,
        updated_at: new Date().toISOString()
      };
      return updatedZone;
    }
    return z;
  });

  if (!updatedZone) throw new Error('Zone non trouvée');

  saveStoredData(ZONES_KEY, zones);
  return { success: true, data: updatedZone };
};

/**
 * Delete a zone and its associated remarks
 */
const deleteZone = async (zoneId) => {
  await delay(1000);
  
  // 1. Delete the zone
  let zones = getStoredData(ZONES_KEY, INITIAL_ZONES);
  const initialLength = zones.length;
  zones = zones.filter(z => z.id !== zoneId);
  
  if (zones.length === initialLength) throw new Error('Zone non trouvée');
  saveStoredData(ZONES_KEY, zones);

  // 2. Delete all associated remarks (prevention of orphaned remarks)
  let remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  remarks = remarks.filter(r => r.zone_id !== zoneId);
  saveStoredData(REMARKS_KEY, remarks);

  return { success: true, message: "Zone deleted" };
};

/**
 * Statistics Functions
 */

const getStatsByZone = async () => {
  await delay(700);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  const zones = getStoredData(ZONES_KEY, INITIAL_ZONES);
  
  return zones.map(z => {
    const zoneRemarks = remarks.filter(r => r.zone_id === z.id);
    return {
      zone: z.nom,
      total: zoneRemarks.length,
      urgent: zoneRemarks.filter(r => r.statut === 'urgent').length,
      actif: zoneRemarks.filter(r => r.statut === 'actif').length,
      planifie: zoneRemarks.filter(r => r.statut === 'planifie').length,
      rejete: zoneRemarks.filter(r => r.statut === 'rejete').length,
    };
  });
};

const getStatsByCategory = async () => {
  await delay(600);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  const categories = [
    { name: "Hôpital", key: "hopital", color: "#FF6384" },
    { name: "École", key: "ecole", color: "#36A2EB" },
    { name: "Parc", key: "parc", color: "#4BC0C0" },
    { name: "Route", key: "route", color: "#FFCE56" },
    { name: "Autre", key: "autre", color: "#9966FF" }
  ];

  return categories.map(cat => ({
    name: cat.name,
    value: remarks.filter(r => r.category === cat.key).length,
    color: cat.color
  }));
};

const getStatsByUrgency = async () => {
  await delay(500);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  const urgencyLevels = [1, 2, 3, 4, 5];

  return urgencyLevels.map(level => ({
    urgency: `Niveau ${level}`,
    count: remarks.filter(r => r.urgency === level).length
  }));
};

const getActivityOverTime = async (period) => {
  await delay(800);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  
  if (period === "week") {
    const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    return days.map((day, idx) => {
      const count = remarks.filter(r => {
        const date = new Date(r.created_at);
        const dayIdx = (date.getDay() + 6) % 7; // Monday = 0
        return dayIdx === idx;
      }).length;
      return { label: day, count: count };
    });
  } else {
    const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
    return weeks.map((week, idx) => {
      const count = remarks.filter(r => {
        const date = new Date(r.created_at);
        const dayOfMonth = date.getDate();
        const weekIdx = Math.floor((dayOfMonth - 1) / 7);
        return weekIdx === idx;
      }).length;
      return { label: week, count: count };
    });
  }
};

const getTop5Zones = async () => {
  await delay(700);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);
  const zones = getStoredData(ZONES_KEY, INITIAL_ZONES);

  const zoneStats = zones.map(z => {
    const zoneRemarks = remarks.filter(r => r.zone_id === z.id);
    const categories = zoneRemarks.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});
    
    let dominantCategory = "N/A";
    let max = 0;
    for (const [cat, count] of Object.entries(categories)) {
      if (count > max) {
        max = count;
        dominantCategory = cat;
      }
    }

    const avgUrgency = zoneRemarks.length > 0 
      ? (zoneRemarks.reduce((acc, r) => acc + r.urgency, 0) / zoneRemarks.length).toFixed(1)
      : 0;

    return {
      zone: z.nom,
      total: zoneRemarks.length,
      dominantCategory: dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1),
      avgUrgency: parseFloat(avgUrgency)
    };
  });

  return zoneStats
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((z, idx) => ({ rank: idx + 1, ...z }));
};

const getKeyIndicators = async () => {
  await delay(500);
  const remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);

  const totalRemarks = remarks.length;
  const urgentCount = remarks.filter(r => r.statut === 'urgent').length;
  const pendingCount = remarks.filter(r => r.statut === 'pending').length;
  const avgUrgency = totalRemarks > 0 
    ? (remarks.reduce((acc, r) => acc + r.urgency, 0) / totalRemarks).toFixed(1)
    : 0;

  // Find top zone
  const zoneCounts = remarks.reduce((acc, r) => {
    acc[r.zone_nom] = (acc[r.zone_nom] || 0) + 1;
    return acc;
  }, {});
  let topZone = "N/A";
  let maxZone = 0;
  for (const [name, count] of Object.entries(zoneCounts)) {
    if (count > maxZone) {
      maxZone = count;
      topZone = name;
    }
  }

  // Find top category
  const catCounts = remarks.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {});
  let topCategory = "N/A";
  let maxCat = 0;
  for (const [cat, count] of Object.entries(catCounts)) {
    if (count > maxCat) {
      maxCat = count;
      topCategory = cat;
    }
  }

  return {
    totalRemarks,
    urgentCount,
    avgUrgency: parseFloat(avgUrgency),
    topZone,
    topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1),
    pendingCount
  };
};

/**
 * Export CSV Functions
 */

const getFilteredRemarksForExport = async (filters = {}) => {
  await delay(600);
  let remarks = getStoredData(REMARKS_KEY, INITIAL_REMARKS);

  if (filters.zone_id) {
    remarks = remarks.filter(r => r.zone_id === filters.zone_id);
  }
  if (filters.category) {
    remarks = remarks.filter(r => r.category === filters.category);
  }
  if (filters.dateStart) {
    remarks = remarks.filter(r => new Date(r.created_at) >= new Date(filters.dateStart));
  }
  if (filters.dateEnd) {
    remarks = remarks.filter(r => new Date(r.created_at) <= new Date(filters.dateEnd));
  }

  return remarks;
};

const generateCSV = (remarks) => {
  const BOM = '\uFEFF';
  const headers = [
    'ID', 'Zone', 'Catégorie', 'Statut', 'Urgence', 'Nom Citoyen', 'Email',
    'Profil', 'Durée Résidence', 'Problèmes Signalés', 'Opinion',
    'Commentaire Admin', 'Date Soumission'
  ];

  const catMap = {
    'hopital': 'Hôpital',
    'ecole': 'École',
    'parc': 'Parc',
    'route': 'Route',
    'autre': 'Autre'
  };

  const statusMap = {
    'urgent': 'Urgent',
    'actif': 'Actif',
    'planifie': 'Planifié',
    'rejete': 'Rejeté',
    'en_attente': 'En attente',
    'validee': 'Validée'
  };

  const profileMap = {
    'resident': 'Résident',
    'visitor': 'Visiteur',
    'worker': 'Travailleur',
    'student': 'Étudiant'
  };

  const rows = remarks.map(r => {
    const formatField = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/\n/g, ' ');
      if (str.includes(';')) return `"${str}"`;
      return str;
    };

    const date = new Date(r.created_at);
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

    return [
      formatField(r.id),
      formatField(r.zone_nom),
      formatField(catMap[r.category] || r.category),
      formatField(statusMap[r.statut] || r.statut),
      formatField(r.urgency),
      formatField(r.user_name),
      formatField(r.user_email),
      formatField(profileMap[r.profile] || r.profile),
      formatField(r.residence_duration),
      formatField((r.problems || []).join(' | ')),
      formatField(r.opinion || 'Aucune opinion'),
      formatField(r.commentaire_admin || 'Aucun commentaire'),
      formatField(formattedDate)
    ].join(';');
  });

  return BOM + [headers.join(';'), ...rows].join('\n');
};

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { 
  getRemarks, 
  updateRemarkStatus, 
  getZones, 
  getRemarquesByZone,
  createZone,
  updateZone,
  deleteZone,
  calculateZoneCenter,
  getStatsByZone,
  getStatsByCategory,
  getStatsByUrgency,
  getActivityOverTime,
  getTop5Zones,
  getKeyIndicators,
  getFilteredRemarksForExport,
  generateCSV,
  downloadCSV
};
