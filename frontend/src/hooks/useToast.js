import { useContext } from 'react'
import { ToastContext } from '../context/ToastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  
  return {
    toast: {
      success: (msg, duration = 4000) => context.addToast(msg, 'success', duration),
      error: (msg, duration = 6000) => context.addToast(msg, 'error', duration),
      info: (msg, duration = 5000) => context.addToast(msg, 'info', duration),
      warning: (msg, duration = 8000) => context.addToast(msg, 'warning', duration)
    }
  }
}
