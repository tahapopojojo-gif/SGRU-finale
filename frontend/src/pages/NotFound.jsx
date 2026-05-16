import { Link } from 'react-router-dom'

const NotFound = () => {
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>404</h1>
            <p style={styles.text}>Oups ! La page que vous recherchez n'existe pas.</p>
            <Link to="/" style={styles.link}>Retour à l'accueil</Link>
        </div>
    )
}

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f7f6',
        textAlign: 'center',
    },
    title: {
        fontSize: '6rem',
        margin: 0,
        color: '#0f3460',
    },
    text: {
        fontSize: '1.2rem',
        color: '#666',
        marginBottom: '2rem',
    },
    link: {
        background: '#0f3460',
        color: '#fff',
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 'bold',
    }
}

export default NotFound
