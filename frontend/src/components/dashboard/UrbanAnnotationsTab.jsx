import React, { useState, useEffect, useCallback } from 'react';
import { useUrbanZone } from '../../context/UrbanZoneContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/axiosInstance';
import SkeletonTable from '../SkeletonTable.jsx';
import { useToast } from '../../hooks/useToast.js';
import EmptyState from '../EmptyState.jsx';
import { SectionLabel } from './UDComponents';

export default function UrbanAnnotationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedZone } = useUrbanZone();

  const [zones, setZones] = useState([]);
  const [activeZoneId, setActiveZoneId] = useState('');
  const [annotations, setAnnotations] = useState([]); // All annotations for the active zone
  const [allAnnotations, setAllAnnotations] = useState([]); // All annotations for the city (for counts)
  const [currentAnnotation, setCurrentAnnotation] = useState(null); // The specific annotation for this urbaniste in this zone

  const [draftText, setDraftText] = useState('');
  const [priority, setPriority] = useState('informatif'); // 'urgente', 'surveiller', 'informatif'
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Load Initial Data (Zones + All Annotations for counts)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resZones, resAllAnn] = await Promise.all([
          api.get('/zones'),
          api.get(`/urbanistes/${user?.id}/annotations`)
        ]);
        
        const zonesData = resZones.data?.data || resZones.data || [];
        const allAnnData = resAllAnn.data?.data || resAllAnn.data || [];
        
        setZones(zonesData);
        setAllAnnotations(allAnnData);
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchInitialData();
  }, [user?.id]);

  // 2. Pre-select zone from context or first available
  useEffect(() => {
    if (selectedZone && selectedZone.id) {
      setActiveZoneId(selectedZone.id);
    } else if (!activeZoneId && zones.length > 0) {
      setActiveZoneId(zones[0].id);
    }
  }, [selectedZone, zones]);

  // 3. Load Annotations for the active zone
  const fetchZoneAnnotations = useCallback(async () => {
    if (!activeZoneId) return;
    try {
      const res = await api.get(`/zones/${activeZoneId}/annotations`);
      const annotationsData = res.data?.data || res.data || [];
      setAnnotations(annotationsData);

      // Find if current user already has an annotation for this zone
      const userAnn = annotationsData.find(a => String(a.urbaniste_id) === String(user?.id));
      if (userAnn) {
        setCurrentAnnotation(userAnn);
        setDraftText(userAnn.texte);
        setPriority(userAnn.priorite || 'informatif');
      } else {
        setCurrentAnnotation(null);
        setDraftText('');
        setPriority('informatif');
      }
    } catch (err) {
      console.error("Error loading annotations:", err);
    }
  }, [activeZoneId, user?.id]);

  useEffect(() => {
    fetchZoneAnnotations();
  }, [fetchZoneAnnotations]);

  const handleSave = async () => {
    if (!activeZoneId || !draftText.trim()) return;
    setIsSaving(true);
    try {
      if (currentAnnotation) {
        // Update
        await api.patch(`/annotations/${currentAnnotation.id}`, { 
          texte: draftText,
          priorite: priority 
        });
      } else {
        // Create
        await api.post('/annotations', {
          zone_id: activeZoneId,
          urbaniste_id: user.id,
          texte: draftText,
          priorite: priority
        });
      }

      toast.success('Annotation enregistrée');
      
      // Refresh local list and overall counts
      fetchZoneAnnotations();
      const resAllAnn = await api.get(`/urbanistes/${user?.id}/annotations`);
      setAllAnnotations(resAllAnn.data?.data || resAllAnn.data || []);
      
    } catch (err) {
      console.error("Error saving annotation:", err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette annotation ?")) {
      try {
        await api.delete(`/annotations/${id}`);
        toast.success("Annotation supprimée");
        fetchZoneAnnotations();
        
        // Refresh counts
        const resAllAnn = await api.get(`/urbanistes/${user?.id}/annotations`);
        setAllAnnotations(resAllAnn.data?.data || resAllAnn.data || []);
      } catch (err) {
        console.error("Error deleting annotation:", err);
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const getPriorityInfo = (p) => {
    switch (p) {
      case 'urgente': return { label: 'Intervention urgente', color: '#EF4444', icon: '🔴' };
      case 'surveiller': return { label: 'À surveiller', color: '#F59E0B', icon: '🟡' };
      default: return { label: 'Informatif', color: '#10B981', icon: '🟢' };
    }
  };

  const getNoteCountForZone = (zoneId) => {
    return allAnnotations.filter(a => String(a.zone_id) === String(zoneId)).length;
  };

  if (loading) return <div style={{ padding: '24px' }}><SkeletonTable rows={3} columns={2} /></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Privacy notice - Cleaned up */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(242,237,230,0.1)',
        borderRadius: '10px', padding: '16px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <span style={{ fontSize: '20px' }}>🔒</span>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(242,237,230,0.6)', lineHeight: 1.5 }}>
          Ces notes sont visibles uniquement par les urbanistes.
          Elles ne sont pas partagées avec les citoyens ni les administrateurs.
        </p>
      </div>

      {/* New annotation form */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(242,237,230,0.08)',
        borderRadius: '12px', padding: '20px', marginBottom: '32px',
      }}>
        <SectionLabel>Rédiger une annotation</SectionLabel>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Zone concernée
          </label>
          <select
            value={activeZoneId}
            onChange={e => setActiveZoneId(e.target.value)}
            style={{
              padding: '10px 14px', width: '100%',
              background: '#1a1a1a',
              border: '0.5px solid rgba(242,237,230,0.12)',
              borderRadius: '8px', color: '#F2EDE6',
              fontSize: '13px', outline: 'none',
            }}
          >
            {zones.map(z => (
              <option key={z.id} value={z.id} style={{ background: '#1a1a1a' }}>
                {z.nom} ({getNoteCountForZone(z.id)} notes)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(242,237,230,0.3)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Niveau de priorité
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'urgente', label: 'Intervention urgente', color: '#EF4444' },
              { id: 'surveiller', label: 'À surveiller', color: '#F59E0B' },
              { id: 'informatif', label: 'Informatif', color: '#10B981' }
            ].map(p => {
              const isActive = priority === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: '8px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: isActive ? p.color : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${isActive ? p.color : 'rgba(242,237,230,0.1)'}`,
                    color: isActive ? '#fff' : 'rgba(242,237,230,0.4)',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={draftText}
          onChange={e => setDraftText(e.target.value)}
          rows={4}
          placeholder="Détails techniques, observations terrain, planification..."
          style={{
            width: '100%', padding: '12px 16px', resize: 'none',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(242,237,230,0.12)',
            borderRadius: '8px', color: '#F2EDE6', fontSize: '13px',
            fontFamily: 'inherit', outline: 'none', marginBottom: '16px',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={isSaving || !draftText.trim()}
            style={{
              padding: '10px 24px', background: '#C1440E',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '13px', fontWeight: 600,
              cursor: draftText.trim() ? 'pointer' : 'not-allowed',
              opacity: draftText.trim() ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            {isSaving ? 'Enregistrement...' : currentAnnotation ? 'Mettre à jour la note' : 'Sauvegarder la note'}
          </button>
        </div>
      </div>

      <SectionLabel>Notes existantes pour {zones.find(z => String(z.id) === String(activeZoneId))?.nom || 'cette zone'}</SectionLabel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {annotations.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            background: 'rgba(255,255,255,0.01)',
            border: '0.5px dashed rgba(242,237,230,0.1)',
            borderRadius: '12px'
          }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>📝</span>
            <p style={{ color: 'rgba(242,237,230,0.4)', fontSize: '14px', margin: 0 }}>
              Aucune annotation pour cette zone.<br/>
              Commencez par rédiger une note ci-dessus.
            </p>
          </div>
        ) : (
          annotations.map(a => {
            const pInfo = getPriorityInfo(a.priorite);
            return (
              <div key={a.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(242,237,230,0.08)',
                borderRadius: '12px', padding: '16px',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      padding: '4px 10px', borderRadius: '100px',
                      background: `${pInfo.color}15`, border: `0.5px solid ${pInfo.color}40`,
                      color: pInfo.color, letterSpacing: '0.03em'
                    }}>
                      {pInfo.icon} {pInfo.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.2)' }}>·</span>
                    <span style={{ fontSize: '11px', color: 'rgba(242,237,230,0.4)', fontWeight: 500 }}>
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      background: 'transparent', border: 'none', color: 'rgba(239, 68, 68, 0.4)',
                      fontSize: '11px', cursor: 'pointer', fontWeight: 600,
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(239, 68, 68, 0.4)'}
                  >
                    Supprimer
                  </button>
                </div>
                <div style={{
                  fontSize: '13px', color: 'rgba(242,237,230,0.8)',
                  lineHeight: 1.6, whiteSpace: 'pre-wrap'
                }}>
                  {a.texte}
                </div>
                {String(a.urbaniste_id) !== String(user?.id) && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '0.5px solid rgba(242,237,230,0.05)', fontSize: '10px', color: 'rgba(242,237,230,0.25)' }}>
                    Rédigé par un collègue urbaniste
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
