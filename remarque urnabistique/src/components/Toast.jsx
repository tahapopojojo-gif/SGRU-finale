import React, { useEffect, useState } from 'react'

const icons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️'
}

const colors = {
  success: { bg: '#DCFCE7', text: '#166534' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  info: { bg: '#DBEAFE', text: '#1E40AF' },
  warning: { bg: '#FEF9C3', text: '#854D0E' }
}

export default function Toast({ id, message, type, onClose, duration }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsClosing(true)
        setTimeout(onClose, 300) // Match exit animation
      }, duration - 300)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 300)
  }

  const style = colors[type] || colors.info

  const toastStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: style.bg,
    color: style.text,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    width: '320px',
    marginBottom: '12px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: '500',
    animation: isClosing ? 'toast-slide-out 0.3s ease forwards' : 'toast-slide-in 0.3s ease forwards'
  }

  return (
    <>
      <style>
        {`
          @keyframes toast-slide-in {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes toast-slide-out {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `}
      </style>
      <div style={toastStyle}>
        <span style={{ fontSize: '18px' }}>{icons[type]}</span>
        <div style={{ flex: 1, paddingTop: '2px', lineHeight: '1.4' }}>{message}</div>
        <button 
          onClick={handleClose} 
          style={{ 
            background: 'none', border: 'none', fontSize: '16px', 
            color: style.text, opacity: 0.5, cursor: 'pointer', padding: 0 
          }}
        >
          ✕
        </button>
      </div>
    </>
  )
}
