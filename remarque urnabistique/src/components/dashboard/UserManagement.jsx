import React, { useState, useEffect } from 'react'

const styles = {
  wrapper: { background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden', padding: '24px' },
  title: { fontSize: '18px', fontWeight: '800', margin: '0 0 20px 0', color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' },
  td: { padding: '12px', fontSize: '14px', color: '#334155', borderBottom: '1px solid #f1f5f9' },
  select: { padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px' }
}

export default function UserManagement() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    // Dans une vraie app, on ferait un appel API. Ici on lit le mock.
    const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
    
    // Ajout de l'admin par défaut s'il n'est pas listé
    if (!mockUsers.find(u => u.email === 'admin@test.com')) {
        mockUsers.push({ id: 'admin', nom: 'Admin Principal', email: 'admin@test.com', role: 'admin' })
    }
    
    setUsers(mockUsers)
  }, [])

  const handleRoleChange = (email, newRole) => {
    const updated = users.map(u => u.email === email ? { ...u, role: newRole } : u)
    setUsers(updated)
    localStorage.setItem('mock_users', JSON.stringify(updated))
    alert(`Le rôle de ${email} a été mis à jour vers ${newRole}.`)
  }

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>Gestion des Utilisateurs</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nom</th>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Rôle Actuel</th>
            <th style={styles.th}>Modifier Rôle</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={idx}>
              <td style={{...styles.td, fontWeight: '600'}}>{u.nom || 'Utilisateur'}</td>
              <td style={styles.td}>{u.email}</td>
              <td style={styles.td}>
                  <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: u.role === 'admin' ? '#fef2f2' : u.role === 'urbaniste' ? '#eff6ff' : '#f1f5f9',
                      color: u.role === 'admin' ? '#ef4444' : u.role === 'urbaniste' ? '#3b82f6' : '#64748b'
                  }}>
                      {u.role?.toUpperCase() || 'CITOYEN'}
                  </span>
              </td>
              <td style={styles.td}>
                <select 
                    style={styles.select} 
                    value={u.role || 'citoyen'} 
                    onChange={(e) => handleRoleChange(u.email, e.target.value)}
                    disabled={u.email === 'admin@test.com'} // Ne pas bloquer l'admin principal
                >
                    <option value="citoyen">Citoyen</option>
                    <option value="urbaniste">Urbaniste</option>
                    <option value="admin">Admin</option>
                </select>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
              <tr><td colSpan="4" style={{...styles.td, textAlign: 'center', color: '#94a3b8'}}>Aucun utilisateur trouvé.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
