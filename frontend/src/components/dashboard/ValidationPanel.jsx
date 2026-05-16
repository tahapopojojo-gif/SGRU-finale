import React, { useState, useEffect } from 'react'
import { StatCard } from './StatsCards'

const styles = {
  detailWrapper: { background: '#fff', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' },
  detailTitle: { fontSize: '24px', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' },
  statusBadge: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' },
  badge: { background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '24px' },
  recommendBox: { background: '#f8fafc', padding: '20px', borderRadius: '16px', marginTop: '24px', borderLeft: '4px solid #3b82f6' },
  recommendTitle: { fontSize: '14px', fontWeight: '800', color: '#1e293b', margin: '0 0 10px 0' },
  recommendType: { fontSize: '20px', fontWeight: '900', color: '#2563eb', margin: '0 0 5px 0' },
  recommendReason: { fontSize: '13px', color: '#64748b', margin: '0 0 15px 0', lineHeight: '1.5' },
  confidenceBox: { textAlign: 'right' },
  confidenceNum: { fontSize: '24px', fontWeight: '900', color: '#10b981', margin: 0 },
  confidenceLabel: { fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  confidenceBar: { height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' },
  confidenceFill: { height: '100%', background: '#10b981', borderRadius: '4px' },
  actionBox: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' },
  commentInput: { width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', marginBottom: '16px' },
  approveBtn: { flex: 1, padding: '14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' },
  rejectBtn: { flex: 1, padding: '14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' },
  emptyStats: { background: '#fff', borderRadius: '20px', padding: '60px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }
}

const STATUS_STYLES = {
  urgent: { bg: '#fef2f2', color: '#dc2626', label: 'Urgent' },
  active: { bg: '#fffbeb', color: '#d97706', label: 'Actif' },
  planning: { bg: '#f0fdf4', color: '#16a34a', label: 'Planifié' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'En attente' },
  rejected: { bg: '#f1f5f9', color: '#64748b', label: 'Rejeté' },
}

export default function ValidationPanel({ parcel, onUpdateStatus, onClose }) {
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (parcel) setComment(parcel.admin_comment || '')
  }, [parcel])

  if (!parcel) return (
    <div style={styles.emptyStats}>
        <span style={{fontSize: '60px'}}>📊</span>
        <h2>Aucune donnée sélectionnée</h2>
        <p>Veuillez cliquer sur <b>Analyser</b> depuis la liste pour voir les détails.</p>
    </div>
  )

  const mockAnalysis = {
    urgency_avg: parcel.urgency || 4.2,
    recommendation: { 
        type: parcel.building_type === 'park' ? '🌳 Espace Vert' : '🏘️ Projet Validable', 
        confidence: 89, 
        reason: 'Analyse basée sur les critères d\'urbanisme actuels pour la ville de ' + parcel.city + '.' 
    }
  }

  return (
    <div style={styles.detailWrapper}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <h2 style={styles.detailTitle}>Validation — {parcel.name || 'Projet'}</h2>
        {onClose && <button onClick={onClose} style={{background:'transparent', border:'none', cursor:'pointer', fontSize:'16px'}}>✕ Fermer</button>}
      </div>
      
      <div style={{display: 'flex', gap: '10px', marginTop: '12px', marginBottom: '24px'}}>
        <span style={{ ...styles.statusBadge, background: STATUS_STYLES[parcel.status]?.bg, color: STATUS_STYLES[parcel.status]?.color }}>
            {STATUS_STYLES[parcel.status]?.label}
        </span>
        <span style={styles.badge}>📍 {parcel.city}</span>
        <span style={styles.badge}>🏷️ {parcel.building_type}</span>
      </div>

      <div style={styles.statGrid}>
        <StatCard emoji="🗳️" label="Total avis" value={parcel.votes || 1} color="#3b82f6" />
        <StatCard emoji="⚡" label="Urgence" value={`${mockAnalysis.urgency_avg}/5`} color="#f59e0b" />
        <StatCard emoji="📅" label="Date" value={new Date(parcel.created_at).toLocaleDateString()} color="#8b5cf6" />
      </div>

      <div style={styles.recommendBox}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
            <p style={styles.recommendTitle}>🤖 Intelligence Urbaine</p>
            <div style={styles.confidenceBox}>
                <p style={styles.confidenceNum}>{mockAnalysis.recommendation.confidence}%</p>
                <p style={styles.confidenceLabel}>Confiance</p>
            </div>
        </div>
        <p style={styles.recommendType}>{mockAnalysis.recommendation.type}</p>
        <p style={styles.recommendReason}>{mockAnalysis.recommendation.reason}</p>
        <div style={styles.confidenceBar}><div style={{ ...styles.confidenceFill, width: `${mockAnalysis.recommendation.confidence}%` }} /></div>
      </div>

      <div style={styles.actionBox}>
        <h3 style={{fontSize: '16px', color: '#0f172a', marginBottom: '12px'}}>Décision Administrative</h3>
        <textarea 
            style={styles.commentInput} 
            placeholder="Ajouter une justification ou une note pour le citoyen (ex: Le projet est validé car il respecte le plan d'aménagement...)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
        />
        <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
            <button style={styles.approveBtn} onClick={() => onUpdateStatus(parcel.id, 'active', comment)}>✅ Valider et Notifier</button>
            <button style={styles.rejectBtn} onClick={() => onUpdateStatus(parcel.id, 'rejected', comment)}>❌ Rejeter et Notifier</button>
        </div>
      </div>
    </div>
  )
}
