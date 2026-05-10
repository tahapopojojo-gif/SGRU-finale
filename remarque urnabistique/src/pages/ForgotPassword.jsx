import { useState } from 'react'
import { Link } from 'react-router-dom'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        // Simulate API call
        setSubmitted(true)
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>Récupération</h1>
                    <p style={styles.subtitle}>Saisissez votre email pour réinitialiser votre mot de passe.</p>
                </div>

                {submitted ? (
                    <div style={styles.success}>
                        <p style={{fontSize: '40px', marginBottom: '10px'}}>✉️</p>
                        <p style={{fontWeight: 'bold'}}>Email envoyé !</p>
                        <p style={{fontSize: '13px', marginTop: '5px'}}>Consultez votre boîte de réception pour les instructions.</p>
                        <Link to="/login" style={styles.buttonLink}>Retour à la connexion</Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemple@email.com"
                                style={styles.input}
                                required
                            />
                        </div>
                        <button type="submit" style={styles.button}>Envoyer le lien</button>
                        <Link to="/login" style={styles.footerLink}>Annuler</Link>
                    </form>
                )}
            </div>
        </div>
    )
}

const styles = {
    container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
    card: { background: '#fff', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    header: { textAlign: 'center', marginBottom: '32px' },
    title: { fontSize: '28px', fontWeight: '700', color: '#0f3460', marginBottom: '8px' },
    subtitle: { color: '#666', fontSize: '14px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '14px', fontWeight: '600', color: '#333' },
    input: { padding: '12px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', outline: 'none' },
    button: { padding: '13px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' },
    buttonLink: { display: 'block', padding: '13px', background: '#f1f5f9', color: '#0f3460', borderRadius: '8px', textAlign: 'center', marginTop: '20px', fontWeight: '700' },
    footerLink: { textAlign: 'center', fontSize: '14px', color: '#666', textDecoration: 'none' },
    success: { textAlign: 'center', padding: '20px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px' }
}

export default ForgotPassword
