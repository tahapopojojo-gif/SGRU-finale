import { useState, useEffect } from 'react'
import { analyzeOpinion } from '../services/aiService'

const formStyles = {
  wrapper: { padding: '0' },

  progressOuter: {
    display: 'flex', gap: '8px', marginBottom: '10px',
    justifyContent: 'center', alignItems: 'center',
  },

  stepLabel: {
    fontSize: '10px', color: 'rgba(242,237,230,0.22)',
    textAlign: 'right', marginBottom: '14px',
  },

  question: {
    fontSize: '14px', fontWeight: 500,
    color: '#F2EDE6', marginBottom: '12px', lineHeight: 1.5,
  },

  subQuestion: {
    fontSize: '12px', fontWeight: 500,
    color: 'rgba(242,237,230,0.5)',
    margin: '14px 0 8px',
  },

  grid2: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
    marginBottom: '12px',
  },
  grid1: {
    display: 'grid', gridTemplateColumns: '1fr', gap: '6px',
  },

  optionBtn: {
    padding: '9px 10px',
    border: '0.5px solid rgba(242,237,230,0.09)',
    borderRadius: '6px', background: 'transparent',
    fontSize: '12px', color: 'rgba(242,237,230,0.55)',
    fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '6px',
  },
  optionBtnActive: {
    borderColor: '#C1440E',
    background: 'rgba(193,68,14,0.12)',
    color: '#F2EDE6',
  },

  textarea: {
    width: '100%', padding: '9px 11px',
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(242,237,230,0.11)',
    borderRadius: '6px', color: '#F2EDE6',
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    outline: 'none', resize: 'none',
    transition: 'border-color 0.2s', marginBottom: '4px',
    boxSizing: 'border-box',
  },

  urgencyRow: {
    display: 'flex', justifyContent: 'center',
    gap: '8px', margin: '10px 0 12px',
  },
  urgencyBtn: {
    width: '36px', height: '36px',
    fontSize: '14px', fontWeight: 600,
    background: 'rgba(255,255,255,0.04)',
    border: '0.5px solid rgba(242,237,230,0.11)',
    borderRadius: '6px',
    cursor: 'pointer', opacity: 0.35, transition: 'all 0.2s',
    color: '#E8B87A',
  },
  urgencyBtnActive: {
    opacity: 1,
    borderColor: '#C1440E',
    background: 'rgba(193,68,14,0.12)',
    transform: 'scale(1.05)',
  },
  urgencyLabel: {
    textAlign: 'center', fontWeight: 500,
    color: 'rgba(242,237,230,0.45)',
    fontSize: '12px', marginBottom: '12px',
    fontStyle: 'italic', minHeight: '18px',
  },

  navRow: {
    display: 'flex', gap: '8px', marginTop: '20px',
  },
  backBtn: {
    padding: '9px 14px', borderRadius: '6px',
    background: 'transparent',
    border: '0.5px solid rgba(242,237,230,0.11)',
    color: 'rgba(242,237,230,0.38)',
    fontSize: '12px', fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
  },
  nextBtn: {
    flex: 1, padding: '9px', borderRadius: '6px',
    background: '#C1440E', color: '#fff', border: 'none',
    fontSize: '13px', fontWeight: 500,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  submitBtn: {
    flex: 1, padding: '9px', borderRadius: '6px',
    background: '#C1440E', color: '#fff', border: 'none',
    fontSize: '13px', fontWeight: 500,
    fontFamily: 'DM Sans, sans-serif',
    cursor: 'pointer', transition: 'all 0.2s',
  },

  error: {
    color: 'rgba(252,165,165,0.9)', fontSize: '12px',
    marginTop: '10px', textAlign: 'center', fontWeight: 500,
  },
  hint: {
    fontSize: '11px', color: 'rgba(242,237,230,0.28)',
    fontWeight: 300,
  },

  addressBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(193,68,14,0.07)',
    border: '0.5px solid rgba(193,68,14,0.2)',
    borderRadius: '6px', padding: '9px 12px',
    marginBottom: '14px',
  },
  addressIcon: { fontSize: '14px' },
  addressText: {
    fontSize: '11px', color: 'rgba(242,237,230,0.45)',
    lineHeight: 1.5,
  },

  uploadArea: {
    border: '0.5px dashed rgba(242,237,230,0.13)',
    borderRadius: '6px', padding: '16px',
    textAlign: 'center', cursor: 'pointer',
    marginTop: '10px', transition: 'all 0.2s',
  },
  uploadIcon: {
    fontSize: '18px', display: 'block', marginBottom: '4px',
  },
  uploadText: {
    fontSize: '11px', color: 'rgba(242,237,230,0.28)',
  },
  imagePreview: {
    width: '100%', height: '100px',
    objectFit: 'cover', borderRadius: '6px', marginTop: '8px',
  },
}

