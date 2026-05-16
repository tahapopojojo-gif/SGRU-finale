import React from 'react'

const Avatar = ({ 
  name = '', 
  size = 'md', 
  className = '' 
}) => {
  // Extract initials
  const getInitials = (name) => {
    if (!name) return '??'
    const words = name.trim().split(' ')
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }

  // Generate color from name
  const getBgColor = (name) => {
    const colors = ["bg-blue-500", "bg-green-500", "bg-violet-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    if (!name) return colors[0]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }

  return (
    <div className={`${sizeClasses[size]} ${getBgColor(name)} rounded-full flex items-center justify-center text-white font-medium ${className}`}>
      {getInitials(name)}
    </div>
  )
}

export default Avatar
