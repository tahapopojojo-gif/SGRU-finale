import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getRemarks, getZones, updateRemarkStatus } from '../../services/adminApi';
import SkeletonTable from '../SkeletonTable.jsx';
import { useToast } from '../../hooks/useToast.js';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { unwrap } from '../../utils/unwrap';
import { useAuth } from '../../context/AuthContext';

const getStyles = (isMobile) => ({
  wrapper: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { background: '#fff', padding: isMobile ? '16px' : '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' },
  filterGrid: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'end' },
  filterItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  select: { width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#334155', outline: 'none', cursor: 'pointer', minHeight: isMobile ? '48px' : 'auto' },
  input: { width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#334155', outline: 'none', minHeight: isMobile ? '48px' : 'auto' },
  btnDefault: { padding: isMobile ? '14px 20px' : '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: '0.2s', minHeight: isMobile ? '48px' : 'auto' },
  btnPrimary: { padding: isMobile ? '14px 20px' : '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isMobile ? 'center' : 'flex-start', minHeight: isMobile ? '48px' : 'auto' },
  
  tableContainer: { overflowX: 'auto', background: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' },
  th: { padding: '16px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' },
  td: { padding: '16px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  trHover: { cursor: 'pointer', transition: 'background 0.2s' },
  
  badge: { padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', display: 'inline-block' },
  badgeUrgent: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  badgeActif: { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
  badgePlanifie: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  badgeRejete: { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '0' : '20px' },
  modal: { background: '#fff', borderRadius: isMobile ? '24px 24px 0 0' : '24px', width: '100%', maxWidth: '900px', maxHeight: isMobile ? '90vh' : '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { padding: '24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: '800', color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', color: '#64748b', cursor: 'pointer', minWidth: '48px', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: isMobile ? '20px' : '30px', overflowY: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '20px' : '30px' },
  modalFooter: { padding: isMobile ? '16px 24px 24px 24px' : '24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: '12px' },
  
  infoBlock: { marginBottom: isMobile ? '16px' : '24px' },
  infoTitle: { fontSize: '13px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', marginBottom: '16px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  infoLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px' },
  infoValue: { fontSize: '14px', fontWeight: '600', color: '#0f172a', margin: 0 },
  tag: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'inline-block', marginRight: '8px', marginBottom: '8px' },
  opinionBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '14px', fontStyle: 'italic', color: '#475569' },
  
  textarea: { width: '100%', padding: '16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '16px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
});

const getCategoryIcon = (cat) => {
  const icons = { hopital: '🏥', ecole: '🏫', parc: '🌳', route: '🛣️', autre: '❓' };
  return icons[cat?.toLowerCase()] || '❓';
};

const getBadgeStyle = (statut, styles) => {
  switch(statut?.toLowerCase()) {
    case 'urgent': return { ...styles.badge, ...styles.badgeUrgent };
    case 'actif': return { ...styles.badge, ...styles.badgeActif };
    case 'planifie': return { ...styles.badge, ...styles.badgePlanifie };
    default: return { ...styles.badge, ...styles.badgeRejete };
  }
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR');
};

// eslint-disable-next-line no-unused-vars
const RemarqueRowMemo = React.memo(({ remark, onOpenDetail, styles }) => (
  <tr
    style={styles.trHover}
    onClick={() => onOpenDetail(remark)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(remark); } }}
    tabIndex={0}
    role="row"
    aria-label={`Remarque ${remark.zone_nom}, ${remark.category}, statut ${remark.statut}`}
    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
    onFocus={e => e.currentTarget.style.background = '#f8fafc'}
    onBlur={e => e.currentTarget.style.background = 'transparent'}
  >
    <td style={{...styles.td, fontWeight: '600'}}>{remark.zone_nom}</td>
    <td style={styles.td}><span aria-hidden="true">{getCategoryIcon(remark.category)}</span> <span style={{textTransform:'capitalize'}}>{remark.category}</span></td>
    <td style={{...styles.td, color: '#eab308'}} aria-label={`Urgence ${remark.urgency} sur 5`}>{"★".repeat(remark.urgency)}<span style={{color:'#e2e8f0'}} aria-hidden="true">{"★".repeat(5 - remark.urgency)}</span></td>
    <td style={{...styles.td, textTransform:'capitalize'}}>{remark.user?.nom || remark.profile || 'Citoyen anonyme'}</td>
    <td style={styles.td}>{formatDate(remark.created_at)}</td>
    <td style={styles.td}><span style={getBadgeStyle(remark.statut, styles)}>{remark.statut ? remark.statut.replace(/_/g, ' ') : ''}</span></td>
  </tr>
));

// eslint-disable-next-line no-unused-vars
const RemarqueCardMemo = React.memo(({ remark, onOpenDetail, styles }) => (
  <div
    style={{ ...styles.card, marginBottom: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px' }}
    onClick={() => onOpenDetail(remark)}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetail(remark); } }}
    tabIndex={0}
    role="button"
    aria-label={`Remarque ${remark.zone_nom}, ${remark.category}, statut ${remark.statut}`}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontWeight: '700', color: '#1e293b' }}>{remark.zone_nom}</span>
      <span style={getBadgeStyle(remark.statut, styles)}>{remark.statut ? remark.statut.replace(/_/g, ' ') : ''}</span>
    </div>
    <div style={{ fontSize: '14px', color: '#475569', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span aria-hidden="true">{getCategoryIcon(remark.category)}</span>
      <span style={{textTransform:'capitalize'}}>{remark.category}</span>
      <span style={{color: '#eab308'}}>{"★".repeat(remark.urgency)}</span>
    </div>
    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
      <span style={{textTransform:'capitalize'}}>{remark.user?.nom || remark.profile || 'Citoyen anonyme'}</span>
      <span>{formatDate(remark.created_at)}</span>
    </div>
  </div>
));

const RemarkDetailModalMemo = React.memo(({
  selectedRemark, editedStatus, editedComment, isSaving, saveError,
  setEditedStatus, setEditedComment, onClose, onSave, modalRef
}) => {
  const { isMobile } = useResponsive();
  const styles = useMemo(() => getStyles(isMobile), [isMobile]);

  if (!selectedRemark) return null;
  return (
    <div
      style={styles.modalOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={modalRef}
      >
        <div style={styles.modalHeader}>
          <h2 id="modal-title" style={styles.modalTitle}>Détails de la remarque</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Fermer la modale">✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* COL 1: Context */}
          <div>
            <div style={styles.infoBlock}>
              <h3 style={styles.infoTitle}>Contexte & Profil</h3>
              <div style={styles.grid2}>
                <div><p style={styles.infoLabel}>Citoyen</p><p style={styles.infoValue}>{selectedRemark.user?.nom || selectedRemark.profile || 'Citoyen anonyme'}</p></div>
                <div><p style={styles.infoLabel}>Sexe</p><p style={styles.infoValue}>{selectedRemark.gender === 'F' ? 'Femme' : 'Homme'}</p></div>
                <div><p style={styles.infoLabel}>Âge</p><p style={styles.infoValue}>{selectedRemark.age} ans</p></div>
                <div><p style={styles.infoLabel}>Handicap</p><p style={styles.infoValue}>{selectedRemark.handicap || 'Aucun'}</p></div>
                <div><p style={styles.infoLabel}>Zone</p><p style={styles.infoValue}>{selectedRemark.zone_nom}</p></div>
                <div><p style={styles.infoLabel}>Date</p><p style={styles.infoValue}>{formatDate(selectedRemark.created_at)}</p></div>
              </div>
            </div>

            <div style={styles.infoBlock}>
              <h3 style={styles.infoTitle}>Caractérisation</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={styles.tag}>{getCategoryIcon(selectedRemark.category)} {selectedRemark.category}</span>
                <span style={styles.tag} aria-label={`Urgence ${selectedRemark.urgency} sur 5`}>⚠️ Urgence: {selectedRemark.urgency}/5</span>
                <span style={getBadgeStyle(selectedRemark.statut, styles)}>{selectedRemark.statut ? selectedRemark.statut.replace(/_/g, ' ') : ''}</span>
              </div>
            </div>
            
            <div style={styles.infoBlock}>
              <h3 style={styles.infoTitle}>Avis & Analyse IA</h3>
              <p style={styles.opinionBox}>{selectedRemark.opinion}</p>
            </div>
          </div>

          {/* COL 2: Actions */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={styles.infoBlock}>
              <h3 style={styles.infoTitle}>Traitement Administratif</h3>
              
              <label htmlFor="remark-status" style={{...styles.infoLabel, display: 'block', marginTop: '16px', fontWeight: 'bold'}}>Changer le statut</label>
              <select 
                id="remark-status"
                style={{...styles.select, marginTop: '8px'}}
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value)}
              >
                <option value="urgent">Urgent</option>
                <option value="actif">Actif</option>
                <option value="planifie">Planifié</option>
                <option value="rejete">Rejeté</option>
              </select>

              <label htmlFor="remark-comment" style={{...styles.infoLabel, display: 'block', marginTop: '24px', fontWeight: 'bold'}}>Commentaire interne (visible urbanistes)</label>
              <textarea 
                id="remark-comment"
                style={{...styles.textarea, marginTop: '8px', height: '140px'}}
                placeholder="Ex: Pris en compte pour le budget 2025..."
                value={editedComment}
                onChange={(e) => setEditedComment(e.target.value)}
              />
              
              {saveError && <p style={{color: '#dc2626', fontSize: '13px', marginTop: '12px', background: '#fef2f2', padding: '12px', borderRadius: '8px'}} role="alert">{saveError}</p>}
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.btnDefault} onClick={onClose}>Annuler</button>
          <button 
            style={styles.btnPrimary} 
            onClick={onSave}
            disabled={isSaving}
            aria-busy={isSaving}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
});

const AdminRemarquesTab = () => {
  const [remarks, setRemarks] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRemark, setSelectedRemark] = useState(null);
  const [editedStatus, setEditedStatus] = useState('');
  const [editedComment, setEditedComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { toast } = useToast();
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { user } = useAuth();
  const userCity = user?.city || null;

  const { isMobile } = useResponsive();
  const styles = useMemo(() => getStyles(isMobile), [isMobile]);

  const [filters, setFilters] = useState({
    zone_id: '', category: '', statut: '', dateStart: '', dateEnd: '',
  });

  const fetchZones = useCallback(async () => {
    try {
      const response = await getZones();
      const zonesArray = unwrap(response);
      // Only show zones belonging to admin's city in the zone filter dropdown
      const cityZones = userCity
        ? zonesArray.filter(z =>
            z.ville?.toLowerCase().trim() === userCity.toLowerCase().trim()
          )
        : zonesArray;
      setZones(cityZones);
    } catch (err) {
      console.error('Error fetching zones:', err);
    }
  }, [userCity]);

  const fetchRemarks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getRemarks(filters);
      const data = unwrap(response);
      // Filter remarks to admin's city (via zone membership)
      const cityZoneIds = zones.map(z => z.id);
      const cityRemarks = userCity && cityZoneIds.length > 0
        ? data.filter(r => cityZoneIds.includes(r.zone_id))
        : data;
      setRemarks(cityRemarks);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les remarques.');
    } finally {
      setLoading(false);
    }
  }, [filters, zones, userCity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchZones();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchZones]);

  useEffect(() => {
    const handler = setTimeout(() => { fetchRemarks(); }, 300);
    return () => clearTimeout(handler);
  }, [fetchRemarks]);

  // Focus trap for modal
  useEffect(() => {
    if (!selectedRemark || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedRemark(null);
        previousFocusRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => modal.removeEventListener('keydown', handleKeyDown);
  }, [selectedRemark]);

  const handleOpenDetail = useCallback((remark) => {
    previousFocusRef.current = document.activeElement;
    setSelectedRemark(remark);
    setEditedStatus(remark.statut);
    setEditedComment(remark.commentaire_admin || '');
    setSaveError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedRemark(null);
    previousFocusRef.current?.focus();
  }, []);

  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateRemarkStatus(selectedRemark.id, editedStatus, editedComment);
      setRemarks(prev => prev.map(r => 
        r.id === selectedRemark.id ? { ...r, statut: editedStatus, commentaire_admin: editedComment } : r
      ));
      toast.success(`Statut changé à ${editedStatus ? editedStatus.replace(/_/g, ' ') : ''}`);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      setSaveError('Erreur lors de la sauvegarde.');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRemark, editedStatus, editedComment, handleCloseModal, toast]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleView = useCallback((remark) => {
    handleOpenDetail(remark);
  }, [handleOpenDetail]);

  const handleApprove = useCallback(async (remark) => {
    try {
      await updateRemarkStatus(remark.id, 'validee', remark.commentaire_admin || '');
      setRemarks(prev => prev.map(r => r.id === remark.id ? { ...r, statut: 'validee' } : r));
      toast.success("Signalement validé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la validation");
    }
  }, [toast]);

  const handleReject = useCallback(async (remark) => {
    try {
      await updateRemarkStatus(remark.id, 'rejete', remark.commentaire_admin || '');
      setRemarks(prev => prev.map(r => r.id === remark.id ? { ...r, statut: 'rejete' } : r));
      toast.success("Signalement rejeté");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du rejet");
    }
  }, [toast]);

  const stats = useMemo(() => {
    const total = remarks.length;
    const urgents = remarks.filter(r => r.urgency >= 4 || r.statut === 'urgent').length;
    const pending = remarks.filter(r => r.statut === 'en_attente' || r.statut === 'pending').length;
    const validated = remarks.filter(r => r.statut === 'validee' || r.statut === 'actif' || r.statut === 'planifie').length;
    const aiValidated = remarks.filter(r => r.opinion_ai_validated).length;
    const aiRate = total > 0 ? Math.round((aiValidated / total) * 100) : 0;
    
    return { total, urgents, pending, validated, aiRate };
  }, [remarks]);

  const filteredRemarks = useMemo(() => {
    let result = remarks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        (r.opinion && r.opinion.toLowerCase().includes(q)) ||
        (r.zone_nom && r.zone_nom.toLowerCase().includes(q)) ||
        (r.user?.nom && r.user.nom.toLowerCase().includes(q)) ||
        (r.profile && r.profile.toLowerCase().includes(q)) ||
        (r.category && r.category.toLowerCase().includes(q))
      );
    }
    return result;
  }, [remarks, searchQuery]);

  const paginatedRemarks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRemarks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRemarks, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredRemarks.length / itemsPerPage) || 1;
  }, [filteredRemarks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [filters, searchQuery]);

  if (loading) return <div style={{padding: '24px'}}><SkeletonTable rows={5} columns={5} /></div>;

  return (
    <div style={styles.wrapper}>
      {/* SECTION 1 — 5 KPI cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
        gap: '10px', marginBottom: '20px',
      }}>
        {[
          { label: 'Total', value: stats.total, sub: 'Signalements enregistrés', color: '#C1440E' },
          { label: 'Urgents', value: stats.urgents, sub: 'Urgence >= 4 ou urgent', color: '#ef4444' },
          { label: 'En attente', value: stats.pending, sub: 'À modérer / valider', color: '#f59e0b' },
          { label: 'Validés', value: stats.validated, sub: 'Validés / Actifs / Planifiés', color: '#52BE80' },
          { label: 'Taux IA', value: `${stats.aiRate}%`, sub: 'Traités par Claude', color: '#E8B87A' },
        ].map((card, idx) => (
          <div key={idx} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(242,237,230,0.07)',
            borderRadius: '8px', padding: '14px',
            position: 'relative', overflow: 'hidden',
            transition: 'all 0.2s',
          }}>
            {/* Top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '1.5px', background: card.color,
            }} />
            <div style={{
              fontSize: '10px', color: 'rgba(242,237,230,0.28)',
              letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '7px',
            }}>{card.label}</div>
            <div style={{
              fontFamily: 'DM Mono, monospace', fontSize: '26px',
              color: '#E8B87A', fontWeight: 500, lineHeight: 1, marginBottom: '4px',
            }}>{card.value}</div>
            <div style={{
              fontSize: '10px', color: 'rgba(242,237,230,0.3)',
            }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* SECTION 2 — AI alert banner */}
      <div style={{
        background: 'rgba(193,68,14,0.06)',
        border: '0.5px solid rgba(193,68,14,0.2)',
        borderRadius: '8px', padding: '12px 14px',
        marginBottom: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#C1440E', flexShrink: 0, marginTop: '3px',
          animation: 'adpulse 2s infinite',
        }} />
        <div>
          <div style={{
            fontSize: '10px', color: '#C1440E',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: '4px',
          }}>Alerte IA · Claude</div>
          <div style={{
            fontSize: '12px', color: 'rgba(242,237,230,0.55)',
            lineHeight: 1.5, fontStyle: 'italic',
          }}>
            Signalements en attente de modération. 
            Cliquez sur une ligne pour voir les détails.
          </div>
        </div>
      </div>

      {/* SECTION 3 — Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '14px', flexWrap: 'wrap',
      }}>
        {/* Search input with SVG magnifier icon */}
        <div style={{
          position: 'relative', flex: 1,
          minWidth: '200px', maxWidth: '280px',
        }}>
          <svg style={{
            position: 'absolute', left: '10px',
            top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(242,237,230,0.25)', pointerEvents: 'none',
          }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={{
              width: '100%', padding: '7px 12px 7px 30px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
              fontFamily: 'DM Sans, sans-serif', outline: 'none',
            }}
            placeholder="Chercher une remarque, zone, citoyen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter pills */}
        {[
          { label: 'Toutes', value: '' },
          { label: '🔴 Urgentes', value: 'urgent' },
          { label: '🟡 En attente', value: 'en_attente' },
          { label: '✅ Validées', value: 'validee' },
          { label: '❌ Rejetées', value: 'rejete' },
        ].map((pill, idx) => {
          const isActive = filters.statut === pill.value;
          return (
            <button
              key={idx}
              onClick={() => setFilters({ ...filters, statut: pill.value })}
              style={{
                padding: '5px 11px', borderRadius: '100px',
                fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
                border: isActive ? '0.5px solid rgba(193,68,14,0.55)' : '0.5px solid rgba(242,237,230,0.1)',
                background: isActive ? 'rgba(193,68,14,0.1)' : 'transparent',
                color: isActive ? '#F2EDE6' : 'rgba(242,237,230,0.38)',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(242,237,230,0.3)';
                  e.currentTarget.style.color = '#F2EDE6';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'rgba(242,237,230,0.1)';
                  e.currentTarget.style.color = 'rgba(242,237,230,0.38)';
                }
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 4 — Data table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '0.5px solid rgba(242,237,230,0.07)',
        borderRadius: '10px', overflow: 'hidden',
      }}>
        {error && (
          <EmptyState 
            icon="❌"
            title="Erreur lors du chargement"
            subtitle={error}
            action={{ 
              label: "Réessayer", 
              onClick: () => window.location.reload() 
            }}
          />
        )}

        {!loading && !error && (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    'Citoyen',
                    'Zone',
                    'Catégorie',
                    'Urgence',
                    'Statut',
                    'Date',
                    'Actions',
                  ].map((header, idx) => (
                    <th key={idx} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontSize: '10px', letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'rgba(242,237,230,0.28)',
                      background: 'rgba(255,255,255,0.02)',
                      borderBottom: '0.5px solid rgba(242,237,230,0.06)',
                      fontWeight: 500, whiteSpace: 'nowrap',
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRemarks.length > 0 ? (
                  paginatedRemarks.map((remark) => {
                    const urgency = remark.urgency || 1;
                    const dateFormatted = remark.created_at
                      ? new Date(remark.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: '2-digit'
                        })
                      : '-';

                    // Get status badge styles
                    let badgeBorder = 'rgba(242,237,230,0.1)';
                    let badgeColor = 'rgba(242,237,230,0.5)';
                    let badgeBg = 'transparent';
                    const statutLow = remark.statut?.toLowerCase();
                    if (statutLow === 'urgent') {
                      badgeBorder = 'rgba(239,68,68,0.4)';
                      badgeColor = 'rgba(239,68,68,0.9)';
                      badgeBg = 'rgba(239,68,68,0.08)';
                    } else if (statutLow === 'en_attente' || statutLow === 'pending') {
                      badgeBorder = 'rgba(245,158,11,0.4)';
                      badgeColor = 'rgba(245,158,11,0.9)';
                      badgeBg = 'rgba(245,158,11,0.07)';
                    } else if (statutLow === 'validee' || statutLow === 'actif') {
                      badgeBorder = 'rgba(82,190,128,0.4)';
                      badgeColor = 'rgba(82,190,128,0.9)';
                      badgeBg = 'rgba(82,190,128,0.07)';
                    } else if (statutLow === 'rejete') {
                      badgeBorder = 'rgba(100,116,139,0.4)';
                      badgeColor = 'rgba(100,116,139,0.8)';
                      badgeBg = 'rgba(100,116,139,0.05)';
                    }

                    return (
                      <tr
                        key={remark.id}
                        onClick={() => handleView(remark)}
                        style={{
                          borderBottom: '0.5px solid rgba(242,237,230,0.04)',
                          transition: 'background 0.15s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(193,68,14,0.04)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* Citoyen name */}
                        <td style={{
                          padding: '11px 14px', fontSize: '12px',
                          color: '#F2EDE6', fontWeight: 500, verticalAlign: 'middle'
                        }}>
                          {remark.user?.nom || remark.profile || 'Citoyen anonyme'}
                        </td>

                        {/* Zone cell */}
                        <td style={{
                          padding: '11px 14px', fontSize: '12px',
                          color: 'rgba(242,237,230,0.65)', verticalAlign: 'middle'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: remark.zone_couleur || '#C1440E', flexShrink: 0
                            }} />
                            {remark.zone_nom || 'Zone non spécifiée'}
                          </span>
                        </td>

                        {/* Catégorie */}
                        <td style={{
                          padding: '11px 14px', fontSize: '12px',
                          color: 'rgba(242,237,230,0.65)', verticalAlign: 'middle',
                          textTransform: 'capitalize'
                        }}>
                          <span style={{ marginRight: '6px' }}>{getCategoryIcon(remark.category)}</span>
                          {remark.category || 'autre'}
                        </td>

                        {/* Urgence (5 pips) */}
                        <td style={{
                          padding: '11px 14px', fontSize: '12px',
                          color: 'rgba(242,237,230,0.65)', verticalAlign: 'middle'
                        }}>
                          <div style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }} aria-label={`Urgence ${urgency} sur 5`}>
                            {[1, 2, 3, 4, 5].map(i => (
                              <div key={i} style={{
                                width: '5px', height: '5px', borderRadius: '1px',
                                background: i <= urgency
                                  ? urgency >= 4 ? '#ef4444'
                                    : urgency >= 3 ? '#f59e0b' : '#52BE80'
                                  : 'rgba(242,237,230,0.1)',
                              }} />
                            ))}
                          </div>
                        </td>

                        {/* Statut badge */}
                        <td style={{
                          padding: '11px 14px', fontSize: '12px',
                          color: 'rgba(242,237,230,0.65)', verticalAlign: 'middle'
                        }}>
                          <span style={{
                            fontSize: '10px', padding: '2px 8px',
                            borderRadius: '100px', border: '0.5px solid',
                            borderColor: badgeBorder, color: badgeColor, background: badgeBg,
                            textTransform: 'capitalize', display: 'inline-block'
                          }}>
                            {remark.statut ? remark.statut.replace(/_/g, ' ') : ''}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{
                          padding: '11px 14px', fontSize: '11px',
                          color: 'rgba(242,237,230,0.3)', verticalAlign: 'middle',
                          fontFamily: 'DM Mono, monospace'
                        }}>
                          {dateFormatted}
                        </td>

                        {/* Actions */}
                        <td 
                          onClick={e => e.stopPropagation()} /* Prevent tr click trigger when clicking action buttons */
                          style={{
                            padding: '11px 14px', fontSize: '12px',
                            color: 'rgba(242,237,230,0.65)', verticalAlign: 'middle'
                          }}
                        >
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {/* Valider button (green) */}
                            {(statutLow === 'urgent' || statutLow === 'en_attente' || statutLow === 'pending') && (
                              <button
                                onClick={() => handleApprove(remark)}
                                style={{
                                  padding: '4px 10px', borderRadius: '4px',
                                  fontSize: '11px', background: 'transparent',
                                  border: '0.5px solid rgba(82,190,128,0.4)',
                                  color: 'rgba(82,190,128,0.8)',
                                  fontFamily: 'DM Sans', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(82,190,128,0.1)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                Valider
                              </button>
                            )}

                            {/* Rejeter button (red) */}
                            {(statutLow === 'urgent' || statutLow === 'en_attente' || statutLow === 'pending' || statutLow === 'validee' || statutLow === 'actif') && (
                              <button
                                onClick={() => handleReject(remark)}
                                style={{
                                  padding: '4px 10px', borderRadius: '4px',
                                  fontSize: '11px', background: 'transparent',
                                  border: '0.5px solid rgba(239,68,68,0.35)',
                                  color: 'rgba(239,68,68,0.7)',
                                  fontFamily: 'DM Sans', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                Rejeter
                              </button>
                            )}

                            {/* Voir button (neutral) */}
                            {(statutLow === 'validee' || statutLow === 'actif' || statutLow === 'rejete') && (
                              <button
                                onClick={() => handleView(remark)}
                                style={{
                                  padding: '4px 10px', borderRadius: '4px',
                                  fontSize: '11px', background: 'transparent',
                                  border: '0.5px solid rgba(242,237,230,0.12)',
                                  color: 'rgba(242,237,230,0.4)',
                                  fontFamily: 'DM Sans', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                Voir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      <EmptyState 
                        icon="📊"
                        title="Aucune remarque"
                        subtitle="Essayez d'élargir votre recherche ou vos catégories"
                        action={{ 
                          label: "Effacer les filtres", 
                          onClick: () => {
                            setFilters({zone_id:'', category:'', statut:'', dateStart:'', dateEnd:''});
                            setSearchQuery('');
                          }
                        }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderTop: '0.5px solid rgba(242,237,230,0.06)',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.25)' }}>
                Affichage {filteredRemarks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredRemarks.length)} sur {filteredRemarks.length} remarques
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {/* Previous Button */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    width: '28px', height: '28px', borderRadius: '4px',
                    border: '0.5px solid rgba(242,237,230,0.1)', background: 'transparent',
                    color: currentPage === 1 ? 'rgba(242,237,230,0.15)' : 'rgba(242,237,230,0.4)',
                    fontSize: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ‹
                </button>

                {/* Page number buttons */}
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = currentPage === pNum;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '4px',
                        border: isCurrent ? '0.5px solid rgba(193,68,14,0.4)' : '0.5px solid rgba(242,237,230,0.1)',
                        background: isCurrent ? 'rgba(193,68,14,0.15)' : 'transparent',
                        color: isCurrent ? '#F2EDE6' : 'rgba(242,237,230,0.4)',
                        fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    width: '28px', height: '28px', borderRadius: '4px',
                    border: '0.5px solid rgba(242,237,230,0.1)', background: 'transparent',
                    color: currentPage === totalPages ? 'rgba(242,237,230,0.15)' : 'rgba(242,237,230,0.4)',
                    fontSize: '12px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      <RemarkDetailModalMemo
        selectedRemark={selectedRemark}
        editedStatus={editedStatus}
        editedComment={editedComment}
        isSaving={isSaving}
        saveError={saveError}
        setEditedStatus={setEditedStatus}
        setEditedComment={setEditedComment}
        onClose={handleCloseModal}
        onSave={handleSaveChanges}
        modalRef={modalRef}
      />
    </div>
  );
};

export default AdminRemarquesTab;