const PROBLEM_TYPES = [
  { value: 'road', label: 'Route ou trottoir' },
  { value: 'lighting', label: 'Éclairage public' },
  { value: 'waste', label: 'Déchets et propreté' },
  { value: 'water', label: 'Eau ou drainage' },
  { value: 'parks', label: 'Parcs et espaces verts' },
  { value: 'schools', label: 'Écoles ou bâtiments publics' },
  { value: 'transport', label: 'Transports en commun' },
  { value: 'other', label: 'Autre' },
]

const URGENCY_LABELS = {
  1: 'Gêne mineure',
  2: 'Gênant mais gérable',
  3: 'Problème important',
  4: 'Dangereux',
  5: 'Urgence, action immédiate requise',
}

const PROBLEM_DURATION = [
  { value: 'days', label: "Vient d'apparaître (quelques jours)" },
  { value: 'months', label: 'Quelques mois' },
  { value: 'year', label: "Plus d'un an" },
  { value: 'always', label: "Aussi longtemps que je m'en souvienne" },
]

export default function FeedbackForm({ parcel, onSubmit, onClose }) {
  const [step, setStep] = useState(1)
  const totalSteps = 2
  const [address, setAddress] = useState("Chargement de l'adresse...")
  const [form, setForm] = useState({
    problem_type: '',
    urgency: 0,
    duration: '',
    opinion: '',
    photo: null,
    photoFile: null,
  });
  const [opinionCharCount, setOpinionCharCount] = useState(0);
  const [error, setError] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  useEffect(() => {
    if (parcel && parcel.positions.length > 0) {
      const [lat, lng] = parcel.positions[0]
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          const addr = data.display_name || 'Adresse inconnue'
          setAddress(addr.split(',').slice(0, 3).join(','))
        })
        .catch(() => setAddress('Localisation sur la carte'))
    }
  }, [parcel])

  const handleOpinionChange = (e) => {
    const text = e.target.value;
    if (text.length <= 300) {
      setForm({ ...form, opinion: text });
      setOpinionCharCount(text.length);
    }
  };

  const canNext = () => {
    if (step === 1) return form.problem_type !== '' && form.urgency > 0 && form.duration !== '';
    if (step === 2) {
      if (form.problem_type === 'other' && !form.opinion.trim()) return false;
      return true;
    }
    return true;
  }

  const handleNext = () => {
    if (step === 1 && form.problem_type === '') {
      setError('Veuillez sélectionner un type de problème');
      return;
    }
    if (step === 1 && form.urgency === 0) {
      setError("Veuillez indiquer le niveau d'urgence");
      return;
    }
    if (step === 1 && form.duration === '') {
      setError("Veuillez indiquer depuis combien de temps le problème existe");
      return;
    }
    if (step === 2 && form.opinion.length > 300) {
      setError('Description trop longue (300 caractères max)');
      return;
    }
    if (step === 2 && form.problem_type === 'other' && !form.opinion.trim()) {
      setError('Veuillez décrire le problème puisque vous avez sélectionné "Autre"');
      return;
    }
    setError('');
    setStep(step + 1);
  }

  const handleSubmit = async () => {
    const opinionText = form.opinion?.trim() || null
    let finalOpinion = null
    let opinionAiValidated = false

    if (opinionText) {
      setIsAiLoading(true)
      try {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ relevant: true, reason: 'timeout', cleaned_text: opinionText }), 8000)
        )
        const result = await Promise.race([analyzeOpinion(opinionText), timeoutPromise])

        if (result.relevant === true) {
          finalOpinion = result.cleaned_text || opinionText
          opinionAiValidated = true
        } else {
          finalOpinion = null
          opinionAiValidated = false
        }
      } catch (err) {
        console.error('AI analysis error:', err)
        finalOpinion = opinionText
        opinionAiValidated = true
      } finally {
        setIsAiLoading(false)
      }
    }

    const problemLabel = PROBLEM_TYPES.find(p => p.value === form.problem_type)?.label || form.problem_type

    onSubmit({
      ...form,
      opinion: finalOpinion || form.opinion || 'Signalement soumis sans description',
      opinion_ai_validated: opinionAiValidated,
      opinion_ai_summary: null,
      problem_label: problemLabel,
    })
  }

  return (
    <div style={formStyles.wrapper}>
      <div style={formStyles.addressBox}>
        <span style={{ ...formStyles.addressIcon, display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          <svg width="13" height="16" viewBox="0 0 13 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.5 0C2.91 0 0 2.91 0 6.5C0 10.85 6.5 16 6.5 16C6.5 16 13 10.85 13 6.5C13 2.91 10.09 0 6.5 0ZM6.5 8.75C5.26 8.75 4.25 7.74 4.25 6.5C4.25 5.26 5.26 4.25 6.5 4.25C7.74 4.25 8.75 5.26 8.75 6.5C8.75 7.74 7.74 8.75 6.5 8.75Z" fill="#C1440E"/>
          </svg>
        </span>
        <span style={formStyles.addressText}>{address}</span>
      </div>

      <div
        style={formStyles.progressOuter}
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Étape ${step} sur ${totalSteps}`}
      >
        {[1, 2].map((sIndex) => (
          <div
            key={sIndex}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: step > sIndex
                ? '#C1440E'
                : step === sIndex
                  ? 'rgba(193,68,14,0.55)'
                  : 'rgba(242,237,230,0.07)',
              transition: 'background 0.3s, transform 0.3s',
              transform: step === sIndex ? 'scale(1.2)' : 'scale(1)',
            }}
          />
        ))}
      </div>
      <p style={formStyles.stepLabel} aria-live="polite" aria-atomic="true">Étape {step}/{totalSteps}</p>

      {step === 1 && (
        <div>
          <p style={{ ...formStyles.subQuestion, marginTop: 0, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E8B87A' }}>
            Le problème
          </p>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={formStyles.question}>Quel type de problème est-ce ? <span aria-hidden="true">*</span></legend>
            <div style={formStyles.grid1}>
              {PROBLEM_TYPES.map(type => (
                <button key={type.value} type="button"
                  aria-pressed={form.problem_type === type.value}
                  style={{ ...formStyles.optionBtn, ...(form.problem_type === type.value ? formStyles.optionBtnActive : {}) }}
                  onClick={() => { setForm({ ...form, problem_type: type.value }); setError('') }}>
                  {type.label}
                </button>
              ))}
            </div>
          </fieldset>

          <p style={{ ...formStyles.question, marginTop: '18px' }}>Quel est le niveau d'urgence ? <span aria-hidden="true">*</span></p>
          <div style={formStyles.urgencyRow} role="radiogroup" aria-label="Niveau d'urgence de 1 à 5" aria-required="true">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                role="radio"
                aria-checked={form.urgency === n}
                aria-label={`Niveau d'urgence ${n}`}
                style={{ ...formStyles.urgencyBtn, ...(form.urgency >= n ? formStyles.urgencyBtnActive : {}) }}
                onClick={() => { setForm({ ...form, urgency: n }); setError('') }}>
                <span aria-hidden="true">{n}</span>
              </button>
            ))}
          </div>
          <p style={formStyles.urgencyLabel}>
            {form.urgency > 0 ? `${form.urgency} — ${URGENCY_LABELS[form.urgency]}` : 'Sélectionnez un niveau'}
          </p>

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={formStyles.question}>Depuis combien de temps ce problème existe-t-il ? <span aria-hidden="true">*</span></legend>
            <div style={formStyles.grid1}>
              {PROBLEM_DURATION.map(d => (
                <button key={d.value} type="button"
                  aria-pressed={form.duration === d.value}
                  style={{ ...formStyles.optionBtn, ...(form.duration === d.value ? formStyles.optionBtnActive : {}) }}
                  onClick={() => { setForm({ ...form, duration: d.value }); setError('') }}>
                  {d.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ ...formStyles.subQuestion, marginTop: 0, fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#E8B87A' }}>
            Dites-nous en plus
          </p>

          <label htmlFor="opinion-details" style={formStyles.question}>
            Décrivez le problème en quelques mots <span style={formStyles.hint}>{form.problem_type === 'other' ? '(obligatoire)' : '(optionnel)'}</span>
          </label>
          <textarea id="opinion-details" style={formStyles.textarea}
            placeholder={form.problem_type === 'other' ? "Décrivez précisément votre problème (obligatoire)" : "ex. Le réverbère est en panne depuis l'hiver dernier et la rue est sombre la nuit"}
            value={form.opinion}
            onChange={handleOpinionChange}
            rows={4}
            maxLength={300}
            aria-describedby="opinion-char-count"
          />
          <div id="opinion-char-count" style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280', marginTop: '4px' }} aria-live="polite" aria-atomic="true">
            {opinionCharCount}/300
          </div>

          <p style={{ ...formStyles.question, marginTop: '16px' }}>
            Ajouter une photo <span style={formStyles.hint}>(optionnel)</span>
          </p>
          <p style={{ ...formStyles.hint, marginTop: '-8px', marginBottom: '8px' }}>
            Une photo nous aide à évaluer la gravité
          </p>
          <div style={formStyles.uploadArea} onClick={() => document.getElementById('photo-input').click()}>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                const file = e.target.files[0]
                if (file) {
                  const reader = new FileReader()
                  reader.onloadend = () => setForm({ ...form, photo: reader.result, photoFile: file })
                  reader.readAsDataURL(file)
                }
              }}
            />
            {form.photo ? (
              <img src={form.photo} style={formStyles.imagePreview} alt="Aperçu" />
            ) : (
              <>
                <span style={formStyles.uploadIcon}>📸</span>
                <span style={formStyles.uploadText}>Appuyez pour ajouter une photo</span>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p role="alert" style={formStyles.error}>{error}</p>}

      <div style={formStyles.navRow}>
        {step > 1 ? (
          <button type="button" style={formStyles.backBtn} onClick={() => setStep(step - 1)}>← Retour</button>
        ) : (
          parcel?.isNew && (
            <button type="button" style={{ ...formStyles.backBtn, color: '#ef4444' }} onClick={onClose}>
              Annuler
            </button>
          )
        )}
        {step < totalSteps ? (
          <button type="button" style={formStyles.nextBtn} onClick={handleNext}>Suivant →</button>
        ) : (
          <button
            type="button"
            style={{
              ...formStyles.submitBtn,
              opacity: (isAiLoading || !canNext()) ? 0.7 : 1,
              cursor: (isAiLoading || !canNext()) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSubmit}
            disabled={isAiLoading || !canNext()}
            aria-disabled={isAiLoading || !canNext()}
            aria-label={isAiLoading ? 'Analyse en cours, veuillez patienter' : 'Envoyer mon avis'}
          >
            {isAiLoading ? '⏳ Analyse en cours...' : '🚀 Envoyer mon avis'}
          </button>
        )}
      </div>
    </div>
  )
}
