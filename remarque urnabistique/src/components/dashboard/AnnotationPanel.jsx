import React, { useState, useEffect } from 'react'

const styles = {
  wrapper: { background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '400px' },
  title: { fontSize: '18px', fontWeight: '800', margin: '0 0 15px 0', color: '#0f172a' },
  list: { flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' },
  noteCard: { background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '10px', borderLeft: '4px solid #8b5cf6' },
  noteMeta: { fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '4px' },
  noteText: { fontSize: '13px', color: '#334155', margin: 0, lineHeight: '1.4' },
  inputWrapper: { display: 'flex', gap: '10px' },
  input: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' },
  btn: { padding: '12px 20px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }
}

export default function AnnotationPanel({ parcelId }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    // Dans une vraie app, cela viendrait de l'API (table annotations).
    // Ici on utilise localStorage pour la persistance locale du mock.
    const savedNotes = JSON.parse(localStorage.getItem('urbaniste_notes') || '{}')
    setNotes(savedNotes[parcelId] || [])
  }, [parcelId])

  const handleAddNote = () => {
    if (!newNote.trim()) return
    
    const noteObj = {
        id: Date.now(),
        text: newNote,
        date: new Date().toLocaleString()
    }
    
    const updatedNotes = [...notes, noteObj]
    setNotes(updatedNotes)
    
    const allNotes = JSON.parse(localStorage.getItem('urbaniste_notes') || '{}')
    allNotes[parcelId] = updatedNotes
    localStorage.setItem('urbaniste_notes', JSON.stringify(allNotes))
    
    setNewNote('')
  }

  if (!parcelId) return (
      <div style={styles.wrapper}>
          <h3 style={styles.title}>📝 Notes Internes (Privé)</h3>
          <p style={{color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginTop: '40px'}}>
              Sélectionnez une zone sur la carte ou dans la liste pour y ajouter des notes internes.
          </p>
      </div>
  )

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>📝 Notes Internes (Privé)</h3>
      <div style={styles.list}>
          {notes.length === 0 && <p style={{fontSize: '13px', color: '#94a3b8', fontStyle: 'italic'}}>Aucune note pour cette zone.</p>}
          {notes.map(n => (
              <div key={n.id} style={styles.noteCard}>
                  <p style={styles.noteMeta}>{n.date}</p>
                  <p style={styles.noteText}>{n.text}</p>
              </div>
          ))}
      </div>
      <div style={styles.inputWrapper}>
          <input 
            style={styles.input} 
            placeholder="Ajouter une observation..." 
            value={newNote} 
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
          />
          <button style={styles.btn} onClick={handleAddNote}>Ajouter</button>
      </div>
    </div>
  )
}
