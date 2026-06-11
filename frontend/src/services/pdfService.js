import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as urbanApi from './urbanApi';

const CAT_LABELS = {
  route: 'Route',
  eclairage: 'Éclairage',
  dechets: 'Déchets',
  parc: 'Parc',
  ecole: 'École',
  autre: 'Autre'
};

const STATUT_LABELS = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  resolu: 'Résolu',
  rejete: 'Rejeté'
};

const PROFILE_LABELS = {
  resident: 'Résident',
  visitor: 'Visiteur',
  worker: 'Travailleur',
  student: 'Étudiant'
};

/**
 * Generates a comprehensive urban planning report for a specific zone.
 */
export async function generateZoneReport(zone, urbanisteName) {
  try {
    // 1. FETCH DATA (in parallel using Promise.all)
    const [remarks, stats, annotations, summaryResult] = await Promise.all([
      urbanApi.getValidatedRemarks(zone.id),
      urbanApi.getUrbanStatsByZone(zone.id),
      urbanApi.getAnnotations(zone.id),
      urbanApi.getZoneSummary(zone.id)
    ]);

    const zoneSummary = summaryResult?.data;

    // 2. CREATE PDF using jsPDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 20;

    // 3. SECTION 1 — Cover Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('RAPPORT URBANISTIQUE', 20, 18);
    
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(`${zone.nom} — Marrakech`, 20, 27);
    
    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Généré le : ${dateStr}`, 150, 18);
    doc.text(`Par : ${urbanisteName}`, 150, 24);
    
    y = 55;

    // 4. SECTION 2 — KPI Cards
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('INDICATEURS CLÉS', 20, y);
    y += 8;

    const kpis = [
      { label: 'Total Remarques', value: stats.totalRemarks },
      { label: 'Cas Urgents', value: stats.urgentCount },
      { label: 'Urgence Moyenne', value: `${stats.avgUrgency}/5` },
      { label: 'Catégorie Dom.', value: stats.dominantCategory }
    ];

    kpis.forEach((kpi, i) => {
      const x = 20 + (i * 42);
      // Box
      doc.setFillColor(243, 244, 246);
      doc.rect(x, y, 38, 20, 'F');
      
      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14); // Size adjusted to fit common box widths better
      doc.setTextColor(17, 24, 39);
      doc.text(String(kpi.value), x + 19, y + 9, { align: 'center' });
      
      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(kpi.label, x + 19, y + 15, { align: 'center' });
    });
    
    y += 30;

    // 5. SECTION 3 — Category Distribution table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('RÉPARTITION PAR CATÉGORIE', 20, y);
    y += 6;

    autoTable(doc, {
      head: [['Catégorie', 'Nombre de remarques', '% du total']],
      body: stats.byCategory.map(c => [
        c.name,
        c.value,
        stats.totalRemarks > 0 ? ((c.value / stats.totalRemarks) * 100).toFixed(1) + '%' : '0%'
      ]),
      startY: y,
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 10 }
    });

    y = doc.lastAutoTable.finalY + 12;

    // 6. SECTION 4 — Opinions & AI Summary
    if (doc.internal.pageSize.getHeight() - y < 60) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('OPINIONS CITOYENNES', 20, y);
    y += 8;

    if (zoneSummary?.summary_text) {
      const summaryLines = doc.splitTextToSize(zoneSummary.summary_text, 155);
      const boxHeight = (summaryLines.length * 5) + 12;
      
      doc.setFillColor(238, 242, 255);
      doc.rect(20, y, 170, boxHeight, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text('Synthèse IA :', 25, y + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(31, 41, 55);
      doc.text(summaryLines, 25, y + 12);
      
      y += boxHeight + 8;
    }

    const opinionsData = remarks.filter(r => r.opinion);
    if (opinionsData.length > 0) {
      autoTable(doc, {
        head: [['Zone', 'Catégorie', 'Opinion', 'Urgence']],
        body: opinionsData.slice(0, 10).map(r => [
          r.zone_nom,
          CAT_LABELS[r.categorie] || r.categorie,
          r.opinion?.substring(0, 80) + (r.opinion?.length > 80 ? '...' : ''),
          r.urgency + '/5'
        ]),
        startY: y,
        margin: { left: 20, right: 20 },
        columnStyles: { 2: { cellWidth: 80 } },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { fontSize: 9 }
      });
      y = doc.lastAutoTable.finalY + 12;
    }

    // 7. SECTION 5 — Private Annotations
    if (annotations && annotations.length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81);
      doc.text('ANNOTATIONS PRIVÉES', 20, y);
      y += 8;

      annotations.slice(0, 5).forEach(ann => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(255, 251, 235);
        doc.rect(20, y, 170, 18, 'F');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(55, 65, 81);
        doc.text(ann.texte.substring(0, 120), 25, y + 7);
        
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        const annDate = new Date(ann.updated_at || ann.created_at).toLocaleDateString('fr-FR');
        doc.text(`Le ${annDate}`, 25, y + 14);
        
        y += 22;
      });
      y += 8;
    }

    // 8. SECTION 6 — Full Remarks Table
    doc.addPage();
    y = 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text('TABLEAU DÉTAILLÉ DES REMARQUES', 20, y);
    y += 8;

    autoTable(doc, {
      head: [['#', 'Zone', 'Catégorie', 'Statut', 'Urgence', 'Profil', 'Date']],
      body: remarks.map((r, i) => [
        i + 1,
        r.zone_nom,
        CAT_LABELS[r.categorie] || r.categorie,
        STATUT_LABELS[r.statut] || r.statut,
        r.urgency + '/5',
        PROFILE_LABELS[r.profile] || r.profile,
        new Date(r.created_at).toLocaleDateString('fr-FR')
      ]),
      startY: y,
      margin: { left: 20, right: 20 },
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { fontSize: 9 }
    });

    // 9. FOOTER on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('UrbanMap Maroc — Rapport confidentiel', 20, 290);
      doc.text(`Page ${i} / ${pageCount}`, 190, 290, { align: 'right' });
    }

    // 10. SAVE
    const filename = `Rapport_${zone.nom}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    return { success: true, filename };
  } catch (err) {
    console.error('PDF Generation Error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reverse geocode coordinates to an address using Nominatim.
 */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`,
      { headers: { 'User-Agent': 'UrbanMap/1.0' } }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

/**
 * Draws the UrbanMap logo using basic shapes (map pin icon).
 */
function drawLogo(doc, x, y, size) {
  const r = size * 0.4
  const pinX = x + r
  const pinY = y + r
  const tipY = y + size * 0.9
  
  doc.setFillColor(193, 68, 14)
  doc.circle(pinX, pinY + 1, r, 'F')
  doc.setDrawColor(193, 68, 14)
  doc.setLineWidth(0.8)
  doc.line(pinX, pinY + r + 1, pinX, tipY)
}

const DURATION_LABELS = {
  days: "Vient d'apparaître",
  months: 'Quelques mois',
  year: 'Plus d\'un an',
  always: 'Aussi longtemps que je m\'en souvienne',
}

/**
 * Generates and automatically downloads a PDF receipt for a submitted remark.
 */
export async function generateRemarkPDF(remarque) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── HEADER BANNER ──────────────────────────────────────────
  doc.setFillColor(193, 68, 14)
  doc.rect(0, 0, 210, 38, 'F')

  drawLogo(doc, 16, 9, 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('UrbanMap Maroc', 34, 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(255, 220, 200)
  doc.text('Récépissé officiel de signalement', 34, 25)

  doc.setFontSize(9)
  doc.setTextColor(255, 200, 180)
  const dateStr = remarque.created_at
    ? new Date(remarque.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('fr-FR')
  doc.text(`Émis le ${dateStr}`, 34, 31)

  // ── REFERENCE BAR ─────────────────────────────────────────
  doc.setFillColor(245, 235, 230)
  doc.rect(20, 46, 170, 10, 'F')
  doc.setFont('courier', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(193, 68, 14)
  const ref = `RÉF : #URB-${String(remarque.id || 'N/A').padStart(6, '0')}`
  doc.text(ref, 105, 53, { align: 'center' })

  // ── ADDRESS (reverse geocoded) ────────────────────────────
  let address = 'Recherche en cours...'
  if (remarque.latitude && remarque.longitude) {
    address = await reverseGeocode(remarque.latitude, remarque.longitude)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const addrLines = doc.splitTextToSize(address, 160)
  doc.text(addrLines, 20, 67)

  // ── DATA TABLE ────────────────────────────────────────────
  const yAfterAddr = 65 + (addrLines.length * 4)

  const tableData = [
    ['Catégorie', remarque.categorie ? (CAT_LABELS[remarque.categorie] || remarque.categorie) : 'Autre'],
    ['Urgence', `${remarque.urgency || 3} / 5`],
    ['Durée du problème', DURATION_LABELS[remarque.duration] || remarque.duration || 'Non précisée'],
    ['Profil', remarque.profile ? (PROFILE_LABELS[remarque.profile] || remarque.profile) : 'Non précisé'],
    ['Statut', STATUT_LABELS[remarque.statut] || remarque.statut || 'En cours'],
    ['Zone', remarque.zone_nom || (remarque.zone?.nom) || 'Non assignée'],
    ['Coordonnées', remarque.latitude && remarque.longitude
      ? `${parseFloat(remarque.latitude).toFixed(5)}, ${parseFloat(remarque.longitude).toFixed(5)}`
      : 'Non disponibles'],
  ]

  autoTable(doc, {
    body: tableData,
    startY: yAfterAddr + 4,
    margin: { left: 20, right: 20 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3.5, fontStyle: 'normal', textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: [193, 68, 14] },
      1: { cellWidth: 125 },
    },
    alternateRowStyles: { fillColor: [249, 245, 242] },
  })

  let y = doc.lastAutoTable.finalY + 10

  // ── DESCRIPTION ───────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  if (y + 50 > pageH) {
    doc.addPage()
    y = 20
  }

  doc.setFillColor(193, 68, 14, 0.08)
  doc.rect(20, y, 170, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(193, 68, 14)
  doc.text('DESCRIPTION DÉTAILLÉE', 24, y + 4)
  y += 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  const opinionText = remarque.opinion || 'Aucune description fournie.'
  const splitText = doc.splitTextToSize(opinionText, 170)
  doc.text(splitText, 20, y)
  y += splitText.length * 4.5 + 6

  // ── PHOTO INDICATOR ────────────────────────────────────────
  if (remarque.photo_path) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    const photoUrl = remarque.photo_path
    doc.text(`📷 Photo attachée : ${photoUrl}`, 20, y)
    y += 8
  }

  // ── SIGNATURE RECTANGLE ────────────────────────────────────
  if (y + 40 > pageH) {
    doc.addPage()
    y = 20
  }

  y = Math.max(y, pageH - 80)

  doc.setDrawColor(193, 68, 14)
  doc.setLineWidth(0.3)
  doc.rect(120, y, 70, 35)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(193, 68, 14)
  doc.text('SIGNATURE DU CITOYEN', 155, y + 6, { align: 'center' })

  doc.setLineWidth(0.2)
  doc.setDrawColor(180, 180, 180)
  doc.line(125, y + 25, 185, y + 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('Signature', 155, y + 30, { align: 'center' })

  // ── FOOTER ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text('UrbanMap Maroc — Plateforme citoyenne · Document officiel', 20, 290)
    doc.text(`Page ${i} / ${pageCount}`, 190, 290, { align: 'right' })
  }

  // ── SAVE ───────────────────────────────────────────────────
  const remarkId = remarque.id || 'new'
  const fileDate = remarque.created_at
    ? remarque.created_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  doc.save(`UrbanMap_Signalement_${String(remarkId).padStart(6, '0')}_${fileDate}.pdf`)
}

