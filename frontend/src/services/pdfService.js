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
 * Generates and automatically downloads a PDF receipt for a submitted remark.
 */
export function generateRemarkPDF(remarque) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Title & subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(193, 68, 14); // RGB(193, 68, 14)
  doc.text('UrbanMap Maroc', 20, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);
  doc.text('Récépissé de signalement', 20, 28);
  
  // Separation line
  doc.setDrawColor(193, 68, 14);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);
  
  // Format dates
  const dateStr = remarque.created_at 
    ? new Date(remarque.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('fr-FR');
    
  // Table with data
  const tableData = [
    ['Numéro de référence', `#${remarque.id || 'N/A'}`],
    ['Date', dateStr],
    ['Zone', remarque.zone_nom || (remarque.zone?.nom) || 'Non spécifiée'],
    ['Catégorie', CAT_LABELS[remarque.categorie] || remarque.categorie || 'Autre'],
    ['Urgence', `${remarque.urgency || 3}/5`],
    ['Statut', 'En attente de traitement'],
    ['Coordonnées', remarque.latitude && remarque.longitude ? `${parseFloat(remarque.latitude).toFixed(5)}, ${parseFloat(remarque.longitude).toFixed(5)}` : 'Non disponibles'],
    ['Durée du problème', remarque.duration === 'recent' ? 'Récemment' : remarque.duration === 'months' ? 'Quelques mois' : remarque.duration === 'years' ? 'Depuis des années' : 'Non précisée'],
    ['Profil', remarque.profile || 'Non précisé']
  ];
  
  autoTable(doc, {
    body: tableData,
    startY: 38,
    margin: { left: 20, right: 20 },
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 4, fontStyle: 'normal', textColor: [55, 65, 81] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: [193, 68, 14] },
      1: { cellWidth: 120 }
    }
  });
  
  let finalY = doc.lastAutoTable.finalY || 80;
  
  // Description section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(193, 68, 14);
  doc.text('Description', 20, finalY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  const opinionText = remarque.opinion || 'Aucune description fournie.';
  const splitText = doc.splitTextToSize(opinionText, 170);
  doc.text(splitText, 20, finalY + 18);
  
  // Footer on the bottom of page
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  const footerText = "Ce document est un récépissé officiel de votre signalement sur UrbanMap Maroc. Conservez-le pour vos démarches.";
  const splitFooter = doc.splitTextToSize(footerText, 170);
  doc.text(splitFooter, 20, 275);
  
  // Save PDF
  const remarkId = remarque.id || 'new';
  const fileDate = remarque.created_at ? remarque.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
  doc.save(`UrbanMap_Signalement_${remarkId}_${fileDate}.pdf`);
}

