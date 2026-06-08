import React from 'react';

export function KpiGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px', marginBottom: '20px',
    }}>
      {children}
    </div>
  )
}

export function KpiCard({ label, value, sub, accent }) {
  const accents = {
    terra: '#C1440E',
    gold:  '#E8B87A',
    green: '#52BE80',
    red:   '#ef4444',
  }
  const color = accents[accent] || '#C1440E'
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px', padding: '16px',
      position: 'relative', overflow: 'hidden',
      transition: 'all 0.2s', cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(193,68,14,0.3)'
        e.currentTarget.style.background = 'rgba(193,68,14,0.04)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(242,237,230,0.08)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px', borderRadius: '10px 10px 0 0',
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }} />
      <div style={{
        fontSize: '10px', color: 'rgba(242,237,230,0.3)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: '8px',
      }}>{label}</div>
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '28px',
        color: '#E8B87A', fontWeight: 500, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: '11px', color: 'rgba(242,237,230,0.35)',
        marginTop: '5px',
      }}>{sub}</div>
    </div>
  )
}

export function UDCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px',
      backdropFilter: 'blur(8px)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function ChartWrap({ title, children, style }) {
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.03)',
      border: '0.5px solid rgba(242,237,230,0.08)',
      borderRadius: '10px',
      ...style,
    }}>
      {title && (
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: 'rgba(242,237,230,0.7)', marginBottom: '16px',
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}

export function BarRow({ label, value, percent, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: '10px', marginBottom: '9px',
    }}>
      <span style={{
        fontSize: '11px', color: 'rgba(242,237,230,0.4)',
        width: '72px', flexShrink: 0, textAlign: 'right',
      }}>{label}</span>
      <div style={{
        flex: 1, height: '6px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '3px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '3px',
          width: `${percent}%`,
          background: color || '#C1440E',
          transition: 'width 0.8s ease',
        }} />
      </div>
      <span style={{
        fontSize: '11px', fontFamily: 'DM Mono, monospace',
        color: 'rgba(242,237,230,0.4)',
        width: '32px', textAlign: 'right', flexShrink: 0,
      }}>{value}</span>
    </div>
  )
}

export function AiCard({ children, loading }) {
  return (
    <div style={{
      background: 'rgba(193,68,14,0.06)',
      border: '0.5px solid rgba(193,68,14,0.2)',
      borderRadius: '10px', padding: '14px',
      marginBottom: '16px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '10px', color: '#C1440E',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: '#C1440E', display: 'inline-block',
          animation: 'pulse 2s infinite',
        }} />
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'flex', gap: '3px' }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: '#C1440E',
                  animation: `dotpulse 1s infinite ${i*0.2}s`,
                  display: 'inline-block',
                }} />
              ))}
            </span>
            Gemini analyse...
          </span>
        ) : 'Synthèse IA — Gemini'}
      </div>
      <div style={{
        fontSize: '12px', color: 'rgba(242,237,230,0.6)',
        lineHeight: 1.6, fontStyle: 'italic',
      }}>
        {children}
      </div>
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: '10px', letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'rgba(242,237,230,0.22)', marginBottom: '12px',
    }}>
      {children}
    </div>
  )
}

export function UDDivider() {
  return (
    <div style={{
      height: '0.5px',
      background: 'rgba(242,237,230,0.06)',
      margin: '16px 0',
    }} />
  )
}

export function StatusBadge({ status }) {
  const configs = {
    en_attente: { label: '⏳ En attente',cls: 'rgba(245,158,11,0.4)', color: 'rgba(245,158,11,0.7)', bg: 'rgba(245,158,11,0.07)' },
    en_cours:   { label: '🔄 En cours',  cls: 'rgba(59,130,246,0.4)', color: 'rgba(59,130,246,0.7)', bg: 'rgba(59,130,246,0.07)' },
    resolu:     { label: '✓ Résolu',     cls: 'rgba(82,190,128,0.4)', color: 'rgba(82,190,128,0.8)', bg: 'rgba(82,190,128,0.07)' },
    rejete:     { label: '❌ Rejetée',   cls: 'rgba(239,68,68,0.4)',  color: 'rgba(239,68,68,0.7)',  bg: 'rgba(239,68,68,0.07)' },
  }
  const cfg = configs[status] || configs.en_cours
  return (
    <span style={{
      fontSize: '10px', padding: '2px 8px',
      borderRadius: '100px',
      border: `0.5px solid ${cfg.cls}`,
      color: cfg.color, background: cfg.bg,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
