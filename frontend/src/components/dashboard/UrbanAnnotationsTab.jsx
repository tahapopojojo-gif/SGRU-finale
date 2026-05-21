import React, { useState, useEffect } from 'react';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { useAuth } from '../../context/AuthContext';
import { getZones, getAllUsers } from '../../services/adminApi';
import api from '../../services/api';
import SkeletonTable from '../SkeletonTable.jsx';
import { validateAnnotationText } from '../../services/validationService.js';
import { useToast } from '../../hooks/useToast.js';
import EmptyState from '../EmptyState.jsx';
import { unwrap } from '../../utils/unwrap';
import { AiCard, SectionLabel } from './UDComponents';

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
        const [resZones, resUsers] = await Promise.all([
          getZones(),
          getAllUsers()
        ]);
        const zonesData = unwrap(resZones);
        const usersData = unwrap(resUsers);
        setZones(zonesData);
        setUsers(usersData);
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
        const res = await api.getAnnotationsByZone(activeZoneId);
        const annotationsData = unwrap(res);
        setAnnotations(annotationsData);
        
        // Find if current user already has an annotation for this zone
        const userAnn = annotationsData.find(a => String(a.urbaniste_id) === String(user?.id));
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
      const res = await api.getAnnotationsByZone(activeZoneId);
      const annotationsData = unwrap(res);
      setAnnotations(annotationsData);
      
      const userAnn = annotationsData.find(a => String(a.urbaniste_id) === String(user?.id));
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
        const res = await api.getAnnotationsByZone(activeZoneId);
        const annotationsData = Array.isArray(res) ? res
                              : Array.isArray(res.data) ? res.data
                              : Array.isArray(res.data?.data) ? res.data.data
                              : [];
        setAnnotations(annotationsData);
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

  const selectedZoneId = activeZoneId;
  const setSelectedZoneId = setActiveZoneId;
  const zoneId = activeZoneId;
  const noteText = draftText;
  const setNoteText = setDraftText;

  if (loading) return <div style={{padding: '24px'}}><SkeletonTable rows={3} columns={2} /></div>;

  return (
    <div>
      {/* Privacy notice */}
      <AiCard>
        Ces notes sont visibles uniquement par les urbanistes.
        Elles ne sont pas partagées avec les citoyens ni les administrateurs.
      </AiCard>

      {/* New annotation form */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px dashed rgba(242,237,230,0.12)',
        borderRadius: '8px', padding: '14px', marginBottom: '8px',
      }}>
        <SectionLabel>Nouvelle annotation</SectionLabel>
        <select
          value={selectedZoneId || zoneId || ''}
          onChange={e => setSelectedZoneId && setSelectedZoneId(e.target.value)}
          style={{
            padding: '6px 10px', width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '6px', color: 'rgba(242,237,230,0.6)',
            fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
            outline: 'none', marginBottom: '10px',
          }}
        >
          <option value="">Sélectionner une zone...</option>
          {(zones || []).map(z => (
            <option key={z.id} value={z.id}>{z.nom}</option>
          ))}
        </select>
        <textarea
          value={noteText || ''}
          onChange={e => setNoteText && setNoteText(e.target.value)}
          rows={3}
          placeholder="Rédigez votre note interne sur cette zone..."
          style={{
            width: '100%', padding: '9px 11px', resize: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(242,237,230,0.11)',
            borderRadius: '6px', color: '#F2EDE6', fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif', outline: 'none',
            transition: 'border-color 0.2s', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(193,68,14,0.45)'}
          onBlur={e => e.target.style.borderColor = 'rgba(242,237,230,0.11)'}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={handleSave || (() => {})}
            style={{
              padding: '7px 16px', background: '#C1440E',
              border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '12px',
              fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            }}
          >
            Sauvegarder la note
          </button>
        </div>
      </div>

      <SectionLabel>Notes existantes ({(annotations || []).length})</SectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(annotations || []).map((a, i) => (
          <div key={a.id || i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid rgba(242,237,230,0.07)',
            borderRadius: '8px', padding: '14px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '8px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '11px', fontWeight: 500, color: '#E8B87A',
              }}>
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: a.zone?.couleur || '#C1440E',
                  display: 'inline-block',
                }} />
                {a.zone?.nom || a.zone_nom || 'Zone'}
              </div>
              <span style={{
                fontSize: '10px', color: 'rgba(242,237,230,0.25)',
              }}>
                {a.created_at
                  ? new Date(a.created_at).toLocaleDateString('fr-FR')
                  : ''}
              </span>
            </div>
            <div style={{
              fontSize: '12px', color: 'rgba(242,237,230,0.55)',
              lineHeight: 1.6, fontStyle: 'italic',
            }}>
              "{a.texte || a.note || ''}"
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
