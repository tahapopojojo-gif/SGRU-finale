import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const user = await login(email, password)
            const userRole = user.role;
            if (userRole === 'super_admin') navigate('/super-admin/users');
            else if (userRole === 'admin') navigate('/admin/dashboard');
            else if (userRole === 'urbaniste') navigate('/urbaniste/dashboard');
            else navigate('/map');
        } catch (err) {
            console.error('Login error:', err)
            let msg = 'Email ou mot de passe incorrect'
            if (err.response?.data?.message) {
                msg = err.response.data.message
            } else if (err.message === 'Network Error') {
                msg = 'Impossible de contacter le serveur (Vérifiez si Laravel est lancé).'
            }
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h1 style={styles.title}>🏙️ UrbanMap</h1>
                    <p style={styles.subtitle}>Connectez-vous à votre compte</p>
                </div>

                {error && <div style={styles.error}>{error}</div>}

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

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.input}
                            required
                        />
                        <Link to="/forgot-password" style={styles.forgotLink}>Mot de passe oublié ?</Link>
                    </div>

                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                <p style={styles.footer}>
                    Pas encore de compte ?{' '}
                    <Link to="/register" style={styles.link}>S'inscrire</Link>
                </p>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    },
    card: {
        background: '#fff',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#0f3460',
        marginBottom: '8px',
    },
    subtitle: {
        color: '#666',
        fontSize: '14px',
    },
    error: {
        background: '#fee2e2',
        color: '#dc2626',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        textAlign: 'center',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
    },
    input: {
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1.5px solid #e2e8f0',
        fontSize: '14px',
        outline: 'none',
        transition: 'border 0.2s',
    },
    button: {
        padding: '13px',
        background: '#0f3460',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '8px',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
        fontSize: '14px',
        color: '#666',
    },
    link: {
        color: '#0f3460',
        fontWeight: '600',
    },
    forgotLink: {
        textAlign: 'right',
        fontSize: '12px',
        color: '#0f3460',
        fontWeight: '600',
        marginTop: '5px',
        textDecoration: 'none'
    }
}

export default Login