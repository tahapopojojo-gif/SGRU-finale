import React from 'react';

export default function EmptyState({ icon, title, subtitle, action }) {
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#9CA3AF',
    minHeight: '300px'
  };

  const iconStyle = {
    fontSize: '64px',
    marginBottom: '16px'
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '8px'
  };

  const subtitleStyle = {
    fontSize: '14px',
    color: '#9CA3AF',
    marginBottom: '24px',
    maxWidth: '400px'
  };

  const actionButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#6366F1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  };

  return (
    <div style={containerStyle}>
      <div style={iconStyle} aria-hidden="true">{icon}</div>
      <h3 style={titleStyle}>{title}</h3>
      <p style={subtitleStyle}>{subtitle}</p>
      {action && (
        <button style={actionButtonStyle} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
