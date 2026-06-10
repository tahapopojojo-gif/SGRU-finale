import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Shield, Compass, Maximize2 } from 'lucide-react'

const R = '#C1440E', G = '#E8B87A', T = '#F2EDE6'
const amiri = { fontFamily:"'Amiri',serif" }
const dm    = { fontFamily:"'DM Sans',sans-serif" }
const muted = 'rgba(242,237,230,0.5)'

/* ─── tiny reusable hover helper ─── */
function HoverDiv({ base, hover, className='', children, style={}, ...rest }) {
  const [on, set] = [false, (v)=>null]
  return (
    <div
      {...rest}
      className={className}
      style={{ ...base, ...style, transition:'all .18s ease' }}
      onMouseEnter={e=>{ Object.assign(e.currentTarget.style, hover) }}
      onMouseLeave={e=>{ Object.assign(e.currentTarget.style, base) }}
    >{children}</div>
  )
}

/* ─── NAVBAR ─── */
function Navbar() {
  const navLinkStyle = { color:'rgba(242,237,230,0.65)', textTransform:'uppercase', fontSize:11,
    letterSpacing:'0.12em', cursor:'pointer', ...dm, textDecoration:'none', transition:'color .15s' }
  return (
    <nav style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center',
      justifyContent:'space-between', padding:'0 48px', height:64,
      background:'rgba(14,11,8,0.9)', backdropFilter:'blur(12px)',
      borderBottom:'0.5px solid rgba(193,68,14,0.25)' }}>

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:R,
          animation:'pulse 2s infinite', flexShrink:0 }} />
        <span style={{ ...amiri, color:G, fontSize:20 }}>
          UrbanMap
          <span style={{ color:'rgba(242,237,230,0.25)', margin:'0 8px' }}>|</span>
          المغرب
        </span>
      </div>

      {/* Links */}
      <div style={{ display:'flex', gap:36 }}>
        <Link to="/map" style={navLinkStyle}
          onMouseEnter={e=>e.target.style.color=G}
          onMouseLeave={e=>e.target.style.color='rgba(242,237,230,0.65)'}>Carte Publique</Link>
        <a href="#comment-ca-fonctionne" style={navLinkStyle}
          onMouseEnter={e=>e.target.style.color=G}
          onMouseLeave={e=>e.target.style.color='rgba(242,237,230,0.65)'}>
          Signaler
        </a>
        <a href="#villes" style={navLinkStyle}
          onMouseEnter={e=>e.target.style.color=G}
          onMouseLeave={e=>e.target.style.color='rgba(242,237,230,0.65)'}>
          Villes
        </a>
        <a href="#a-propos" style={navLinkStyle}
          onMouseEnter={e=>e.target.style.color=G}
          onMouseLeave={e=>e.target.style.color='rgba(242,237,230,0.65)'}>
          À propos
        </a>
      </div>

      {/* CTA */}
      <div style={{ display:'flex', gap:12 }}>
        <Link to="/login" style={{ border:'0.5px solid rgba(242,237,230,0.3)', background:'transparent',
          color:T, padding:'8px 20px', borderRadius:6, fontSize:13, ...dm, textDecoration:'none' }}>
          Connexion
        </Link>
        <Link to="/register" style={{
          background:'transparent',
          color:'#C1440E',
          border:'0.5px solid #C1440E',
          padding:'8px 20px',
          borderRadius:6,
          fontSize:13,
          fontFamily:"'DM Sans',sans-serif",
          textDecoration:'none',
          fontWeight:500,
          transition:'all .15s',
        }}
          onMouseEnter={e=>{
            e.currentTarget.style.background='#C1440E'
            e.currentTarget.style.color='#fff'
          }}
          onMouseLeave={e=>{
            e.currentTarget.style.background='transparent'
            e.currentTarget.style.color='#C1440E'
          }}>
          Commencer →
        </Link>
      </div>
    </nav>
  )
}

