import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getUsers, sendGroupEmail } from '../../services/adminApi';
import { useToast } from '../../hooks/useToast';
import SkeletonTable from '../SkeletonTable.jsx';
import useResponsive from '../../hooks/useResponsive';
import EmptyState from '../EmptyState.jsx';
import { unwrap } from '../../utils/unwrap';

export default function AdminUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const { isMobile } = useResponsive();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'citoyen' | 'urbaniste' | 'admin'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Group Email Form state
  const [emailGroup, setEmailGroup] = useState('citoyen');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // New Zone and Remarks state
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [remarks, setRemarks] = useState([]);

  // Fetch zones and remarks on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/zones')
      .then(res => res.json())
      .then(data => setZones(unwrap(data)))
      .catch(() => {});

    fetch('http://localhost:8000/api/remarques')
      .then(res => res.json())
      .then(data => setRemarks(unwrap(data)))
      .catch(() => {});
  }, []);

  const fetchUsersData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers();
      setUsers(unwrap(response));
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  // Filters application
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = !roleFilter || u.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (u.nom && u.nom.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Pagination
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  }, [filteredUsers, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchQuery]);

  // Destinataires estimatifs calculation (active users matching role/group criteria)
  const estimatedRecipientsCount = useMemo(() => {
    if (emailGroup === 'zone') {
      if (!selectedZoneId) return 0;
      const zoneIdNum = parseInt(selectedZoneId, 10);
      // Count unique citizens (users with role 'citoyen') who posted in this zone
      const citizensInZone = remarks
        .filter(r => r.zone_id === zoneIdNum && r.user?.role === 'citoyen')
        .map(r => r.user?.email);
      const uniqueEmails = [...new Set(citizensInZone)].filter(Boolean);
      return uniqueEmails.length;
    }
    if (emailGroup === 'all') {
      return users.filter(u => u.statut === 'active').length;
    }
    return users.filter(u => u.role === emailGroup && u.statut === 'active').length;
  }, [users, emailGroup, selectedZoneId, remarks]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Veuillez remplir l'objet et le message.");
      return;
    }
    if (emailGroup === 'zone' && !selectedZoneId) {
      toast.error("Veuillez choisir une zone.");
      return;
    }

    setSendingEmail(true);
    try {
      await sendGroupEmail(emailGroup, emailSubject, emailMessage, selectedZoneId || null);
      toast.success("E-mails de groupe envoyés avec succès !");
      setEmailSubject('');
      setEmailMessage('');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Erreur lors de l'envoi de l'e-mail.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Badges & styling helpers
  const getRoleBadgeStyle = (role) => {
    const base = {
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'capitalize',
      display: 'inline-block'
    };
    switch (role) {
      case 'super_admin':
        return { ...base, border: '0.5px solid rgba(139,92,246,0.4)', color: 'rgba(139,92,246,0.9)', background: 'rgba(139,92,246,0.08)' };
      case 'admin':
        return { ...base, border: '0.5px solid rgba(26,82,118,0.4)', color: 'rgba(93,173,226,0.9)', background: 'rgba(26,82,118,0.1)' };
      case 'urbaniste':
        return { ...base, border: '0.5px solid rgba(232,184,122,0.4)', color: 'rgba(232,184,122,0.9)', background: 'rgba(232,184,122,0.1)' };
      default: // citoyen
        return { ...base, border: '0.5px solid rgba(82,190,128,0.4)', color: 'rgba(82,190,128,0.9)', background: 'rgba(82,190,128,0.07)' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    const base = {
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      textTransform: 'uppercase',
      display: 'inline-block'
    };
    if (status === 'active') {
      return { ...base, border: '0.5px solid rgba(82,190,128,0.3)', color: '#52BE80', background: 'rgba(82,190,128,0.08)' };
    }
    if (status === 'pending') {
      return { ...base, border: '0.5px solid rgba(245,158,11,0.3)', color: '#f59e0b', background: 'rgba(245,158,11,0.07)' };
    }
    return { ...base, border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' };
  };

  // Pure inline styling variables
  const s = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'DM Sans, sans-serif',
      color: '#F2EDE6'
    },
    filterBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap'
    },
    searchContainer: {
      position: 'relative',
      flex: 1,
      minWidth: '200px',
      maxWidth: '280px'
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px 8px 30px',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(242,237,230,0.12)',
      borderRadius: '6px',
      color: '#F2EDE6',
      fontSize: '12px',
      fontFamily: 'DM Sans, sans-serif',
      outline: 'none',
      boxSizing: 'border-box'
    },
    searchIcon: {
      position: 'absolute',
      left: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'rgba(242,237,230,0.25)',
      pointerEvents: 'none'
    },
    filterPill: (active) => ({
      padding: '5px 12px',
      borderRadius: '100px',
      fontSize: '11px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: active ? '0.5px solid rgba(193,68,14,0.55)' : '0.5px solid rgba(242,237,230,0.1)',
      background: active ? 'rgba(193,68,14,0.1)' : 'transparent',
      color: active ? '#F2EDE6' : 'rgba(242,237,230,0.38)',
      fontFamily: 'DM Sans, sans-serif'
    }),
    tableContainer: {
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid rgba(242,237,230,0.07)',
      borderRadius: '10px',
      overflow: 'hidden'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '12px 14px',
      textAlign: 'left',
      fontSize: '10px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(242,237,230,0.28)',
      background: 'rgba(255,255,255,0.02)',
      borderBottom: '0.5px solid rgba(242,237,230,0.06)',
      fontWeight: 500
    },
    td: {
      padding: '12px 14px',
      fontSize: '12px',
      color: '#F2EDE6',
      borderBottom: '0.5px solid rgba(242,237,230,0.04)',
      verticalAlign: 'middle'
    },
    paginationRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 14px',
      borderTop: '0.5px solid rgba(242,237,230,0.06)',
      fontSize: '12px',
      color: 'rgba(242,237,230,0.35)'
    },
    paginationBtn: {
      padding: '6px 12px',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(242,237,230,0.1)',
      borderRadius: '4px',
      color: '#F2EDE6',
      cursor: 'pointer',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '11px',
      transition: 'all 0.2s'
    },
    formCard: {
      background: 'rgba(255,255,255,0.02)',
      border: '0.5px solid rgba(242,237,230,0.07)',
      borderRadius: '10px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    },
    formTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#F2EDE6',
      margin: 0,
      borderBottom: '0.5px solid rgba(242,237,230,0.07)',
      paddingBottom: '10px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    label: {
      fontSize: '11px',
      color: 'rgba(242,237,230,0.4)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      fontWeight: 700
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(242,237,230,0.15)',
      borderRadius: '6px',
      color: '#F2EDE6',
      fontSize: '13px',
      fontFamily: 'DM Sans, sans-serif',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(242,237,230,0.15)',
      borderRadius: '6px',
      color: '#F2EDE6',
      fontSize: '13px',
      fontFamily: 'DM Sans, sans-serif',
      outline: 'none',
      boxSizing: 'border-box',
      resize: 'none',
      transition: 'border-color 0.2s'
    },
    submitBtn: {
      alignSelf: 'flex-start',
      padding: '10px 24px',
      background: '#C1440E',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'background 0.2s',
      fontFamily: 'DM Sans, sans-serif'
    },
    recipientBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(193,68,14,0.08)',
      border: '0.5px solid rgba(193,68,14,0.25)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      color: '#E8B87A',
      width: 'fit-content'
    }
  };

  if (loading) {
    return <SkeletonTable rows={10} columns={5} />;
  }

  return (
    <div style={s.wrapper}>
      {/* SECTION 1 — Filters & Toolbar */}
      <div style={s.filterBar}>
        {/* Search */}
        <div style={s.searchContainer}>
          <svg style={s.searchIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={s.searchInput}
            placeholder="Chercher nom, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Role pills */}
        {[
          { label: 'Tous', value: '' },
          { label: 'Citoyens', value: 'citoyen' },
          { label: 'Urbanistes', value: 'urbaniste' },
          { label: 'Admins', value: 'admin' }
        ].map((pill, idx) => (
          <button
            key={idx}
            onClick={() => setRoleFilter(pill.value)}
            style={s.filterPill(roleFilter === pill.value)}
            onMouseEnter={e => {
              if (roleFilter !== pill.value) {
                e.currentTarget.style.borderColor = 'rgba(242,237,230,0.3)';
                e.currentTarget.style.color = '#F2EDE6';
              }
            }}
            onMouseLeave={e => {
              if (roleFilter !== pill.value) {
                e.currentTarget.style.borderColor = 'rgba(242,237,230,0.1)';
                e.currentTarget.style.color = 'rgba(242,237,230,0.38)';
              }
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div style={s.tableContainer}>
        {error ? (
          <EmptyState
            icon="❌"
            title="Erreur lors du chargement"
            subtitle={error}
            action={{ label: "Réessayer", onClick: fetchUsersData }}
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Aucun utilisateur"
            subtitle="Aucun utilisateur ne correspond aux critères de recherche."
          />
        ) : (
          <>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nom</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Rôle</th>
                  <th style={s.th}>Statut</th>
                  <th style={s.th}>Date d'inscription</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} style={{ transition: 'background 0.15s' }}>
                    <td style={{ ...s.td, fontWeight: '600' }}>{user.nom}</td>
                    <td style={s.td}>{user.email}</td>
                    <td style={s.td}>
                      <span style={getRoleBadgeStyle(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={getStatusBadgeStyle(user.statut)}>
                        {user.statut}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: 'rgba(242,237,230,0.4)', fontFamily: 'DM Mono, monospace' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={s.paginationRow}>
                <span>
                  Page {currentPage} sur {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    style={{ ...s.paginationBtn, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Précédent
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    style={{ ...s.paginationBtn, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SECTION 2 — Group Email Form */}
      <form onSubmit={handleSendEmail} style={s.formCard}>
        <h3 style={s.formTitle}>📧 Email de groupe</h3>
        
        {/* Recipients calculation badge */}
        <div style={s.recipientBadge}>
          🎯 Destinataires ciblés (actifs) : <strong>{estimatedRecipientsCount}</strong>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={s.formGroup}>
            <label style={s.label} htmlFor="email-group-select">Groupe cible</label>
            <select
              id="email-group-select"
              value={emailGroup}
              onChange={e => { setEmailGroup(e.target.value); setSelectedZoneId(''); }}
              style={s.input}
            >
              <option value="citoyen" style={{ background: '#0f0c09' }}>Tous les citoyens</option>
              <option value="urbaniste" style={{ background: '#0f0c09' }}>Tous les urbanistes</option>
              <option value="admin" style={{ background: '#0f0c09' }}>Tous les admins</option>
              <option value="all" style={{ background: '#0f0c09' }}>Tous les utilisateurs actifs</option>
              <option value="zone" style={{ background: '#0f0c09' }}>Citoyens d'une zone</option>
            </select>

            {/* Zone picker — shown only when 'zone' group is selected */}
            {emailGroup === 'zone' && (
              <select
                id="email-zone-select"
                value={selectedZoneId}
                onChange={e => setSelectedZoneId(e.target.value)}
                style={{ ...s.input, marginTop: '8px' }}
              >
                <option value="" style={{ background: '#0f0c09' }}>-- Choisir une zone --</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id} style={{ background: '#0f0c09' }}>
                    {zone.nom}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={s.formGroup}>
            <label style={s.label} htmlFor="email-subject-input">Objet de l'e-mail</label>
            <input
              id="email-subject-input"
              type="text"
              placeholder="Ex: Information importante sur les chantiers"
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              style={s.input}
              required
            />
          </div>
        </div>

        <div style={s.formGroup}>
          <label style={s.label} htmlFor="email-message-textarea">Corps du message</label>
          <textarea
            id="email-message-textarea"
            rows="5"
            placeholder="Rédigez votre message ici..."
            value={emailMessage}
            onChange={e => setEmailMessage(e.target.value)}
            style={s.textarea}
            required
          />
        </div>

        <button
          type="submit"
          disabled={sendingEmail}
          style={{ ...s.submitBtn, opacity: sendingEmail ? 0.7 : 1, cursor: sendingEmail ? 'not-allowed' : 'pointer' }}
          onMouseEnter={e => { if(!sendingEmail) e.currentTarget.style.background = '#A8380C' }}
          onMouseLeave={e => { if(!sendingEmail) e.currentTarget.style.background = '#C1440E' }}
        >
          {sendingEmail ? "Envoi en cours..." : "✉️ Envoyer"}
        </button>
      </form>
    </div>
  );
}
