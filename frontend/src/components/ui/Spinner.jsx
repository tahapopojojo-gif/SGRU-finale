import React from 'react'
import { Loader2 } from 'lucide-react'

const Spinner = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  return (
    <Loader2 
      className={`animate-spin text-primary-600 ${sizeClasses[size]} ${className}`} 
    />
  )
}

export default Spinner