/* ─── MAP SVG ─── */
function MapSVG() {
  const zones=[
    {pts:'80,80 200,65 230,160 90,175',fill:'rgba(193,68,14,0.25)',stroke:'#C1440E',label:'Guéliz',lx:140,ly:120},
    {pts:'240,90 350,80 370,200 220,210',fill:'rgba(26,82,118,0.25)',stroke:'#5DADE2',label:'Médina',lx:290,ly:145},
    {pts:'100,200 220,190 210,300 85,310',fill:'rgba(232,184,122,0.18)',stroke:'#E8B87A',label:'Hivernage',lx:148,ly:252},
    {pts:'330,220 450,200 470,320 310,340',fill:'rgba(82,190,128,0.18)',stroke:'#52BE80',label:'Palmeraie',lx:385,ly:272},
  ]
  const markers=[[165,120],[290,155],[155,260],[380,260],[120,280],[340,140]]
  const hLines=[60,120,180,240,300,360]; const vLines=[65,130,195,260,325,390,455]
  return (
    <svg viewBox="0 0 520 390" width="100%" height="100%" style={{display:'block'}}>
      <rect width="520" height="390" fill="#0A0806"/>
      {hLines.map(y=><line key={y} x1="0" y1={y} x2="520" y2={y} stroke="#1C1710" strokeWidth="0.5"/>)}
      {vLines.map(x=><line key={x} x1={x} y1="0" x2={x} y2="390" stroke="#1C1710" strokeWidth="0.5"/>)}
      {zones.map(z=>(
        <g key={z.label}>
          <polygon points={z.pts} fill={z.fill} stroke={z.stroke} strokeWidth="1.2"/>
          <text x={z.lx} y={z.ly} fill={z.stroke} fontSize="9.5" fontFamily="DM Sans,sans-serif" textAnchor="middle" fontWeight="500">{z.label}</text>
        </g>
      ))}
      {markers.map(([cx,cy],i)=>(
        <g key={i}>
          <circle cx={cx} cy={cy} r="9" fill="rgba(193,68,14,0.12)" stroke="rgba(193,68,14,0.35)" strokeWidth="1"/>
          <circle cx={cx} cy={cy} r="3" fill={R}/>
        </g>
      ))}
      <circle cx="484" cy="28" r="15" fill="rgba(10,8,6,0.85)" stroke="rgba(232,184,122,0.3)" strokeWidth="0.5"/>
      <text x="484" y="33" fill={G} fontSize="11" fontFamily="DM Sans,sans-serif" textAnchor="middle" fontWeight="700">N</text>
      <line x1="20" y1="364" x2="80" y2="364" stroke="rgba(242,237,230,0.25)" strokeWidth="1.5"/>
      <text x="50" y="376" fill="rgba(242,237,230,0.3)" fontSize="8" fontFamily="DM Sans,sans-serif" textAnchor="middle">500 m</text>
    </svg>
  )
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section style={{ position:'relative', zIndex:10 }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'112px 48px',
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>

        {/* Left */}
        <div>
          <span style={{ display:'inline-flex', alignItems:'center', border:'0.5px solid rgba(193,68,14,0.4)',
            background:'rgba(193,68,14,0.08)', borderRadius:999, padding:'6px 16px',
            color:R, fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase',
            marginBottom:28, ...dm }}>
            ● Plateforme citoyenne · IA intégrée
          </span>

          <h1 style={{ ...amiri, fontSize:64, color:T, lineHeight:1.12, marginBottom:16 }}>
            La ville,<br/>redessinée<br/>par <span style={{color:R}}>vous.</span>
          </h1>

          <p style={{ ...dm, fontSize:15, color:'rgba(242,237,230,0.6)', maxWidth:420,
            lineHeight:1.7, fontWeight:300, marginBottom:40 }}>
            Participez à l'aménagement urbain du Maroc. Signalez, analysez, et planifiez — ensemble, avec l'intelligence artificielle.
          </p>

          <div style={{ display:'flex', gap:16 }}>
            <Link to="/register" style={{
              background:'transparent',
              color:'#C1440E',
              border:'0.5px solid #C1440E',
              padding:'14px 32px',
              borderRadius:7,
              fontSize:13,
              fontWeight:500,
              textDecoration:'none',
              fontFamily:"'DM Sans',sans-serif",
              transition:'all .18s',
              display:'inline-block',
            }}
              onMouseEnter={e=>{
                e.currentTarget.style.background='#C1440E'
                e.currentTarget.style.color='#fff'
                e.currentTarget.style.transform='translateY(-2px)'
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background='transparent'
                e.currentTarget.style.color='#C1440E'
                e.currentTarget.style.transform='translateY(0)'
              }}>
              Soumettre un signalement
            </Link>
            <Link to="/map" style={{ border:'0.5px solid rgba(242,237,230,0.35)', background:'transparent',
              color:T, padding:'14px 32px', borderRadius:7, fontSize:13, textDecoration:'none',
              ...dm, display:'inline-flex', alignItems:'center', gap:8, transition:'all .18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(242,237,230,0.7)'; e.currentTarget.style.transform='translateY(-2px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(242,237,230,0.35)'; e.currentTarget.style.transform='translateY(0)' }}>
              <span style={{color:R}}>●</span> Explorer la carte
            </Link>
          </div>
        </div>

        {/* Right — map card */}
        <div style={{ borderRadius:12, overflow:'hidden',
          border:'0.5px solid rgba(193,68,14,0.3)', background:'#100D0A',
          aspectRatio:'4/3', position:'relative' }}>
          <MapSVG/>
          <div style={{ position:'absolute', bottom:16, left:16, right:16,
            display:'flex', gap:8 }}>
            {[{dot:R,label:'12 signalements actifs'},{dot:'#52BE80',label:'4 zones analysées'}].map(({dot,label})=>(
              <span key={label} style={{ display:'flex', alignItems:'center', gap:6,
                background:'rgba(14,11,8,0.9)', border:'0.5px solid rgba(193,68,14,0.4)',
                borderRadius:6, padding:'6px 12px', fontSize:11, color:'rgba(242,237,230,0.8)', ...dm }}>
                <span style={{color:dot,fontSize:8}}>●</span>{label}
              </span>
            ))}
            <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6,
              background:'rgba(14,11,8,0.9)', border:'0.5px solid rgba(193,68,14,0.4)',
              borderRadius:6, padding:'6px 12px', fontSize:11, color:'rgba(242,237,230,0.8)',
              cursor:'pointer', ...dm }}>
              <Maximize2 size={11} style={{flexShrink:0}} /> Plein écran</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── STATS BAR ─── */
