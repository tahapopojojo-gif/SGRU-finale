import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const styles = {
  wrapper: { background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', height: '400px', display: 'flex', flexDirection: 'column' },
  title: { fontSize: '18px', fontWeight: '800', margin: '0 0 15px 0', color: '#0f172a' },
  mapBox: { flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative', zIndex: 1 }
}

export default function HeatmapPanel({ remarques }) {
  // Calcul du centre approximatif
  let center = [31.7917, -7.0926] // Centre du Maroc par défaut
  if (remarques.length > 0 && remarques[0].positions) {
      center = remarques[0].positions[0]
  }

  // Filtrer les remarques qui ont des coordonnées valides
  const validRemarques = remarques.filter(r => r.positions && r.positions.length > 0)

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>🔥 Heatmap des Demandes (Densité Spatiale)</h3>
      <div style={styles.mapBox}>
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" 
            attribution="&copy; OpenStreetMap contributors &copy; CARTO" 
          />
          {validRemarques.map((r) => {
              // Plus il y a de votes ou plus c'est urgent, plus le point est grand/rouge
              const weight = (r.votes || 1) * (r.urgency || 2)
              const radius = Math.min(Math.max(weight * 2, 10), 40)
              const color = weight > 20 ? '#ef4444' : weight > 10 ? '#f59e0b' : '#3b82f6'

              return (
                <CircleMarker 
                    key={r.id} 
                    center={r.positions[0]} 
                    radius={radius}
                    pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.6 }}
                >
                    <Tooltip>{r.name || 'Zone'} - {r.building_type} ({weight} pts)</Tooltip>
                </CircleMarker>
              )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
