import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import L from 'leaflet'
import 'leaflet-draw'

const styles = {
  container: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', minHeight: '500px' },
  mapWrapper: { borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '100%', position: 'relative' },
  map: { height: '100%', width: '100%' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '20px' },
  formBox: { background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' },
  title: { margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold', color: '#0f172a' },
  input: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '15px' },
  colorRow: { display: 'flex', gap: '10px', marginBottom: '15px' },
  colorBtn: { width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', border: '2px solid transparent' },
  saveBtn: { width: '100%', padding: '12px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  drawBtn: { width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' },
  listTitle: { margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold', color: '#334155' },
  zoneItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px' },
  deleteBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  searchBar: {
    position: 'absolute',
    top: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    gap: '8px',
    width: '80%',
    maxWidth: '400px'
  },
  searchInput: {
    flex: 1,
    padding: '10px 15px',
    borderRadius: '25px',
    border: '1px solid #cbd5e1',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    outline: 'none',
    fontSize: '14px'
  },
  searchBtn: {
    padding: '10px 20px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

function MapSearchHandler({ searchResult }) {
  const map = useMap();
  useEffect(() => {
    if (searchResult) {
      map.flyTo(searchResult, 16);
    }
  }, [searchResult, map]);
  return null;
}

function ZoneDrawManager({ isDrawing, onShapeCreated, color }) {
  const map = useMapEvents({})

  useEffect(() => {
    let drawer;
    if (isDrawing) {
        drawer = new L.Draw.Polygon(map, { 
            shapeOptions: { color: color, weight: 4, fillOpacity: 0.3 },
            showArea: false,
            allowIntersection: false,
            drawError: { color: '#ef4444', message: 'Intersection interdite' }
        })
        drawer.enable()
    }
    return () => { if (drawer) drawer.disable() }
  }, [isDrawing, map, color])

  useEffect(() => {
    const handleCreated = (e) => {
      if (e.layerType === 'polygon') {
         const layer = e.layer
         const latLngs = layer.getLatLngs()
         const ring = Array.isArray(latLngs[0]) ? latLngs[0] : latLngs
         const data = ring.map(ll => [ll.lat, ll.lng])
         onShapeCreated(data, layer)
      }
    }
    map.on('draw:created', handleCreated)
    return () => map.off('draw:created', handleCreated)
  }, [map, onShapeCreated])

  return null
}

export default function ZoneManagement() {
  const { user } = useAuth()
  const [zones, setZones] = useState([])
  const [drawnShape, setDrawnShape] = useState(null)
  const [form, setForm] = useState({ nom: '', couleur: COLORS[0] })
  const [isDrawing, setIsDrawing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)

  const adminCity = user?.city || 'marrakesh'

  const fetchZones = async () => {
    const res = await api.getZones(adminCity)
    setZones(res.data)
  }

  useEffect(() => { fetchZones() }, [adminCity])

  const handleSearch = async (e) => {
    if ((e.type === 'click' || e.key === 'Enter') && searchQuery.length > 2) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}, Maroc`)
        const data = await res.json()
        if (data.length > 0) {
          setSearchResult([parseFloat(data[0].lat), parseFloat(data[0].lon)])
        } else {
          alert('Adresse non trouvée')
        }
      } catch (err) {
        console.error('Search error:', err)
      }
    }
  }

  const handleShapeCreated = (data, layer) => {
    let latSum = 0, lngSum = 0
    data.forEach(ll => { latSum += ll[0]; lngSum += ll[1] })
    const centre = { lat: latSum / data.length, lng: lngSum / data.length }

    setDrawnShape({ coordonnees_geojson: data, centre, layer })
    setIsDrawing(false)
  }

  const handleDeleteShape = () => {
    if (drawnShape?.layer) {
      drawnShape.layer.remove()
    }
    setDrawnShape(null)
  }

  const handleSave = async () => {
    if (!drawnShape) return alert("Veuillez d'abord dessiner une zone sur la carte.")
    if (!form.nom.trim()) return alert("Veuillez donner un nom à la zone.")

    const newZone = {
        nom: form.nom,
        ville: adminCity,
        couleur: form.couleur,
        coordonnees_geojson: drawnShape.coordonnees_geojson,
        centre: drawnShape.centre
    }

    await api.addZone(newZone)
    setForm({ nom: '', couleur: COLORS[0] })
    handleDeleteShape()
    fetchZones()
  }

  const handleDeleteZone = async (id) => {
    if (window.confirm("Supprimer cette zone ?")) {
        await api.deleteZone(id)
        fetchZones()
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        <div style={styles.mapWrapper}>
          <div style={styles.searchBar}>
            <input 
              style={styles.searchInput}
              placeholder="Rechercher une adresse..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button style={styles.searchBtn} onClick={handleSearch}>🔍</button>
          </div>

          <MapContainer center={[31.6295, -8.0083]} zoom={13} style={styles.map}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            
            <MapSearchHandler searchResult={searchResult} />

            <ZoneDrawManager 
                isDrawing={isDrawing} 
                onShapeCreated={handleShapeCreated} 
                color={form.couleur} 
            />
            
            {zones.map(z => (
                <Polygon 
                    key={z.id}
                    positions={z.coordonnees_geojson}
                    pathOptions={{ color: z.couleur, fillColor: z.couleur, fillOpacity: 0.3 }}
                />
            ))}
          </MapContainer>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.formBox}>
            <h3 style={styles.title}>📌 Nouvelle Zone</h3>
            
            {!drawnShape && !isDrawing && (
                <button style={styles.drawBtn} onClick={() => setIsDrawing(true)}>
                    ✏️ Dessiner un polygone
                </button>
            )}

            {isDrawing && (
                <div style={{color: '#f59e0b', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold'}}>
                    ✏️ Dessinez sur la carte...
                    <button onClick={() => setIsDrawing(false)} style={{marginLeft: '10px', background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}>Annuler</button>
                </div>
            )}

            {drawnShape && (
                <div style={{color: '#10b981', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold'}}>
                    ✓ Forme dessinée
                    <button onClick={handleDeleteShape} style={{marginLeft: '10px', background:'none', border:'none', color:'#ef4444', cursor:'pointer'}}>Effacer</button>
                </div>
            )}
            
            <input 
                style={styles.input}
                type="text" 
                placeholder="Nom de la zone (ex: Gueliz)" 
                value={form.nom}
                onChange={e => setForm({...form, nom: e.target.value})}
            />
            
            <p style={{margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold'}}>Couleur</p>
            <div style={styles.colorRow}>
                {COLORS.map(c => (
                    <button 
                        key={c}
                        style={{...styles.colorBtn, background: c, borderColor: form.couleur === c ? '#0f172a' : 'transparent'}}
                        onClick={() => setForm({...form, couleur: c})}
                    />
                ))}
            </div>

            <button style={{...styles.saveBtn, opacity: drawnShape ? 1 : 0.5}} disabled={!drawnShape} onClick={handleSave}>Enregistrer la Zone</button>
          </div>

          <div>
            <h3 style={styles.listTitle}>Zones Officielles ({adminCity})</h3>
            {zones.map(z => (
                <div key={z.id} style={styles.zoneItem}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <div style={{width: '12px', height: '12px', borderRadius: '50%', background: z.couleur}}></div>
                        <span style={{fontWeight: 'bold', fontSize: '14px'}}>{z.nom}</span>
                    </div>
                    <button style={styles.deleteBtn} onClick={() => handleDeleteZone(z.id)}>Supprimer</button>
                </div>
            ))}
            {zones.length === 0 && <p style={{color: '#64748b', fontSize: '13px'}}>Aucune zone définie pour {adminCity}.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
