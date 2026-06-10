import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const icons = {
  success: <CheckCircle size={16} strokeWidth={1.8} />,
  error: <XCircle size={16} strokeWidth={1.8} />,
  info: <Info size={16} strokeWidth={1.8} />,
  warning: <AlertTriangle size={16} strokeWidth={1.8} />,
}

const colors = {
  success: { bg: 'rgba(8,6,3,0.96)', text: '#52BE80', border: 'rgba(82,190,128,0.25)', icon: '#52BE80' },
  error:   { bg: 'rgba(8,6,3,0.96)', text: '#ef4444', border: 'rgba(239,68,68,0.25)',  icon: '#ef4444' },
  info:    { bg: 'rgba(8,6,3,0.96)', text: '#E8B87A', border: 'rgba(232,184,122,0.25)', icon: '#E8B87A' },
  warning: { bg: 'rgba(8,6,3,0.96)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)', icon: '#f59e0b' },
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
    gap: '10px',
    padding: '12px 14px',
    background: style.bg,
    color: '#F2EDE6',
    border: `0.5px solid ${style.border}`,
    borderLeft: `2px solid ${style.icon}`,
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    width: '300px',
    marginBottom: '10px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    fontWeight: 400,
    lineHeight: 1.5,
    animation: isClosing
      ? 'toast-slide-out 0.3s ease forwards'
      : 'toast-slide-in 0.3s ease forwards',
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
        <span style={{ color: style.icon, flexShrink: 0, marginTop: '1px' }}>
          {icons[type]}
        </span>
        <div style={{ flex: 1, paddingTop: '2px', lineHeight: '1.4' }}>{message}</div>
        <button
          onClick={handleClose}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(242,237,230,0.3)',
            cursor: 'pointer', padding: 0,
            flexShrink: 0, marginTop: '1px',
            transition: 'color 0.15s',
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,237,230,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,237,230,0.3)'}
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      </div>
    </>
  )
}
