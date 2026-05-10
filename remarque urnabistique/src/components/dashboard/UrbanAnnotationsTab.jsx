import React, { useState, useEffect } from 'react';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import SkeletonTable from '../SkeletonTable.jsx';
import { validateAnnotationText } from '../../services/validationService.js';
import { useToast } from '../../hooks/useToast.js';
import EmptyState from '../EmptyState.jsx';

export default function UrbanAnnotationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedZone } = useUrbanZone();
  
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeZoneId, setActiveZoneId] = useState('');
  
  const [annotations, setAnnotations] = useState([]); // All annotations for the active zone
  const [currentAnnotation, setCurrentAnnotation] = useState(null); // The specific annotation for this urbaniste
  
  const [draftText, setDraftText] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const handleTextChange = (e) => {
    const text = e.target.value;
    if (text.length <= 500) {
      setDraftText(text);
      setCharCount(text.length);
    }
  };

  const getCharColor = () => {
    if (charCount < 250) return '#6B7280';
    if (charCount < 400) return '#F59E0B';
    return '#DC2626';
  };

  // 1. Load Zones and Users
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [zonesRes, usersRes] = await Promise.all([
          api.getZones(),
          api.getAllUsers()
        ]);
        setZones(zonesRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Pre-select zone from map context
  useEffect(() => {
    if (selectedZone && selectedZone.id) {
      setActiveZoneId(selectedZone.id);
    } else if (!activeZoneId && zones.length > 0) {
      setActiveZoneId(zones[0].id);
    }
  }, [selectedZone, zones]);

  // 3. Load Annotations when zone changes
  useEffect(() => {
    if (!activeZoneId) return;

    const fetchAnnotations = async () => {
      try {
        const response = await api.getAnnotationsByZone(activeZoneId);
        setAnnotations(response.data);
        
        // Find if current user already has an annotation for this zone
        const userAnn = response.data.find(a => String(a.urbaniste_id) === String(user?.id));
        if (userAnn) {
          setCurrentAnnotation(userAnn);
          setDraftText(userAnn.texte);
          setCharCount(userAnn.texte.length);
        } else {
          setCurrentAnnotation(null);
          setDraftText('');
          setCharCount(0);
        }
      } catch (err) {
        console.error("Error loading annotations:", err);
      }
    };
    
    fetchAnnotations();
  }, [activeZoneId, user]);

  const handleSave = async () => {
    if (!activeZoneId || !draftText.trim()) return;
    setIsSaving(true);
    try {
      const selectedZoneData = zones.find(z => String(z.id) === String(activeZoneId));
      const zoneNom = selectedZoneData ? selectedZoneData.nom : '';

      if (currentAnnotation) {
        // Update
        await api.updateAnnotation(currentAnnotation.id, draftText);
      } else {
        // Create
        await api.saveAnnotation({
          zone_id: activeZoneId,
          zone_nom: zoneNom,
          urbaniste_id: user.id,
          texte: draftText
        });
      }
      
      toast.success('Annotation enregistrée');

      // Reload annotations to get updated timestamps and lists
      const response = await api.getAnnotationsByZone(activeZoneId);
      setAnnotations(response.data);
      
      const userAnn = response.data.find(a => String(a.urbaniste_id) === String(user?.id));
      setCurrentAnnotation(userAnn);
    } catch (err) {
      console.error("Error saving annotation:", err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setDraftText('');
    setCharCount(0);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette annotation ?")) {
      try {
        await api.deleteAnnotation(id);
        const response = await api.getAnnotationsByZone(activeZoneId);
        setAnnotations(response.data);
        if (currentAnnotation && currentAnnotation.id === id) {
          setCurrentAnnotation(null);
          setDraftText('');
          setCharCount(0);
        }
      } catch (err) {
        console.error("Error deleting annotation:", err);
      }
    }
  };

  const handleEdit = (ann) => {
    setDraftText(ann.texte);
    setCharCount(ann.texte.length);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBlur = async () => {
    if (draftText.trim() && draftText.length <= 500 && draftText !== currentAnnotation?.texte) {
      await handleSave();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getAuthorName = (urbaniste_id) => {
    if (String(urbaniste_id) === String(user?.id)) return "Vous";
    const author = users.find(u => String(u.id) === String(urbaniste_id));
    return author ? author.nom : `Urbaniste`;
  };

  const s = {
    page: { padding: '24px', background: '#F9FAFB', fontFamily: "'Segoe UI', sans-serif", color: '#1e293b' },
    card: { background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: 24 },
    label: { display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8 },
    select: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, marginBottom: 20 },
    textarea: { width: '100%', padding: '14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 15, minHeight: 120, resize: 'vertical', fontFamily: "inherit" },
    btnRow: { display: 'flex', gap: 12, marginTop: 16, alignItems: 'center' },
    btnSave: { background: '#6366F1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' },
    btnClear: { background: 'white', color: '#6B7280', border: '1px solid #D1D5DB', padding: '10px 20px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' },
    historyTitle: { fontSize: 18, fontWeight: 700, color: '#111827', margin: '32px 0 16px 0' },
    historyList: { display: 'flex', flexDirection: 'column', gap: 16 },
    historyItem: (isMine) => ({
      padding: 16, borderRadius: 8,
      background: isMine ? '#EEF2FF' : '#F9FAFB',
      border: isMine ? '1px solid #C7D2FE' : '1px solid #E5E7EB',
    }),
    historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    historyAuthor: { fontWeight: 700, fontSize: 14, color: '#1F2937' },
    historyDate: { fontSize: 12, color: '#6B7280' },
    historyText: { margin: 0, fontSize: 14, color: '#4B5563', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
    actionRow: { display: 'flex', gap: 12, marginTop: 12 },
    actionBtn: { background: 'transparent', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#6B7280' },
    empty: { textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: 15 }
  };

  if (loading) return <div style={{padding: '24px'}}><SkeletonTable rows={3} columns={2} /></div>;

  return (
    <div style={s.page}>
      <section style={s.card} aria-label="Rédaction d'annotation">
        <label htmlFor="annotation-zone-select" style={s.label}>Zone de l'annotation</label>
        <select 
          id="annotation-zone-select"
          style={s.select}
          value={activeZoneId} 
          onChange={(e) => setActiveZoneId(e.target.value)}
          aria-required="true"
        >
          <option value="" disabled>-- Choisir une zone --</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.nom}</option>
          ))}
        </select>

        {activeZoneId && (
          <>
            <label htmlFor="annotation-textarea" style={s.label}>Note privée pour cette zone</label>
            <textarea 
              id="annotation-textarea"
              style={s.textarea}
              placeholder="Vos observations professionnelles..."
              value={draftText}
              onChange={handleTextChange}
              onBlur={handleBlur}
              rows={4}
              aria-describedby="annotation-char-counter"
              maxLength={500}
            />
            <div
              id="annotation-char-counter"
              style={{ fontSize: '12px', marginTop: '4px', textAlign: 'right', color: getCharColor() }}
              aria-live="polite"
              aria-atomic="true"
            >
              {charCount}/500
            </div>
            <div style={s.btnRow}>
              <button 
                style={{...s.btnSave, opacity: !draftText.trim() ? 0.5 : 1}} 
                onClick={handleSave} 
                disabled={isSaving || !draftText.trim()}
                aria-disabled={isSaving || !draftText.trim()}
                aria-label={isSaving ? "Sauvegarde en cours" : "Sauvegarder l'annotation"}
              >
                {isSaving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
              <button style={s.btnClear} onClick={handleClear} aria-label="Effacer le texte de l'annotation">Effacer</button>
            </div>
          </>
        )}
      </section>

      {activeZoneId && (
        <section aria-label="Historique des annotations">
          <h3 style={s.historyTitle}>Historique des annotations pour cette zone</h3>
          
          {annotations.length === 0 ? (
            <EmptyState 
              icon="📝"
              title="Aucune annotation"
              subtitle="Commencez par ajouter une note privée ci-dessus"
            />
          ) : (
            <div style={s.historyList} role="list">
              {annotations.map(ann => {
                const isMine = String(ann.urbaniste_id) === String(user?.id);
                const authorName = getAuthorName(ann.urbaniste_id);

                return (
                  <article key={ann.id} style={s.historyItem(isMine)} role="listitem" aria-label={`Annotation par ${authorName}`}>
                    <div style={s.historyHeader}>
                      <span style={s.historyAuthor}>{authorName}</span>
                      <time style={s.historyDate} dateTime={ann.created_at}>{formatDate(ann.created_at)}</time>
                    </div>
                    <p style={s.historyText}>{ann.texte}</p>
                    {isMine && (
                      <div style={s.actionRow}>
                        <button style={s.actionBtn} onClick={() => handleEdit(ann)} aria-label={`Modifier l'annotation du ${formatDate(ann.created_at)}`}><span aria-hidden="true">✏️</span> Modifier</button>
                        <button style={{...s.actionBtn, color: '#EF4444'}} onClick={() => handleDelete(ann.id)} aria-label={`Supprimer l'annotation du ${formatDate(ann.created_at)}`}><span aria-hidden="true">🗑️</span> Supprimer</button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
