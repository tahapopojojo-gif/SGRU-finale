const fs = require('fs');

const path = 'c:/Users/HP ELITEBOOK/OneDrive/Bureau/school/binom/SGRU-finale/frontend/src/pages/MapPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace BUILDING_TYPES
content = content.replace(
  /const BUILDING_TYPES = \[\s*[\s\S]*?\]/m,
  "const BUILDING_TYPES = [\n" +
  "  { value: 'Route', label: 'Route', icon: '🛣️', color: '#f59e0b' },\n" +
  "  { value: 'Éclairage', label: 'Éclairage', icon: '💡', color: '#3b82f6' },\n" +
  "  { value: 'Déchets', label: 'Déchets', icon: '🗑️', color: '#84cc16' },\n" +
  "  { value: 'Parc', label: 'Parc', icon: '🌳', color: '#22c55e' },\n" +
  "  { value: 'École', label: 'École', icon: '🏫', color: '#a855f7' },\n" +
  "  { value: 'Autre', label: 'Autre', icon: '❓', color: '#94a3b8' },\n" +
  "]"
);

// Replace PROFILES
content = content.replace(
  /const PROFILES = \[\s*[\s\S]*?\]/m,
  "const PROFILES = [\n" +
  "  { value: 'Resident', label: 'Résident' },\n" +
  "  { value: 'Pieton', label: 'Piéton' },\n" +
  "  { value: 'Automobiliste', label: 'Automobiliste' },\n" +
  "  { value: 'Commercant', label: 'Commerçant' },\n" +
  "  { value: 'Visiteur', label: 'Visiteur' },\n" +
  "]"
);

// Replace RESIDENCE_DURATION
content = content.replace(
  /const RESIDENCE_DURATION = \[\s*[\s\S]*?\]/m,
  "const RESIDENCE_DURATION = [\n" +
  "  { value: 'recent', label: 'Récemment' },\n" +
  "  { value: 'months', label: 'Quelques mois' },\n" +
  "  { value: 'years', label: 'Depuis des années' },\n" +
  "]"
);

// 2. Form initial state
content = content.replace(
  /const \[form, setForm\] = useState\(\{[\s\S]*?\}\)/m,
  "const [form, setForm] = useState({\n" +
  "    building_type: '',\n" +
  "    reasons: ['Signalement citoyen'],\n" +
  "    problems: ['Infrastructure / Autre'],\n" +
  "    urgency: 0,\n" +
  "    profile: '',\n" +
  "    residence_duration: '', // Used for duration\n" +
  "    would_use: null,\n" +
  "    opinion: '',\n" +
  "    photo: null,\n" +
  "    photoFile: null,\n" +
  "    name: 'Citoyen',\n" +
  "    email: 'citoyen@urbanmap.ma',\n" +
  "  })"
);

// 3. canNext and handleNext
content = content.replace(
  /const canNext = \(\) => \{[\s\S]*?return true\s*\}/m,
  "const canNext = () => {\n" +
  "    if (step === 1) return form.building_type !== '';\n" +
  "    if (step === 2) return form.opinion.trim() !== '';\n" +
  "    if (step === 3) return form.urgency > 0;\n" +
  "    if (step === 4) return form.residence_duration !== '';\n" +
  "    if (step === 5) return true; // Profile is optional\n" +
  "    return true;\n" +
  "  }"
);

content = content.replace(
  /const handleNext = \(\) => \{[\s\S]*?setStep\(step \+ 1\)\s*\}/m,
  "const handleNext = () => {\n" +
  "    if (step === 1 && form.building_type === '') {\n" +
  "      setError('Veuillez sélectionner une catégorie');\n" +
  "      return;\n" +
  "    }\n" +
  "    if (step === 2 && form.opinion.trim() === '') {\n" +
  "      setError('Veuillez décrire le problème');\n" +
  "      return;\n" +
  "    }\n" +
  "    if (step === 2 && form.opinion && form.opinion.length > 500) {\n" +
  "      setError('Description trop longue (500 max)');\n" +
  "      return;\n" +
  "    }\n" +
  "    if (step === 3 && form.urgency === 0) {\n" +
  "      setError('Veuillez sélectionner un niveau d\\'urgence');\n" +
  "      return;\n" +
  "    }\n" +
  "    if (step === 4 && form.residence_duration === '') {\n" +
  "      setError('Veuillez sélectionner depuis quand');\n" +
  "      return;\n" +
  "    }\n" +
  "    setError('');\n" +
  "    setStep(step + 1);\n" +
  "  }"
);

