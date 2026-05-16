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
    <td style={{...styles.td, textTransform:'capitalize'}}>{remark.profile}</td>
    <td style={styles.td}>{formatDate(remark.created_at)}</td>
    <td style={styles.td}><span style={getBadgeStyle(remark.statut, styles)}>{remark.statut}</span></td>
  </tr>
));

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
      <span style={getBadgeStyle(remark.statut, styles)}>{remark.statut}</span>
    </div>
    <div style={{ fontSize: '14px', color: '#475569', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span aria-hidden="true">{getCategoryIcon(remark.category)}</span>
      <span style={{textTransform:'capitalize'}}>{remark.category}</span>
      <span style={{color: '#eab308'}}>{"★".repeat(remark.urgency)}</span>
    </div>
    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
      <span style={{textTransform:'capitalize'}}>{remark.profile}</span>
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
                <div><p style={styles.infoLabel}>Citoyen</p><p style={styles.infoValue}>{selectedRemark.profile}</p></div>
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
                <span style={getBadgeStyle(selectedRemark.statut, styles)}>{selectedRemark.statut}</span>
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

  const fetchZones = async () => {
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
  };

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
      setError('Impossible de charger les remarques.');
    } finally {
      setLoading(false);
    }
  }, [filters, zones, userCity]);

  useEffect(() => { fetchZones(); }, []);

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
      toast.success(`Statut changé à ${editedStatus}`);
      handleCloseModal();
    } catch (err) {
      setSaveError('Erreur lors de la sauvegarde.');
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRemark, editedStatus, editedComment, handleCloseModal, toast]);

  const filteredRemarks = useMemo(() => {
    return remarks;
  }, [remarks]);

  if (loading) return <div style={{padding: '24px'}}><SkeletonTable rows={5} columns={5} /></div>;

  return (
    <div style={styles.wrapper}>
      {/* Filters */}
      <section style={styles.card} aria-label="Filtres des remarques">
        <div style={styles.filterGrid}>
          <div style={styles.filterItem}>
            <label htmlFor="filter-statut" style={styles.label}>Statut</label>
            <select id="filter-statut" style={styles.select} name="statut" value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous les statuts</option>
              <option value="urgent">Urgent</option>
              <option value="actif">Actif</option>
              <option value="planifie">Planifié</option>
              <option value="rejete">Rejeté</option>
            </select>
          </div>
          <div style={styles.filterItem}>
            <label htmlFor="filter-category" style={styles.label}>Catégorie</label>
            <select id="filter-category" style={styles.select} name="category" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
              <option value="">Toutes</option>
              <option value="hopital">Hôpital</option>
              <option value="ecole">École</option>
              <option value="parc">Parc</option>
              <option value="route">Route</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div style={styles.filterItem}>
            <label htmlFor="filter-zone" style={styles.label}>Zone</label>
            <select id="filter-zone" style={styles.select} name="zone_id" value={filters.zone_id} onChange={e => setFilters({...filters, zone_id: e.target.value})}>
              <option value="">Toutes</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          </div>
          <button style={{...styles.btnDefault, marginTop: '20px'}} onClick={() => setFilters({zone_id:'', category:'', statut:'', dateStart:'', dateEnd:''})}>
            Effacer
          </button>
        </div>
      </section>

      {/* Table / Cards */}
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
        isMobile ? (
          <div>
            {filteredRemarks.length > 0 ? (
              filteredRemarks.map(remark => (
                <RemarqueCardMemo key={remark.id} remark={remark} onOpenDetail={handleOpenDetail} styles={styles} />
              ))
            ) : (
              <EmptyState 
                icon="📊"
                title="Aucune remarque"
                subtitle="Essayez d'élargir votre plage de dates ou vos catégories"
                action={{ 
                  label: "Effacer les filtres", 
                  onClick: () => setFilters({zone_id:'', category:'', statut:'', dateStart:'', dateEnd:''})
                }}
              />
            )}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table} aria-label="Liste détaillée des remarques">
              <thead>
                <tr>
                  <th scope="col" style={styles.th}>Zone</th>
                  <th scope="col" style={styles.th}>Catégorie</th>
                  <th scope="col" style={styles.th}>Urgence</th>
                  <th scope="col" style={styles.th}>Profil Citoyen</th>
                  <th scope="col" style={styles.th}>Date</th>
                  <th scope="col" style={styles.th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredRemarks.length > 0 ? (
                  filteredRemarks.map(remark => (
                    <RemarqueRowMemo key={remark.id} remark={remark} onOpenDetail={handleOpenDetail} styles={styles} />
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <EmptyState 
                        icon="📊"
                        title="Aucune remarque"
                        subtitle="Essayez d'élargir votre plage de dates ou vos catégories"
                        action={{ 
                          label: "Effacer les filtres", 
                          onClick: () => setFilters({zone_id:'', category:'', statut:'', dateStart:'', dateEnd:''})
                        }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

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