function StatsBar() {
  const [data, setData] = useState({
    citoyens: '—',
    signalements: '—',
    zones: '—',
    villes: '—',
  })

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/public-stats`)
      .then(r => r.json())
      .then(d => setData({
        citoyens:     d.citoyens?.toLocaleString('fr-FR') || '—',
        signalements: d.signalements?.toLocaleString('fr-FR') || '—',
        zones:        d.zones?.toLocaleString('fr-FR') || '—',
        villes:       d.villes?.toLocaleString('fr-FR') || '—',
      }))
      .catch(() => {})
  }, [])

  const stats = [
    { n: data.villes,       l: 'Villes actives' },
    { n: data.citoyens,     l: 'Citoyens engagés' },
    { n: data.signalements, l: 'Signalements traités' },
    { n: '94%',             l: 'Modération par IA' },
    { n: data.zones,        l: 'Zones cartographiées' },
  ]

  return (
    <div style={{
      borderTop:'1px solid rgba(242,237,230,0.08)',
      borderBottom:'1px solid rgba(242,237,230,0.08)'
    }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'32px 48px',
        display:'flex' }}>
        {stats.map(({n,l},i)=>(
          <div key={l} style={{ flex:1, textAlign:'center', padding:'0 24px',
            borderRight: i<stats.length-1
              ? '1px solid rgba(242,237,230,0.1)' : 'none' }}>
            <div style={{ fontFamily:"'Amiri',serif", fontSize:38,
              color:'#E8B87A' }}>{n}</div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10,
              letterSpacing:'0.12em', textTransform:'uppercase',
              color:'rgba(242,237,230,0.4)', marginTop:6 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  const steps=[
    {n:'01',t:'Signalez sur la carte',d:'Localisez précisément votre observation, ajoutez une photo et décrivez le problème en 5 étapes guidées.'},
    {n:'02',t:"L'IA modère & résume",d:"Claude analyse chaque soumission, filtre le contenu inapproprié et génère un résumé structuré automatiquement."},
    {n:'03',t:"L'urbaniste analyse",d:"Les professionnels consultent les heatmaps, ajoutent des annotations privées et exportent des rapports PDF."},
    {n:'04',t:'La ville agit',d:"L'admin valide les signalements, planifie les interventions et notifie les citoyens de l'avancement."},
  ]
  return (
    <section id="comment-ca-fonctionne" style={{ position:'relative', zIndex:10 }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'96px 48px' }}>
        <p style={{ ...dm, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:R, marginBottom:16 }}>
          Comment ça fonctionne
        </p>
        <h2 style={{ ...amiri, fontSize:42, color:T, lineHeight:1.2, maxWidth:520, marginBottom:16 }}>
          De l'observation à l'action urbaine
        </h2>
        <p style={{ ...dm, fontSize:13, color:'rgba(242,237,230,0.5)', maxWidth:460,
          lineHeight:1.75, fontWeight:300, marginBottom:56 }}>
          Un flux simplifié pour transformer chaque signalement citoyen en décision d'aménagement concrète.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
          {steps.map(({n,t,d})=>(
            <div key={n}
              style={{ background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(242,237,230,0.09)',
                borderRadius:10, padding:28, cursor:'default', transition:'all .18s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(193,68,14,0.45)'; e.currentTarget.style.background='rgba(193,68,14,0.06)'; e.currentTarget.style.transform='translateY(-3px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(242,237,230,0.09)'; e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.transform='translateY(0)' }}>
              <div style={{ ...amiri, fontSize:40, color:'rgba(193,68,14,0.28)', marginBottom:16 }}>{n}</div>
              <div style={{ ...dm, fontSize:13, fontWeight:500, color:T, marginBottom:8 }}>{t}</div>
              <div style={{ ...dm, fontSize:12, color:'rgba(242,237,230,0.42)', lineHeight:1.7, fontWeight:300 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── ROLES ─── */
function Roles() {
  const roles=[
    {bg:'rgba(193,68,14,0.15)',ic:'#C1440E',Icon:User,name:'Citoyen',desc:"Signalez des problèmes urbains géolocalisés et suivez leur statut en temps réel.",tag:'Accès public',to:'/register'},
    {bg:'rgba(26,82,118,0.25)',ic:'#5DADE2',Icon:Shield,name:'Administrateur',desc:"Gérez les zones, modérez les signalements et administrez le territoire assigné.",tag:'Accès restreint',to:null},
    {bg:'rgba(232,184,122,0.15)',ic:'#E8B87A',Icon:Compass,name:'Urbaniste',desc:"Analysez les heatmaps, synthétisez les données IA et générez des rapports professionnels.",tag:'Professionnel',to:null},
  ]
  const cardBase={ background:'transparent', border:'0.5px solid rgba(242,237,230,0.1)',
    borderRadius:10, padding:28, cursor:'pointer', transition:'all .18s' }
  return (
    <section style={{ background:'rgba(255,255,255,0.015)',
      borderTop:'1px solid rgba(242,237,230,0.06)', borderBottom:'1px solid rgba(242,237,230,0.06)' }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'80px 48px' }}>
        <p style={{ ...dm, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:R, marginBottom:16 }}>Accès par rôle</p>
        <h2 style={{ ...amiri, fontSize:42, color:T }}>Un outil pour chaque acteur de la ville</h2>
        <div style={{ display:'grid',           gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:48 }}>
          {roles.map(({bg,ic,Icon,name,desc,tag,to})=>{
            const card=(
              <div style={cardBase}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(193,68,14,0.5)'; e.currentTarget.style.background='rgba(193,68,14,0.06)'; e.currentTarget.style.transform='translateY(-3px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='rgba(242,237,230,0.1)'; e.currentTarget.style.background='transparent'; e.currentTarget.style.transform='translateY(0)' }}>
                <div style={{ width:44, height:44, borderRadius:8, background:bg,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  marginBottom:20 }}>
                  <Icon size={20} strokeWidth={1.5} color={ic} />
                </div>
                <div style={{ ...dm, fontSize:13, fontWeight:500, color:T, marginBottom:8 }}>{name}</div>
                <div style={{ ...dm, fontSize:12, color:'rgba(242,237,230,0.42)', lineHeight:1.7, fontWeight:300 }}>{desc}</div>
                <span style={{ marginTop:16, display:'inline-block', ...dm, fontSize:10,
                  letterSpacing:'0.1em', textTransform:'uppercase',
                  border:'0.5px solid rgba(242,237,230,0.15)', borderRadius:999,
                  padding:'4px 10px', color:'rgba(242,237,230,0.4)' }}>{tag}</span>
              </div>
            )
            return to
              ? <Link key={name} to={to} style={{textDecoration:'none'}}>{card}</Link>
              : <div key={name}>{card}</div>
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── AI BANNER ─── */
function AIBanner() {
  const features=['Modération automatique','Résumé par zone','Analyse de sentiment','Rapport PDF intelligent',"Détection d'urgence"]
  return (
    <section style={{ position:'relative', zIndex:10 }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'96px 48px' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(193,68,14,0.13) 0%,rgba(26,82,118,0.13) 100%)',
          border:'0.5px solid rgba(193,68,14,0.38)', borderRadius:14, padding:'64px',
          display:'grid', gridTemplateColumns:'1fr auto', gap:40, alignItems:'center' }}>
          <div>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6,
              background:'rgba(193,68,14,0.15)', border:'0.5px solid rgba(193,68,14,0.4)',
              borderRadius:999, padding:'4px 14px', fontSize:10, letterSpacing:'0.12em',
              textTransform:'uppercase', color:R, marginBottom:20, ...dm }}>
              ● Intelligence Artificielle · Claude API
            </span>
            <h2 style={{ ...amiri, fontSize:38, color:T, lineHeight:1.22, marginBottom:14 }}>
              L'IA au service<br/>de la ville marocaine
            </h2>
            <p style={{ ...dm, fontSize:14, color:'rgba(242,237,230,0.55)', lineHeight:1.75,
              maxWidth:540, fontWeight:300 }}>
              Chaque signalement est analysé automatiquement par Claude — modération, résumé, et synthèse de zone.
              Les urbanistes disposent d'une vue agrégée et intelligente de chaque quartier.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:210 }}>
            {features.map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:10,
                fontSize:13, color:'rgba(242,237,230,0.72)', ...dm }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:R, flexShrink:0 }}/>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── CITIES ─── */
function Cities() {
  const cities=[
    {name:'Marrakech',count:'18 zones · 542 signalements',barColor:R,barW:'85%',pct:'85%',fes:false},
    {name:'Casablanca',count:'12 zones · 389 signalements',barColor:'#1A5276',barW:'60%',pct:'60%',fes:false},
    {name:'Rabat',count:'8 zones · 198 signalements',barColor:G,barW:'38%',pct:'38%',fes:false},
    {name:'Fès · Bientôt',count:'En préparation',barColor:'rgba(242,237,230,0.1)',barW:'15%',pct:'—',fes:true},
  ]
  return (
    <section id="villes" style={{ background:'rgba(255,255,255,0.015)', borderTop:'1px solid rgba(242,237,230,0.06)' }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'80px 48px' }}>
        <p style={{ ...dm, fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:R, marginBottom:16 }}>Villes actives</p>
        <h2 style={{ ...amiri, fontSize:42, color:T }}>Disponible à travers le Maroc</h2>
        <div style={{ display:'flex', gap:16, marginTop:40 }}>
          {cities.map(({name,count,barColor,barW,pct,fes})=>(
            <div key={name} style={{
              flex:1, borderRadius:10,
              border: fes ? '0.5px dashed rgba(242,237,230,0.12)' : '0.5px solid rgba(242,237,230,0.1)',
              background:'rgba(255,255,255,0.02)', padding:28,
              opacity: fes ? 0.5 : 1, cursor: fes ? 'default' : 'pointer', transition:'all .18s' }}
              onMouseEnter={e=>{ if(!fes){ e.currentTarget.style.borderColor='rgba(193,68,14,0.4)'; e.currentTarget.style.transform='translateY(-3px)' }}}
              onMouseLeave={e=>{ if(!fes){ e.currentTarget.style.borderColor='rgba(242,237,230,0.1)'; e.currentTarget.style.transform='translateY(0)' }}}>
              <div style={{ ...amiri, fontSize:22, color: fes ? 'rgba(242,237,230,0.3)' : T, marginBottom:4 }}>{name}</div>
              <div style={{ ...dm, fontSize:11, color:'rgba(242,237,230,0.4)', marginBottom:20 }}>{count}</div>
              <div style={{ height:3, background:'rgba(242,237,230,0.06)', borderRadius:3, marginBottom:8 }}>
                <div style={{ height:'100%', width:barW, background:barColor, borderRadius:3 }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(242,237,230,0.35)', ...dm }}>
                <span>{fes ? 'Lancement Q3 2026' : 'Activité'}</span><span>{pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── FOOTER ─── */
function Footer() {
  return (
    <footer id="a-propos" style={{ borderTop:'1px solid rgba(242,237,230,0.08)' }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'48px 48px',
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ ...amiri, fontSize:18, color:G }}>UrbanMap المغرب</span>
        <div style={{ display:'flex', gap:24 }}>
          {['Documentation API','Confidentialité','Contact'].map(l=>(
            <span key={l} style={{ ...dm, fontSize:12, color:'rgba(242,237,230,0.35)', cursor:'pointer', transition:'color .15s' }}
              onMouseEnter={e=>e.target.style.color='rgba(242,237,230,0.7)'}
              onMouseLeave={e=>e.target.style.color='rgba(242,237,230,0.35)'}>{l}</span>
          ))}
        </div>
        <span style={{ ...dm, fontSize:11, color:'rgba(242,237,230,0.22)' }}>© 2026 UrbanMap Maroc. Tous droits réservés.</span>
      </div>
    </footer>
  )
}

/* ─── PAGE ROOT ─── */
export default function HomePage() {
  return (
    <div style={{ background:'#0E0B08', color:T, minHeight:'100vh', overflowX:'hidden', scrollBehavior:'smooth', ...dm }}>
      {/* Zellige bg */}
      <div style={{ position:'fixed', inset:0, opacity:0.03, pointerEvents:'none', zIndex:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23F2EDE6' stroke-width='0.5'%3E%3Cpolygon points='30,2 58,16 58,44 30,58 2,44 2,16'/%3E%3Cpolygon points='30,10 50,20 50,40 30,50 10,40 10,20'/%3E%3Cline x1='30' y1='2' x2='30' y2='10'/%3E%3Cline x1='58' y1='16' x2='50' y2='20'/%3E%3Cline x1='58' y1='44' x2='50' y2='40'/%3E%3Cline x1='30' y1='58' x2='30' y2='50'/%3E%3Cline x1='2' y1='44' x2='10' y2='40'/%3E%3Cline x1='2' y1='16' x2='10' y2='20'/%3E%3C/g%3E%3C/svg%3E")`
      }}/>
      <Navbar/>
      <Hero/>
      <StatsBar/>
      <HowItWorks/>
      <Roles/>
      <AIBanner/>
      <Cities/>
      <Footer/>
    </div>
  )
}