// 4. Form steps UI
const newStepsUI = `      {step === 1 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={formStyles.question}><span aria-hidden="true">📍</span> Catégorie du problème <span aria-hidden="true">*</span></legend>
          <div style={formStyles.grid2}>
            {BUILDING_TYPES.map(type => (
              <button key={type.value} type="button"
                aria-pressed={form.building_type === type.value}
                style={{ ...formStyles.optionBtn, ...(form.building_type === type.value ? formStyles.optionBtnActive : {}) }}
                onClick={() => { setForm({ ...form, building_type: type.value }); setError('') }}>
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <div>
          <label htmlFor="opinion-details" style={{ ...formStyles.question, display: 'block' }}>Description / Que proposez-vous ? <span aria-hidden="true">*</span></label>
          <textarea id="opinion-details" style={{ ...formStyles.textarea, marginTop: '8px' }}
            placeholder="Décrivez le problème..."
            value={form.opinion}
            onChange={handleOpinionChange}
            rows={4}
            required
            aria-describedby="opinion-char-count"
          />
          <div id="opinion-char-count" style={{ textAlign: 'right', fontSize: '12px', color: '#6B7280', marginTop: '4px' }} aria-live="polite" aria-atomic="true">
            {opinionCharCount}/500
          </div>

          <div style={{ ...formStyles.uploadArea, marginTop: '16px' }} onClick={() => document.getElementById('photo-input').click()}>
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
              <img src={form.photo} style={formStyles.imagePreview} alt="Preview" />
            ) : (
              <>
                <span style={formStyles.uploadIcon}>📸</span>
                <span style={formStyles.uploadText}>Ajouter une photo (optionnel)</span>
              </>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={formStyles.question}><span aria-hidden="true">⚡</span> Quel est le niveau d'urgence? <span aria-hidden="true">*</span></p>
          <div style={formStyles.urgencyRow} role="radiogroup" aria-label="Niveau d'urgence de 1 à 5" aria-required="true">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button"
                role="radio"
                aria-checked={form.urgency === n}
                aria-label={"Urgence niveau " + n}
                style={{ ...formStyles.urgencyBtn, ...(form.urgency >= n ? formStyles.urgencyBtnActive : {}) }}
                onClick={() => { setForm({ ...form, urgency: n }); setError('') }}>
                <span aria-hidden="true">⭐</span>
              </button>
            ))}
          </div>
          <p style={formStyles.urgencyLabel}>
            {form.urgency === 1 && 'Mineur'}
            {form.urgency === 2 && 'Peu urgent'}
            {form.urgency === 3 && 'Modéré'}
            {form.urgency === 4 && 'Urgent'}
            {form.urgency === 5 && '🚨 Critique'}
          </p>
        </div>
      )}

      {step === 4 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={formStyles.question}><span aria-hidden="true">⏳</span> Depuis combien de temps ? <span aria-hidden="true">*</span></legend>
          <div style={formStyles.grid2}>
            {RESIDENCE_DURATION.map(d => (
              <button key={d.value} type="button"
                aria-pressed={form.residence_duration === d.value}
                style={{ ...formStyles.optionBtn, ...(form.residence_duration === d.value ? formStyles.optionBtnActive : {}) }}
                onClick={() => { setForm({ ...form, residence_duration: d.value }); setError(''); }}>
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {step === 5 && (
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={formStyles.question}><span aria-hidden="true">👤</span> Votre profil (Optionnel)</legend>
          <div style={formStyles.grid2}>
            {PROFILES.map(p => (
              <button key={p.value} type="button"
                aria-pressed={form.profile === p.value}
                style={{ ...formStyles.optionBtn, ...(form.profile === p.value ? formStyles.optionBtnActive : {}) }}
                onClick={() => { setForm({ ...form, profile: form.profile === p.value ? '' : p.value }); setError('') }}>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}`;

content = content.replace(
  /\{step === 1 && \([\s\S]*?\{step === 5 && \([\s\S]*?\}\)}/m,
  newStepsUI
);

// 5. Update handleFormSubmit in MapPage to map residence_duration to duration
content = content.replace(
  /formData\.append\('residence_duration', formValues\.residence_duration\);/g,
  "formData.append('duration', formValues.residence_duration);\n      formData.append('residence_duration', 'Plus de 5 ans');"
);

fs.writeFileSync(path, content, 'utf8');
console.log('MapPage updated!');
