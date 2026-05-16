import React from 'react';

const errorOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(254, 226, 226, 0.95)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
};

const errorCardStyle = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '40px',
  maxWidth: '500px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  textAlign: 'center'
};

const iconStyle = {
  fontSize: '64px',
  marginBottom: '16px'
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#DC2626',
  marginBottom: '16px'
};

const messageStyle = {
  fontSize: '16px',
  color: '#6B7280',
  marginBottom: '16px'
};

const errorIdStyle = {
  fontSize: '12px',
  color: '#9CA3AF',
  marginBottom: '24px',
  fontFamily: 'monospace'
};

const stacktraceStyle = {
  backgroundColor: '#F3F4F6',
  padding: '16px',
  borderRadius: '6px',
  fontSize: '11px',
  color: '#374151',
  textAlign: 'left',
  marginBottom: '24px',
  maxHeight: '200px',
  overflow: 'auto',
  display: (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ? 'block' : 'none',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
};

const buttonContainerStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center'
};

const buttonStyle = {
  padding: '12px 24px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
  transition: 'all 0.3s ease'
};

const primaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#6366F1',
  color: 'white'
};

const secondaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#E5E7EB',
  color: '#374151'
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const errorId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    this.setState({
      errorInfo: errorInfo,
      errorId: errorId
    });

    console.error('ErrorBoundary:', {
      errorId: errorId,
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={errorOverlayStyle}>
          <div style={errorCardStyle}>
            <div style={iconStyle}>❌</div>
            <h1 style={titleStyle}>Oops! Something went wrong</h1>
            <p style={messageStyle}>The app encountered an unexpected error. Please try to recover.</p>
            
            {this.state.errorId && (
              <div style={errorIdStyle}>Error #{this.state.errorId.toUpperCase()}</div>
            )}
            
            {(this.state.error || this.state.errorInfo) && (
              <div style={stacktraceStyle}>
                <strong>{this.state.error && this.state.error.toString()}</strong>
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            )}

            <div style={buttonContainerStyle}>
              <button 
                style={primaryButtonStyle} 
                onClick={() => window.location.reload()}
              >
                🔄 Try Again
              </button>
              <button 
                style={secondaryButtonStyle} 
                onClick={() => window.location.href = '/map'}
              >
                🏠 Go to Map
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
